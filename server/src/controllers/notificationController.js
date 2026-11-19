// Controller: the notification bell in the navbar.
const Case = require('../models/Case');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');
const { currentLawyer, toId } = require('../utils/profiles');

// GET /api/notifications
async function list(req, res) {
    const userId = req.session.user.user_id;
    const [notifications, unreadCount] = await Promise.all([
        Notification.latest(userId, 10),
        Notification.countUnread(userId),
    ]);
    // Lawyers also get the number of case requests waiting for an answer (menu badge).
    const pendingCases = req.session.user.role === 'lawyer'
        ? await Case.countPendingForLawyer((await currentLawyer(req)).lawyer_id)
        : 0;
    res.json({
        notifications: notifications.map((n) => ({ ...n, is_read: Boolean(n.is_read) })),
        unreadCount,
        pendingCases,
    });
}

// POST /api/notifications/:notificationId/read   -> { link } so the page can open it
async function markRead(req, res) {
    const row = await Notification.markRead(toId(req.params.notificationId), req.session.user.user_id);
    if (!row) throw new HttpError(404, 'Notification not found.');
    res.json({ link: row.link || '/dashboard' });
}

// POST /api/notifications/read-all
async function markAllRead(req, res) {
    await Notification.markAllRead(req.session.user.user_id);
    res.json({ message: 'All notifications marked as read.' });
}

module.exports = { list, markRead, markAllRead };
