const fs = require('fs').promises;
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database.json');

const defaultDbState = {
  users: [],
  messages: []
};

// Initialize the database if it doesn't exist
async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DB_FILE, JSON.stringify(defaultDbState, null, 2), 'utf-8');
      console.log('database.json created');
    }
  }
}

// Read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return defaultDbState;
  }
}

// Write database
async function writeDB(data) {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

module.exports = {
  initDB,
  readDB,
  writeDB
};
