// Model: appointments table.
const db = require('../config/db');

const Appointment = {
    findForClient(clientId) {
        return db.query(
            `SELECT a.*, c.title AS case_title, u.full_name AS other_name
             FROM appointments a
             JOIN cases c ON a.case_id = c.case_id
             JOIN lawyers l ON a.lawyer_id = l.lawyer_id
             JOIN users u ON l.user_id = u.user_id
             WHERE a.client_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [clientId]
        );
    },

    findForLawyer(lawyerId) {
        return db.query(
            `SELECT a.*, c.title AS case_title, u.full_name AS other_name
             FROM appointments a
             JOIN cases c ON a.case_id = c.case_id
             JOIN clients cl ON a.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE a.lawyer_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [lawyerId]
        );
    },

    findById(appointmentId) {
        return db.queryOne('SELECT * FROM appointments WHERE appointment_id = ?', [appointmentId]);
    },

    /**
     * Slot numbers already taken for a lawyer on a date. Cancelled and rejected appointments free their slot.
     * `ignoreAppointmentId` skips one appointment (used while rescheduling it).
     */
    async bookedSlots(lawyerId, date, ignoreAppointmentId = 0) {
        const rows = await db.query(
            `SELECT session_slot FROM appointments
             WHERE lawyer_id = ? AND appointment_date = ? AND status NOT IN ('Cancelled', 'Rejected') AND appointment_id != ?`,
            [lawyerId, date, ignoreAppointmentId]
        );
        return rows.map((row) => Number(row.session_slot));
    },

    /** A lawyer's active (not cancelled or rejected) appointments between two dates, with client and case names. */
    findActiveInRange(lawyerId, fromDate, toDate) {
        return db.query(
            `SELECT a.appointment_id, a.appointment_date, a.session_slot, a.status, a.case_id,
                    c.title AS case_title, u.full_name AS client_name
             FROM appointments a
             JOIN cases c ON a.case_id = c.case_id
             JOIN clients cl ON a.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE a.lawyer_id = ? AND a.appointment_date BETWEEN ? AND ?
               AND a.status NOT IN ('Cancelled', 'Rejected')`,
            [lawyerId, fromDate, toDate]
        );
    },

    /**
     * Book a slot only if nobody else holds it. Returns the new appointment id, or null if the slot was taken.
     * The lawyer's row is locked for the length of the transaction, so two people booking the same
     * lawyer at the same moment are handled one after the other and can never both get the slot.
     */
    createIfFree(data) {
        return db.transaction(async (conn) => {
            await conn.query('SELECT lawyer_id FROM lawyers WHERE lawyer_id = ? FOR UPDATE', [data.lawyer_id]);
            const [taken] = await conn.query(
                `SELECT appointment_id FROM appointments
                 WHERE lawyer_id = ? AND appointment_date = ? AND session_slot = ?
                   AND status NOT IN ('Cancelled', 'Rejected')
                 LIMIT 1`,
                [data.lawyer_id, data.appointment_date, data.session_slot]
            );
            if (taken.length > 0) return null;

            const [result] = await conn.query(
                `INSERT INTO appointments
                    (case_id, client_id, lawyer_id, appointment_date, appointment_time, session_slot, notes, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.case_id, data.client_id, data.lawyer_id, data.appointment_date,
                    data.appointment_time, data.session_slot, data.notes, data.status,
                ]
            );
            return result.insertId;
        });
    },

    /** Change status only if the appointment belongs to this lawyer. Returns true on success. */
    async updateStatusForLawyer(appointmentId, lawyerId, status) {
        const result = await db.query(
            'UPDATE appointments SET status = ? WHERE appointment_id = ? AND lawyer_id = ?',
            [status, appointmentId, lawyerId]
        );
        return result.affectedRows > 0;
    },

    /**
     * Move an appointment to a new date and slot (it becomes Confirmed), only if that slot is free.
     * Uses the same lock as createIfFree. Returns false if the slot was taken.
     */
    rescheduleIfFree(appointmentId, lawyerId, { appointment_date, appointment_time, session_slot }) {
        return db.transaction(async (conn) => {
            await conn.query('SELECT lawyer_id FROM lawyers WHERE lawyer_id = ? FOR UPDATE', [lawyerId]);
            const [taken] = await conn.query(
                `SELECT appointment_id FROM appointments
                 WHERE lawyer_id = ? AND appointment_date = ? AND session_slot = ?
                   AND status NOT IN ('Cancelled', 'Rejected') AND appointment_id != ?
                 LIMIT 1`,
                [lawyerId, appointment_date, session_slot, appointmentId]
            );
            if (taken.length > 0) return false;

            await conn.query(
                `UPDATE appointments
                 SET appointment_date = ?, appointment_time = ?, session_slot = ?, status = 'Confirmed'
                 WHERE appointment_id = ? AND lawyer_id = ?`,
                [appointment_date, appointment_time, session_slot, appointmentId, lawyerId]
            );
            return true;
        });
    },
};

module.exports = Appointment;
