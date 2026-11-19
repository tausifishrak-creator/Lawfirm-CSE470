// Model: messages table (In-App Messaging System)
const db = require('../config/db');

const Message = {
    /**
     * Get list of conversations for a user with the latest message and unread count.
     * Conversations only exist for cases that are not Pending or Rejected.
     */
    async findConversations(user) {
        const isClient = user.role === 'client';
        const userJoin = isClient
            ? `JOIN clients cl ON c.client_id = cl.client_id
               JOIN lawyers l ON c.lawyer_id = l.lawyer_id
               JOIN users u ON l.user_id = u.user_id
               WHERE cl.user_id = ?`
            : `JOIN lawyers l ON c.lawyer_id = l.lawyer_id
               JOIN clients cl ON c.client_id = cl.client_id
               JOIN users u ON cl.user_id = u.user_id
               WHERE l.user_id = ?`;

        const sql = `
            SELECT c.case_id, c.title, c.case_type, c.status,
                   u.user_id AS other_user_id, u.full_name AS other_name,
                   (SELECT COUNT(*) FROM messages m 
                    WHERE m.case_id = c.case_id AND m.receiver_id = ? AND m.is_read = 0) AS unread,
                   (SELECT m2.message FROM messages m2 
                    WHERE m2.case_id = c.case_id 
                    ORDER BY m2.message_id DESC LIMIT 1) AS last_message,
                   (SELECT m3.created_at FROM messages m3 
                    WHERE m3.case_id = c.case_id 
                    ORDER BY m3.message_id DESC LIMIT 1) AS last_time
            FROM cases c
            ${userJoin}
            AND c.status NOT IN ('Pending', 'Rejected')
            ORDER BY (last_time IS NULL) ASC, last_time DESC, c.updated_at DESC
        `;

        return db.query(sql, [user.user_id, user.user_id]);
    },

    /**
     * Get messages for a specific case, optionally starting after a given message_id.
     */
    async findByCase(caseId, afterId = 0) {
        return db.query(
            `SELECT m.message_id, m.case_id, m.sender_id, m.receiver_id, m.message,
                    m.is_read, m.created_at, u.full_name AS sender_name
             FROM messages m
             JOIN users u ON m.sender_id = u.user_id
             WHERE m.case_id = ? AND m.message_id > ?
             ORDER BY m.message_id ASC`,
            [caseId, afterId]
        );
    },

    /**
     * Mark all unread messages in a case received by this user as read.
     */
    async markAsRead(caseId, receiverId) {
        return db.query(
            `UPDATE messages 
             SET is_read = 1 
             WHERE case_id = ? AND receiver_id = ? AND is_read = 0`,
            [caseId, receiverId]
        );
    },

    /**
     * Send a new message.
     */
    async create({ caseId, senderId, receiverId, message }) {
        const result = await db.query(
            `INSERT INTO messages (case_id, sender_id, receiver_id, message)
             VALUES (?, ?, ?, ?)`,
            [caseId, senderId, receiverId, message]
        );
        return result.insertId;
    },

    /**
     * Count total unread messages for a user across all cases.
     */
    async countUnread(userId) {
        const row = await db.queryOne(
            `SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0`,
            [userId]
        );
        return row ? Number(row.count) : 0;
    },
};

module.exports = Message;
