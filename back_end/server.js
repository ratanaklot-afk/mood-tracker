const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./moods.db', (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mood TEXT,
    date TEXT
  )`);
});

// Register Endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
      if (err) return res.status(400).json({ error: 'Username already exists' });
      res.json({ message: 'User registered successfully!' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });

    res.json({ message: 'Login successful', userId: user.id, username: user.username });
  });
});

// Submit Mood Endpoint
app.post('/api/mood', (req, res) => {
  const { userId, mood } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (!userId || !mood) return res.status(400).json({ error: 'Missing data' });

  db.run(`INSERT INTO moods (user_id, mood, date) VALUES (?, ?, ?)`, [userId, mood, today], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to save mood' });
    res.json({ message: 'Mood recorded successfully!' });
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));