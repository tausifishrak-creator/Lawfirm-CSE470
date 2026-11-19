// Controller: appointment calendar, booking, and accept / reject / reschedule / complete.
const Appointment = require('../models/Appointment');
const Case = require('../models/Case');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');
const { currentClient, currentLawyer, toId } = require('../utils/profiles');
const { SLOTS, BOOKABLE_CASE_STATUSES } = require('../utils/constants');
const { dayOfWeek, monthDates, prettyDate } = require('../utils/dates');
const { slotStates, slotState } = require('../utils/availability');

/** The case, if the logged-in user is on it and it is open for booking. */
async function bookableCase(req, caseId) {
    const found = await Case.findForUser(caseId, req.session.user);
    if (!found || !BOOKABLE_CASE_STATUSES.includes(found.status)) {
        throw new HttpError(400, 'Appointments can only be booked for accepted or in-progress cases.');
    }
    // Only verified lawyers may offer services on the platform.
    if (!Number(found.lawyer_verified)) {
        throw new HttpError(400, 'This lawyer has not been verified by an admin yet.');
    }
    return found;
}

/** A lawyer's own appointment, or a 404. */
async function ownAppointment(req, appointmentId) {
    const lawyer = await currentLawyer(req);
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.lawyer_id !== lawyer.lawyer_id) throw new HttpError(404, 'Appointment not found.');
    return { lawyer, appointment };
}

/** Throws unless the slot can be booked. Returns the slot. */
async function requireFreeSlot(lawyerId, date, slotId, ignoreAppointmentId = 0) {
    if (!dayOfWeek(date) || !SLOTS.some((s) => s.id === Number(slotId))) {
        throw new HttpError(400, 'Choose a date and a time slot.');
    }
    const slot = await slotState(lawyerId, date, slotId, ignoreAppointmentId);
    if (slot.state === 'past') throw new HttpError(400, 'That time has already passed.');
    if (slot.state === 'booked') throw new HttpError(409, 'That slot is already booked. Please pick another one.');
    if (slot.state !== 'available') throw new HttpError(400, 'The lawyer is not available at that time.');
    return slot;
}

const describe = (date, slot) => `${prettyDate(date)}, ${slot.label}`;

// GET /api/appointments
async function list(req, res) {
    const user = req.session.user;
    await Notification.markSectionRead(user.user_id, '/appointments');

    if (user.role === 'client') {
        const client = await currentClient(req);
        const [cases, appointments] = await Promise.all([
            Case.findByStatusForClient(client.client_id, BOOKABLE_CASE_STATUSES),
            Appointment.findForClient(client.client_id),
        ]);
        return res.json({
            bookableCases: cases.map((c) => ({ case_id: c.case_id, title: c.title, other_name: c.other_name })),
            appointments,
        });
    }

    const lawyer = await currentLawyer(req);
    const [cases, appointments] = await Promise.all([
        Case.findByStatusForLawyer(lawyer.lawyer_id, BOOKABLE_CASE_STATUSES),
        Appointment.findForLawyer(lawyer.lawyer_id),
    ]);
    res.json({
        bookableCases: cases.map((c) => ({ case_id: c.case_id, title: c.title, other_name: c.other_name })),
        appointments,
    });
}

/**
 * GET /api/appointments/calendar?month=YYYY-MM
 *   &case_id=        -> booking calendar for the lawyer on that case (client or lawyer of the case)
 *   &appointment_id= -> rescheduling calendar for one of the lawyer's own appointments
 *   (neither)        -> the lawyer's own calendar, with who booked each slot
 */
async function calendar(req, res) {
    const dates = monthDates(req.query.month);
    if (!dates) throw new HttpError(400, 'Choose a valid month.');

    let lawyerId;
    let ignoreId = 0;
    let showDetails = false;
    if (req.query.case_id) {
        lawyerId = (await bookableCase(req, toId(req.query.case_id))).lawyer_id;
    } else if (req.query.appointment_id) {
        const { appointment } = await ownAppointment(req, toId(req.query.appointment_id));
        lawyerId = appointment.lawyer_id;
        ignoreId = appointment.appointment_id;
    } else {
        if (req.session.user.role !== 'lawyer') throw new HttpError(400, 'Choose a case first.');
        lawyerId = (await currentLawyer(req)).lawyer_id;
        showDetails = true;
    }

    const states = await slotStates(lawyerId, dates, ignoreId);
    res.json({
        month: req.query.month,
        days: dates.map((date) => ({
            date,
            weekday: dayOfWeek(date),
            slots: states[date].map(({ appointment, ...slot }) => ({
                ...slot,
                // Only the lawyer looking at their own calendar sees who booked a slot.
                appointment: showDetails && appointment
                    ? {
                        appointment_id: appointment.appointment_id,
                        client_name: appointment.client_name,
                        case_title: appointment.case_title,
                        status: appointment.status,
                    }
                    : null,
            })),
        })),
    });
}

// GET /api/appointments/slots?case_id=&date=  or  ?appointment_id=&date=   (one day's slots)
async function slots(req, res) {
    const date = req.query.date;
    if (!dayOfWeek(date)) throw new HttpError(400, 'Choose a valid date.');

    let lawyerId;
    let ignoreId = 0;
    if (req.query.appointment_id) {
        const { appointment } = await ownAppointment(req, toId(req.query.appointment_id));
        lawyerId = appointment.lawyer_id;
        ignoreId = appointment.appointment_id;
    } else {
        const caseId = toId(req.query.case_id);
        if (!caseId) throw new HttpError(400, 'Choose a case.');
        lawyerId = (await bookableCase(req, caseId)).lawyer_id;
    }

    const states = await slotStates(lawyerId, [date], ignoreId);
    res.json({
        day: dayOfWeek(date),
        slots: states[date]
            .filter((s) => s.state === 'available' || s.state === 'booked')
            .map((s) => ({ id: s.id, time: s.time, label: s.label, is_booked: s.state === 'booked' })),
    });
}

// POST /api/appointments   body: { case_id, appointment_date, session_slot, notes }
async function create(req, res) {
    const user = req.session.user;
    const caseId = toId(req.body.case_id);
    if (!caseId) throw new HttpError(400, 'Choose a case, a date and a time slot.');

    const found = await bookableCase(req, caseId);
    const date = req.body.appointment_date;
    const slot = await requireFreeSlot(found.lawyer_id, date, req.body.session_slot);

    const id = await Appointment.createIfFree({
        case_id: caseId,
        client_id: found.client_id,
        lawyer_id: found.lawyer_id,
        appointment_date: date,
        appointment_time: slot.time,
        session_slot: slot.id,
        notes: (req.body.notes || '').trim(),
        // An appointment the lawyer sets up is confirmed straight away.
        status: user.role === 'lawyer' ? 'Confirmed' : 'Pending',
    });
    if (!id) throw new HttpError(409, 'Someone just booked that slot. Please pick another one.');

    if (user.role === 'lawyer') {
        await Notification.push(
            found.other_user_id,
            `${user.full_name} scheduled an appointment with you on ${describe(date, slot)} (${found.title}).`,
            '/appointments'
        );
    } else {
        await Notification.push(
            found.other_user_id,
            `${user.full_name} requested an appointment on ${describe(date, slot)} (${found.title}).`,
            '/appointments'
        );
    }

    res.status(201).json({
        message: user.role === 'lawyer'
            ? 'Appointment scheduled. Your client has been notified.'
            : 'Appointment requested! Your lawyer will confirm it.',
    });
}

// PATCH /api/appointments/:appointmentId   body: { action: "accept" | "reject" | "complete" }
async function updateStatus(req, res) {
    // Which status each action leads to, and which statuses it is allowed from.
    const actions = {
        accept: { to: 'Confirmed', from: ['Pending'], message: 'Appointment accepted.', notify: 'confirmed' },
        reject: { to: 'Rejected', from: ['Pending'], message: 'Appointment rejected.', notify: 'declined' },
        complete: { to: 'Completed', from: ['Confirmed'], message: 'Appointment marked as completed.', notify: null },
    };
    const appointmentId = toId(req.params.appointmentId);
    const action = actions[req.body.action];
    if (!appointmentId || !action) throw new HttpError(400, 'Invalid action.');

    const { lawyer, appointment } = await ownAppointment(req, appointmentId);
    if (!action.from.includes(appointment.status)) {
        throw new HttpError(400, `A ${appointment.status.toLowerCase()} appointment cannot be changed this way.`);
    }

    await Appointment.updateStatusForLawyer(appointmentId, lawyer.lawyer_id, action.to);
    if (action.notify) {
        const slot = SLOTS.find((s) => s.id === Number(appointment.session_slot));
        await Notification.push(
            await Client.getUserId(appointment.client_id),
            `${req.session.user.full_name} ${action.notify} your appointment on ${describe(appointment.appointment_date, slot)}.`,
            '/appointments'
        );
    }
    res.json({ message: action.message });
}

// PATCH /api/appointments/:appointmentId/reschedule   body: { appointment_date, session_slot }
async function reschedule(req, res) {
    const appointmentId = toId(req.params.appointmentId);
    const { lawyer, appointment } = await ownAppointment(req, appointmentId);
    if (!['Pending', 'Confirmed'].includes(appointment.status)) {
        throw new HttpError(400, 'Only pending or confirmed appointments can be rescheduled.');
    }

    const date = req.body.appointment_date;
    const slot = await requireFreeSlot(lawyer.lawyer_id, date, req.body.session_slot, appointmentId);

    const moved = await Appointment.rescheduleIfFree(appointmentId, lawyer.lawyer_id, {
        appointment_date: date,
        appointment_time: slot.time,
        session_slot: slot.id,
    });
    if (!moved) throw new HttpError(409, 'Someone just booked that slot. Please pick another one.');

    await Notification.push(
        await Client.getUserId(appointment.client_id),
        `${req.session.user.full_name} moved your appointment to ${describe(date, slot)}.`,
        '/appointments'
    );
    res.json({ message: 'Appointment rescheduled. Your client has been notified.' });
}

module.exports = { list, calendar, slots, create, updateStatus, reschedule };
