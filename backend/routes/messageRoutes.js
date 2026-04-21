const express = require('express');
const { readDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get chat history with a specific user
router.get('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const currentUserId = req.user.id;

    const db = await readDB();
    
    // Messages schema: { id, senderId, receiverId, text, timestamp, status }
    const chatHistory = db.messages.filter(msg => 
      (msg.senderId === currentUserId && msg.receiverId === contactId) ||
      (msg.senderId === contactId && msg.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json(chatHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// Get recent chats (contacts with whom we have messages and their last message)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const db = await readDB();

    const recentChatsMap = new Map();

    db.messages.forEach(msg => {
      if (msg.senderId === currentUserId || msg.receiverId === currentUserId) {
        const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        
        let existing = recentChatsMap.get(otherUserId);
        if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
          recentChatsMap.set(otherUserId, msg);
        }
      }
    });

    const recentChats = Array.from(recentChatsMap.entries()).map(([otherUserId, lastMessage]) => {
      const otherUser = db.users.find(u => u.id === otherUserId);
      return {
        user: {
          id: otherUser.id,
          username: otherUser.username,
          profileImage: otherUser.profileImage,
          status: otherUser.status
        },
        lastMessage
      };
    }).sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));

    res.json(recentChats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching recent chats' });
  }
});

module.exports = router;
