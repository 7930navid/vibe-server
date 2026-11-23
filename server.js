require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL?.includes('localhost') ||
    process.env.DATABASE_URL?.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }, // Required for cloud DBs like Render, Neon, Supabase
});

// Test DB connection
pool
  .connect()
  .then((client) => {
    console.log('Connected to PostgreSQL database');
    client.release();
  })
  .catch((err) => console.error('Database connection error:', err.stack));

// 1. POST: Create a new vibe
app.post('/vibes', async (req, res) => {
  const { username, email, avatar, type, vibe } = req.body;

  if (!username || !email || !vibe) {
    return res
      .status(400)
      .json({ error: 'Username, email, and vibe are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vibes (username, email, avatar, type, vibe)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [username, email, avatar || null, type || null, vibe]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create vibe.' });
  }
});

// 2. GET: Get all vibes
app.get('/vibes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vibes');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vibes.' });
  }
});

// 3. PUT: Edit vibe (and optional fields) by email
app.put('/vibes/:email', async (req, res) => {
  const { email } = req.params;
  const { username, avatar, type, vibe } = req.body;

  if (!vibe) {
    return res.status(400).json({ error: 'Updated vibe content is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE vibes
       SET vibe = $1,
           username = COALESCE($2, username),
           avatar = COALESCE($3, avatar),
           type = COALESCE($4, type)
       WHERE email = $5
       RETURNING *`,
      [vibe, username, avatar, type, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No vibe found for this email.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vibe.' });
  }
});

// 4. DELETE: Delete vibe by email
app.delete('/vibes/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM vibes WHERE email = $1 RETURNING *',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No vibe found for this email.' });
    }

    res
      .status(200)
      .json({ message: 'Vibe deleted successfully.', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete vibe.' });
  }
});

app.listen(PORT, () => {
  console.log(`Vibe server running on port ${PORT}`);
});
