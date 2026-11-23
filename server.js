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


// 4. DELETE: Delete vibe by email
app.delete('/vibes-all/:email', async (req, res) => {
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

// 3. PUT: Edit only vibe text by email + vibeId
app.put('/vibes/:email/:vibeId', async (req, res) => {
  const { email, vibeId } = req.params;
  const { vibe } = req.body;

  if (!isValidUUID(vibeId)) {
    return res.status(400).json({ error: 'Invalid vibeId format.' });
  }

  if (!vibe) {
    return res.status(400).json({ error: 'Updated vibe content is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE vibes
       SET vibe = $1
       WHERE email = $2 AND id = $3
       RETURNING *`,
      [vibe, email, vibeId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'No vibe found for this email and vibeId.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vibe.' });
  }
});

// 4. DELETE: Delete vibe by email + vibeId
app.delete('/vibes/:email/:vibeId', async (req, res) => {
  const { email, vibeId } = req.params;

  if (!isValidUUID(vibeId)) {
    return res.status(400).json({ error: 'Invalid vibeId format.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM vibes WHERE email = $1 AND id = $2 RETURNING *',
      [email, vibeId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'No vibe found for this email and vibeId.' });
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
