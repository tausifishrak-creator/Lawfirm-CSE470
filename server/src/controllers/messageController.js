// Controller: In-App Messaging endpoints.
const Case = require('../models/Case');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');

const messageController = {
    /**
     * List all active conversations for the logged in client or lawyer.
     */
    async getConversations(req, res, next) {
        try {
            const conversations = await Message.findConversations(req.session.user);
            res.json({ conversations });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Get messages for a specific case, optionally filtering for messages newer than afterId.
     * Automatically marks messages received by the user as read.
     */
    async getMessages(req, res, next) {
        try {
            const caseId = Number(req.params.caseId);
            const afterId = Number(req.query.afterId) || 0;

            const caseInfo = await Case.findForUser(caseId, req.session.user);
            if (!caseInfo) {
                throw new HttpError(404, 'Case not found or access denied.');
            }

            const messages = await Message.findByCase(caseId, afterId);

            // Mark received messages as read
            await Message.markAsRead(caseId, req.session.user.user_id);

            res.json({
                case: {
                    case_id: caseInfo.case_id,
                    title: caseInfo.title,
                    status: caseInfo.status,
                    other_name: caseInfo.other_name,
                    other_user_id: caseInfo.other_user_id,
                },
                messages: messages.map((m) => ({
                    message_id: m.message_id,
                    case_id: m.case_id,
                    sender_id: m.sender_id,
                    receiver_id: m.receiver_id,
                    message: m.message,
                    sender_name: m.sender_name,
                    is_mine: m.sender_id === req.session.user.user_id,
                    is_read: Boolean(m.is_read),
                    created_at: m.created_at,
                })),
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Send a new message inside a case conversation.
     */
    async sendMessage(req, res, next) {
        try {
            const caseId = Number(req.params.caseId);
            const text = (req.body.message || '').trim();

            if (!text) {
                throw new HttpError(400, 'Message cannot be empty.');
            }

            const caseInfo = await Case.findForUser(caseId, req.session.user);
            if (!caseInfo) {
                throw new HttpError(404, 'Case not found or access denied.');
            }

            if (['Pending', 'Rejected'].includes(caseInfo.status)) {
                throw new HttpError(400, 'Messaging is only available after a case is accepted.');
            }

            const receiverId = caseInfo.other_user_id;
            const messageId = await Message.create({
                caseId,
                senderId: req.session.user.user_id,
                receiverId,
                message: text,
            });

            // Notify recipient
            const senderName = req.session.user.full_name;
            const snippet = text.length > 50 ? `${text.slice(0, 50)}...` : text;
            await Notification.push(
                receiverId,
                `New message from ${senderName}: "${snippet}"`,
                `/messages?caseId=${caseId}`
            );

            res.status(201).json({
                message: 'Message sent successfully.',
                messageId,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Get unread message count for current user.
     */
    async getUnreadCount(req, res, next) {
        try {
            const unreadCount = await Message.countUnread(req.session.user.user_id);
            res.json({ unreadCount });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = messageController;
