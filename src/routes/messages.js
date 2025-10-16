const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  sendMessage,
  getMessages,
  getConversations,
  markMessageRead,
  deleteMessage
} = require('../controllers/messageController');

const router = express.Router();

// All message routes require authentication
router.use(authenticateToken);

// Send a message
router.post('/', sendMessage);

// Get messages (with optional conversation filter)
router.get('/', getMessages);

// Get conversations
router.get('/conversations', getConversations);

// Mark message as read
router.put('/:id/read', markMessageRead);

// Delete a message
router.delete('/:id', deleteMessage);

module.exports = router;