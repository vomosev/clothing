const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const {
  isEmail,
  requireFields,
  sanitizeString,
} = require('../middleware/validate');

const SALT_ROUNDS = 10;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    createdAt: row.created_at || null,
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      resolve();
      return;
    }
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') {
      resolve();
      return;
    }
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

async function signup(req, res, next) {
  try {
    const body = req.body || {};
    requireFields(body, ['fullName', 'email', 'password']);

    const fullName = sanitizeString(body.fullName, 120);
    const email = sanitizeString(body.email, 190).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (fullName.length < 2) {
      throw httpError(400, 'Please enter your full name.');
    }
    if (!isEmail(email)) {
      throw httpError(400, 'Please enter a valid email address.');
    }
    if (password.length < 8) {
      throw httpError(400, 'Password must be at least 8 characters.');
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      throw httpError(409, 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    let insertId;
    try {
      const [result] = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?, ?, ?, NOW())',
        [email, passwordHash, fullName]
      );
      insertId = result.insertId;
    } catch (dbErr) {
      if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
        throw httpError(409, 'An account with that email already exists.');
      }
      throw dbErr;
    }

    const [rows] = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = ? LIMIT 1',
      [insertId]
    );
    const user = publicUser(rows[0]) || {
      id: insertId,
      email,
      fullName,
      createdAt: null,
    };

    await regenerateSession(req);
    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
    };
    await saveSession(req);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = req.body || {};
    requireFields(body, ['email', 'password']);

    const email = sanitizeString(body.email, 190).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!isEmail(email) || password.length === 0) {
      throw httpError(400, 'Email and password are required.');
    }

    const [rows] = await pool.query(
      'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const row = rows[0];
    if (!row) {
      throw httpError(401, 'Invalid email or password.');
    }

    const match = await bcrypt.compare(password, row.password_hash || '');
    if (!match) {
      throw httpError(401, 'Invalid email or password.');
    }

    const user = publicUser(row);

    await regenerateSession(req);
    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
    };
    await saveSession(req);

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (!req.session || typeof req.session.destroy !== 'function') {
      res.json({ ok: true });
      return;
    }
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie('clothing.sid', {
        httpOnly: true,
        secure: process.env.SSL_ENABLED === 'true',
        sameSite: process.env.SSL_ENABLED === 'true' ? 'none' : 'lax',
        domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      });
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const sessionUser = req.session && req.session.user;
    if (!sessionUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const [rows] = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = ? LIMIT 1',
      [sessionUser.id]
    );

    const user = publicUser(rows[0]);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me };