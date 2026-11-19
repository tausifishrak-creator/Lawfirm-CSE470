// Model: cases table.
const db = require('../config/db');

const Case = {
    /**
     * A case together with the "other party" for the logged-in user, or null if the user
     * is not the client or lawyer on that case.
     */
    findForUser(caseId, user) {
        if (user.role === 'client') {
            return db.queryOne(
                `SELECT c.*, u.full_name AS other_name, u.user_id AS other_user_id, l.is_verified AS lawyer_verified
                 FROM cases c
                 JOIN clients cl ON c.client_id = cl.client_id
                 JOIN lawyers l ON c.lawyer_id = l.lawyer_id
                 JOIN users u ON l.user_id = u.user_id
                 WHERE c.case_id = ? AND cl.user_id = ?`,
                [caseId, user.user_id]
            );
        }
        if (user.role === 'lawyer') {
            return db.queryOne(
                `SELECT c.*, u.full_name AS other_name, u.user_id AS other_user_id, l.is_verified AS lawyer_verified
                 FROM cases c
                 JOIN lawyers l ON c.lawyer_id = l.lawyer_id
                 JOIN clients cl ON c.client_id = cl.client_id
                 JOIN users u ON cl.user_id = u.user_id
                 WHERE c.case_id = ? AND l.user_id = ?`,
                [caseId, user.user_id]
            );
        }
        return Promise.resolve(null);
    },

    /** A new case request from a client to a lawyer (starts as Pending). */
    async create({ client_id, lawyer_id, title, description, case_type }) {
        const result = await db.query(
            `INSERT INTO cases (client_id, lawyer_id, title, description, case_type, status)
             VALUES (?, ?, ?, ?, ?, 'Pending')`,
            [client_id, lawyer_id, title, description, case_type]
        );
        return result.insertId;
    },

    findById(caseId) {
        return db.queryOne('SELECT * FROM cases WHERE case_id = ?', [caseId]);
    },

    /** Every case a client has submitted, newest first, with the lawyer's name. */
    findAllForClient(clientId) {
        return db.query(
            `SELECT c.case_id, c.title, c.case_type, c.description, c.status, c.created_at, u.full_name AS other_name
             FROM cases c
             JOIN lawyers l ON c.lawyer_id = l.lawyer_id
             JOIN users u ON l.user_id = u.user_id
             WHERE c.client_id = ?
             ORDER BY c.created_at DESC, c.case_id DESC`,
            [clientId]
        );
    },

    /** Case requests a lawyer has not answered yet, oldest first. */
    findPendingForLawyer(lawyerId) {
        return db.query(
            `SELECT c.case_id, c.title, c.case_type, c.description, c.created_at, u.full_name AS other_name
             FROM cases c
             JOIN clients cl ON c.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE c.lawyer_id = ? AND c.status = 'Pending'
             ORDER BY c.created_at ASC, c.case_id ASC`,
            [lawyerId]
        );
    },

    async countPendingForLawyer(lawyerId) {
        const row = await db.queryOne("SELECT COUNT(*) AS count FROM cases WHERE lawyer_id = ? AND status = 'Pending'", [lawyerId]);
        return Number(row.count);
    },

    updateStatus(caseId, status) {
        return db.query('UPDATE cases SET status = ? WHERE case_id = ?', [status, caseId]);
    },

    /** A client's cases in the given statuses, with the lawyer's name. */
    findByStatusForClient(clientId, statuses) {
        return db.query(
            `SELECT c.case_id, c.title, c.case_type, c.status, l.lawyer_id, u.full_name AS other_name
             FROM cases c
             JOIN lawyers l ON c.lawyer_id = l.lawyer_id
             JOIN users u ON l.user_id = u.user_id
             WHERE c.client_id = ? AND c.status IN (?)
             ORDER BY c.updated_at DESC`,
            [clientId, statuses]
        );
    },

    /** A lawyer's cases in the given statuses, with the client's name. */
    findByStatusForLawyer(lawyerId, statuses) {
        return db.query(
            `SELECT c.case_id, c.title, c.case_type, c.status, cl.client_id, u.full_name AS other_name
             FROM cases c
             JOIN clients cl ON c.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE c.lawyer_id = ? AND c.status IN (?)
             ORDER BY c.updated_at DESC`,
            [lawyerId, statuses]
        );
    },

    /** Update court and opposing-party information for a case. */
updateDetails(caseId, details) {
    return db.query(
        `UPDATE cases
         SET opposing_party = ?,
             court_name = ?,
             case_number = ?
         WHERE case_id = ?`,
        [
            details.opposing_party,
            details.court_name,
            details.case_number,
            caseId
        ]
    );
},

    countByStatus() {
        return db.query('SELECT status, COUNT(*) AS count FROM cases GROUP BY status');
    },
    /** Number of cases won for use to show in the landing page*/
    async countcaseswon() {
        const countcaseswon = await db.queryOne("SELECT COUNT(*) AS count FROM cases WHERE status = 'Won'");
        return Number(countcaseswon.count);
    },
};

module.exports = Case;