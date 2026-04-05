'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

/** Issue a signed JWT for a given user record */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/** POST /auth/register — anyone can self-register (default role: viewer) */
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'viewer' } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return next(createError('Email is already in use', 409));
    }

    // Only admins may self-register as non-viewer (guard moved here as a rule of thumb)
    // In practice, admin registration is done via seed or direct DB for first admin.
    const safeRole = role === 'admin' ? 'viewer' : role;

    const id       = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, email, password_hash, safeRole);

    const user  = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?').get(id);
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/login */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return next(createError('Invalid email or password', 401));
    }
    if (user.status === 'inactive') {
      return next(createError('Account is deactivated — contact an admin', 403));
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(createError('Invalid email or password', 401));
    }

    const token = signToken(user);
    const { password: _pw, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

/** GET /auth/me — returns the currently authenticated user */
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
