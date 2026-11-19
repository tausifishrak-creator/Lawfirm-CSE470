// Model: notifications table.
// `link` holds the frontend page to open, e.g. "/cases?tab=pending" or "/appointments".
const db = require('../config/db');

const Notification = {
    /** Send a notification to one user. Does nothing if userId is empty. */
    push(userId, message, link = null) {
        if (!userId) return Promise.resolve();
        return db.query('INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)', [userId, message, link]);
    },

    latest(userId, limit = 10) {
        return db.query(
            `SELECT notification_id, message, link, is_read, created_at
             FROM notifications WHERE user_id = ?
             ORDER BY created_at DESC, notification_id DESC
             LIMIT ${Number(limit)}`,
            [userId]
        );
    },

    async countUnread(userId) {
        const row = await db.queryOne('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
        return Number(row.count);
    },

    /** Unread counts per page, for badges on the dashboard cards. */
    async unreadBySection(userId) {
        const rows = await db.query(
            'SELECT link, COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0 GROUP BY link',
            [userId]
        );
        const badges = { pending: 0, cases: 0, appointments: 0, documents: 0 };
        for (const row of rows) {
            const link = row.link || '';
            const count = Number(row.count);
            if (link.startsWith('/cases?tab=pending')) badges.pending += count;
            else if (link.includes('/documents')) badges.documents += count;
            else if (link.startsWith('/cases')) badges.cases += count;
            else if (link.startsWith('/appointments')) badges.appointments += count;
        }
        return badges;
    },

    /** Mark one notification read and return it (null if it is not this user's). */
    async markRead(notificationId, userId) {
        const row = await db.queryOne(
            'SELECT notification_id, link FROM notifications WHERE notification_id = ? AND user_id = ?',
            [notificationId, userId]
        );
        if (row) await db.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [notificationId]);
        return row;
    },

    markAllRead(userId) {
        return db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    },

    /** Mark read every notification whose link is exactly one of `links`. */
    markLinksRead(userId, links) {
        return db.query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0 AND link IN (?)',
            [userId, links]
        );
    },

    /** Mark read every notification whose link starts with `prefix` (used when that page is opened). */
    markSectionRead(userId, prefix) {
        return db.query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0 AND link LIKE ?',
            [userId, `${prefix}%`]
        );
    },
};

module.exports = Notification;
