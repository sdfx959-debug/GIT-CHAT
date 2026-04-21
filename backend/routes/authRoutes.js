const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = await readDB();
    
    // Check if user already exists
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: Date.now().toString(),
      email,
      username,
      password: hashedPassword,
      profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`, // Default avatar
      contacts: [], // array of user IDs
      status: 'offline'
    };

    db.users.push(newUser);
    await writeDB(db);

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const db = await readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
