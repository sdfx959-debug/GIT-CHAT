const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const { initDB, readDB, writeDB } = require('./db');
const { JWT_SECRET } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // For local dev
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Catch all for frontend routing (if using history API)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Map to store active connected users (userId -> socketId)
const activeUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', async (socket) => {
  const userId = socket.user.id;
  activeUsers.set(userId, socket.id);

  // Update user status to online in DB
  const db = await readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    db.users[userIndex].status = 'online';
    await writeDB(db);
    io.emit('user_status_changed', { userId, status: 'online' });
  }

  socket.on('send_message', async (data) => {
    // data: { receiverId, text }
    const { receiverId, text } = data;
    
    const db = await readDB();
    const newMessage = {
      id: Date.now().toString(),
      senderId: userId,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent' // sent, delivered, seen
    };

    db.messages.push(newMessage);
    
    // Explicitly add to contacts for both if not there
    const sender = db.users.find(u => u.id === userId);
    const receiver = db.users.find(u => u.id === receiverId);
    if (sender && receiver) {
        if (!sender.contacts.includes(receiverId)) sender.contacts.push(receiverId);
        if (!receiver.contacts.includes(userId)) receiver.contacts.push(userId);
    }
    
    await writeDB(db);

    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      newMessage.status = 'delivered'; // Can upgrade to delivered if online
      io.to(receiverSocketId).emit('receive_message', newMessage);
    }

    // Send back to sender to confirm
    socket.emit('message_sent', newMessage);
  });

  socket.on('typing', (data) => {
    const { receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { senderId: userId });
    }
  });

  socket.on('message_seen', async (data) => {
    // data: { messageIds: [] }
    const { messageIds, senderId } = data;
    const db = await readDB();
    
    db.messages.forEach(msg => {
      if (messageIds.includes(msg.id) && msg.receiverId === userId) {
        msg.status = 'seen';
      }
    });
    await writeDB(db);

    const senderSocketId = activeUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messages_seen_update', { messageIds, readerId: userId });
    }
  });

  socket.on('disconnect', async () => {
    activeUsers.delete(userId);
    const db = await readDB();
    const uIndex = db.users.findIndex(u => u.id === userId);
    if (uIndex !== -1) {
      db.users[uIndex].status = 'offline';
      db.users[uIndex].lastSeen = new Date().toISOString();
      await writeDB(db);
    }
    io.emit('user_status_changed', { userId, status: 'offline', lastSeen: new Date().toISOString() });
  });
});

const PORT = process.env.PORT || 3000;

// Initialize DB and start server
initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
