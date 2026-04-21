const express = require('express');
const { readDB, writeDB } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users by email or username
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query) return res.json([]);

    const db = await readDB();
    const results = db.users
      .filter(u => 
        u.id !== req.user.id && 
        (u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
      )
      .map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        profileImage: u.profileImage,
        status: u.status
      }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or get chat with a user (essentially adding to recent contacts if not there)
// We'll manage recent contacts implicitly via messages, but users can have an explicit 'contacts' list.
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;
    if (contactId === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const db = await readDB();
    const currentUser = db.users.find(u => u.id === req.user.id);
    const contactUser = db.users.find(u => u.id === contactId);

    if (!contactUser) return res.status(404).json({ error: 'Contact not found' });

    if (!currentUser.contacts.includes(contactId)) {
      currentUser.contacts.push(contactId);
      await writeDB(db);
    }

    res.json({ message: 'Contact added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const currentUser = db.users.find(u => u.id === req.user.id);
    
    // Get full contact objects OR users we have messages with
    const contacts = db.users
      .filter(u => currentUser.contacts.includes(u.id))
      .map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        profileImage: u.profileImage,
        status: u.status
      }));

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
