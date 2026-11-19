// Model: lawyer_availability table (weekly office hours).
const db = require('../config/db');
const { SLOTS } = require('../utils/constants');

const Availability = {
    findByLawyer(lawyerId) {
        return db.query('SELECT * FROM lawyer_availability WHERE lawyer_id = ?', [lawyerId]);
    },

    findDay(lawyerId, dayOfWeek) {
        return db.queryOne(
            'SELECT * FROM lawyer_availability WHERE lawyer_id = ? AND day_of_week = ?',
            [lawyerId, dayOfWeek]
        );
    },

    /** Date-specific changes between two dates (inclusive): [{ override_date, session_slot, is_available }]. */
    findOverrides(lawyerId, fromDate, toDate) {
        return db.query(
            `SELECT override_date, session_slot, is_available FROM availability_overrides
             WHERE lawyer_id = ? AND override_date BETWEEN ? AND ?`,
            [lawyerId, fromDate, toDate]
        );
    },

    /** Open (true) or close (false) one slot on one date, overriding the weekly hours for that date. */
    setOverride(lawyerId, date, slotId, available) {
        return db.query(
            `INSERT INTO availability_overrides (lawyer_id, override_date, session_slot, is_available)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)`,
            [lawyerId, date, slotId, available ? 1 : 0]
        );
    },

    /** Map of lawyer_id -> list of working days, for many lawyers at once. */
    async workingDaysFor(lawyerIds) {
        if (lawyerIds.length === 0) return {};
        const rows = await db.query(
            `SELECT lawyer_id, day_of_week FROM lawyer_availability
             WHERE lawyer_id IN (?)
             ORDER BY FIELD(day_of_week, 'Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday')`,
            [lawyerIds]
        );
        const map = {};
        for (const row of rows) {
            (map[row.lawyer_id] = map[row.lawyer_id] || []).push(row.day_of_week);
        }
        return map;
    },

    /**
     * Replace a lawyer's whole schedule.
     * `schedule` looks like { Saturday: [1, 2, 3], Monday: [4] } (day -> slot numbers).
     */
    replaceSchedule(lawyerId, schedule) {
        return db.transaction(async (conn) => {
            await conn.query('DELETE FROM lawyer_availability WHERE lawyer_id = ?', [lawyerId]);
            for (const [day, slotIds] of Object.entries(schedule)) {
                if (slotIds.length === 0) continue;
                const flags = SLOTS.map((slot) => (slotIds.includes(slot.id) ? 1 : 0));
                await conn.query(
                    `INSERT INTO lawyer_availability
                        (lawyer_id, day_of_week, slot_1, slot_2, slot_3, slot_4, slot_5, slot_6, slot_7)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [lawyerId, day, ...flags]
                );
            }
        });
    },
};

module.exports = Availability;
