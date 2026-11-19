// Model: lawyers table (lawyer profile and verification status).
const db = require('../config/db');

const Lawyer = {
    findByUserId(userId) {
        return db.queryOne(
            `SELECT lawyer_id, user_id, specialization, location, experience_years, consultation_fee,
                    bio, is_verified, verification_status
             FROM lawyers WHERE user_id = ?`,
            [userId]
        );
    },

    async create(data, conn = null) {
        const sql = `INSERT INTO lawyers (user_id, specialization, location, experience_years, consultation_fee,
                                          bio, verification_doc, verification_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`;
        const params = [
            data.user_id, data.specialization, data.location, data.experience_years,
            data.consultation_fee, data.bio, data.verification_doc,
        ];
        const result = conn ? (await conn.query(sql, params))[0] : await db.query(sql, params);
        return result.insertId;
    },

    /** Lawyers waiting for admin verification. */
    findPendingVerification() {
        return db.query(
            `SELECT l.lawyer_id, u.full_name, l.specialization, l.location, l.experience_years,
                    (l.verification_doc IS NOT NULL) AS has_document
             FROM lawyers l JOIN users u ON l.user_id = u.user_id
             WHERE l.verification_status = 'Pending'
             ORDER BY l.lawyer_id`
        );
    },

    /** Number of lawyers per verification status (admin chart). */
    countByVerification() {
        return db.query(
            'SELECT verification_status AS status, COUNT(*) AS count FROM lawyers GROUP BY verification_status'
        );
    },

    /** Lawyers an admin has approved or rejected, with who did it and when (latest first). */
    verificationHistory() {
        return db.query(
            `SELECT l.lawyer_id, u.full_name, l.specialization, l.verification_status,
                    a.full_name AS verified_by_name, l.verified_at
             FROM lawyers l
             JOIN users u ON l.user_id = u.user_id
             LEFT JOIN users a ON l.verified_by = a.user_id
             WHERE l.verification_status IN ('Verified', 'Rejected')
             ORDER BY l.verified_at DESC, l.lawyer_id DESC`
        );
    },

    async getVerificationDoc(lawyerId) {
        const row = await db.queryOne('SELECT verification_doc FROM lawyers WHERE lawyer_id = ?', [lawyerId]);
        return row ? row.verification_doc : null;
    },

    /** Approve or reject a lawyer. Records which admin did it and when. Returns true if a row was updated. */
    async setVerification(lawyerId, approved, adminUserId) {
        const result = await db.query(
            `UPDATE lawyers
             SET is_verified = ?, verification_status = ?, verified_by = ?, verified_at = NOW()
             WHERE lawyer_id = ?`,
            [approved ? 1 : 0, approved ? 'Verified' : 'Rejected', adminUserId, lawyerId]
        );
        return result.affectedRows > 0;
    },
    /**total number of registered Lawyers shown in the landing page */
    async countLawyers() {
        const countLawyers = await db.queryOne('SELECT COUNT(*) AS count FROM Lawyers')
        return Number(countLawyers.count);
    },
};

module.exports = Lawyer;
