const express = require('express');
const messageController = require('../controllers/messageController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Conversations list & unread count (client & lawyer)
router.get('/conversations', requireRole('client', 'lawyer'), messageController.getConversations);
router.get('/unread-count', requireRole('client', 'lawyer'), messageController.getUnreadCount);

// Case messages & sending
router.get('/cases/:caseId', requireRole('client', 'lawyer'), messageController.getMessages);
router.post('/cases/:caseId', requireRole('client', 'lawyer'), messageController.sendMessage);

module.exports = router;
