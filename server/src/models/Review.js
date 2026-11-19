// Model: reviews table (Lawyer Rating and Review System)
const db = require('../config/db');

const COMPLETED_STATUSES = ['Closed', 'Won', 'Lost'];

const Review = {
    COMPLETED_STATUSES,

    /**
     * Get closed/completed cases for a client that are eligible for a review,
     * including whether a review was already submitted.
     */
    async findReviewableCasesForClient(clientId) {
        return db.query(
            `SELECT c.case_id, c.title, c.case_type, c.status, c.updated_at,
                    l.lawyer_id, u.full_name AS lawyer_name,
                    r.review_id, r.rating, r.comment, r.created_at AS reviewed_at
             FROM cases c
             JOIN lawyers l ON c.lawyer_id = l.lawyer_id
             JOIN users u ON l.user_id = u.user_id
             LEFT JOIN reviews r ON r.case_id = c.case_id
             WHERE c.client_id = ? AND c.status IN ('Closed', 'Won', 'Lost')
             ORDER BY c.updated_at DESC`,
            [clientId]
        );
    },

    /**
     * Check if a review already exists for a given case.
     */
    async findByCaseId(caseId) {
        return db.queryOne(
            `SELECT r.*, u.full_name AS client_name
             FROM reviews r
             JOIN clients cl ON r.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE r.case_id = ?`,
            [caseId]
        );
    },

    /**
     * Submit a review (1 review per case, rating 1-5).
     */
    async create({ caseId, clientId, lawyerId, rating, comment }) {
        const result = await db.query(
            `INSERT INTO reviews (case_id, client_id, lawyer_id, rating, comment)
             VALUES (?, ?, ?, ?, ?)`,
            [caseId, clientId, lawyerId, rating, comment || null]
        );
        return result.insertId;
    },

    /**
     * All reviews submitted by a client.
     */
    async findByClient(clientId) {
        return db.query(
            `SELECT r.review_id, r.case_id, r.rating, r.comment, r.created_at,
                    c.title AS case_title, u.full_name AS lawyer_name, l.specialization
             FROM reviews r
             JOIN cases c ON r.case_id = c.case_id
             JOIN lawyers l ON r.lawyer_id = l.lawyer_id
             JOIN users u ON l.user_id = u.user_id
             WHERE r.client_id = ?
             ORDER BY r.created_at DESC`,
            [clientId]
        );
    },

    /**
     * All reviews received by a lawyer.
     */
    async findByLawyer(lawyerId) {
        return db.query(
            `SELECT r.review_id, r.case_id, r.rating, r.comment, r.created_at,
                    c.title AS case_title, u.full_name AS client_name
             FROM reviews r
             JOIN cases c ON r.case_id = c.case_id
             JOIN clients cl ON r.client_id = cl.client_id
             JOIN users u ON cl.user_id = u.user_id
             WHERE r.lawyer_id = ?
             ORDER BY r.created_at DESC`,
            [lawyerId]
        );
    },

    /**
     * Aggregated rating summary for a lawyer.
     */
    async getLawyerSummary(lawyerId) {
        const summary = await db.queryOne(
            `SELECT COUNT(review_id) AS total_reviews,
                    COALESCE(ROUND(AVG(rating), 1), 0) AS avg_rating,
                    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS stars_5,
                    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS stars_4,
                    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS stars_3,
                    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS stars_2,
                    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS stars_1
             FROM reviews
             WHERE lawyer_id = ?`,
            [lawyerId]
        );

        return {
            total_reviews: Number(summary?.total_reviews || 0),
            avg_rating: Number(summary?.avg_rating || 0),
            stars_5: Number(summary?.stars_5 || 0),
            stars_4: Number(summary?.stars_4 || 0),
            stars_3: Number(summary?.stars_3 || 0),
            stars_2: Number(summary?.stars_2 || 0),
            stars_1: Number(summary?.stars_1 || 0),
        };
    },
};

module.exports = Review;
