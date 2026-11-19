// Works out when a lawyer can be booked, from three things:
//   1. weekly hours        (lawyer_availability, set on the My Schedule page)
//   2. per-date changes    (availability_overrides, set on the availability calendar)
//   3. existing bookings   (appointments that are not cancelled or rejected)
// Fridays are always closed.
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const { SLOTS } = require('./constants');
const { dayOfWeek, isPast } = require('./dates');

/**
 * The slot states of a lawyer for a list of consecutive dates.
 * Returns { "2026-11-24": [{ id, label, time, state, appointment }] } where state is
 * "available", "booked", "off" (not working) or "past".
 * `ignoreAppointmentId` treats one appointment as free (used while rescheduling it).
 */
async function slotStates(lawyerId, dates, ignoreAppointmentId = 0) {
    const from = dates[0];
    const to = dates[dates.length - 1];
    const [weekly, overrides, booked] = await Promise.all([
        Availability.findByLawyer(lawyerId),
        Availability.findOverrides(lawyerId, from, to),
        Appointment.findActiveInRange(lawyerId, from, to),
    ]);

    const weeklyByDay = {};
    for (const row of weekly) weeklyByDay[row.day_of_week] = row;

    const overrideMap = {};
    for (const row of overrides) {
        overrideMap[`${String(row.override_date).slice(0, 10)}|${Number(row.session_slot)}`] = Number(row.is_available) === 1;
    }

    const bookedMap = {};
    for (const row of booked) {
        if (row.appointment_id === ignoreAppointmentId) continue;
        bookedMap[`${String(row.appointment_date).slice(0, 10)}|${Number(row.session_slot)}`] = row;
    }

    const result = {};
    for (const date of dates) {
        const day = dayOfWeek(date);
        const weekRow = weeklyByDay[day];
        result[date] = SLOTS.map((slot) => {
            const key = `${date}|${slot.id}`;
            const appointment = bookedMap[key] || null;
            let open = Boolean(weekRow && Number(weekRow[slot.key]) === 1);
            if (key in overrideMap) open = overrideMap[key];
            if (day === 'Friday') open = false;

            let state = open ? 'available' : 'off';
            if (appointment) state = 'booked';
            else if (isPast(date, slot.time)) state = 'past';
            return { id: slot.id, label: slot.label, time: slot.time, state, appointment };
        });
    }
    return result;
}

/** The state of one slot on one date (see slotStates). */
async function slotState(lawyerId, date, slotId, ignoreAppointmentId = 0) {
    const states = await slotStates(lawyerId, [date], ignoreAppointmentId);
    return states[date].find((s) => s.id === Number(slotId)) || null;
}

module.exports = { slotStates, slotState };
