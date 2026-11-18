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
};

module.exports = Case;