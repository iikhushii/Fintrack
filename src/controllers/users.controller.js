'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const SAFE_FIELDS = 'id, name, email, role, status, created_at, updated_at';

/** GET /users — list all users (admin only) */
function listUsers(req, res, next) {
  try {
    const db = getDb();
    const { role, status, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const params     = [];

    if (role)   { conditions.push('role = ?');   params.push(role);   }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const where  = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${where}`).get(...params).n;
    const users = db.prepare(`SELECT ${SAFE_FIELDS} FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    res.json({ total, page: +page, limit: +limit, pages: Math.ceil(total / limit), data: users });
  } catch (err) {
    next(err);
  }
}

/** GET /users/:id */
function getUser(req, res, next) {
  try {
    const db   = getDb();
    const user = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
    if (!user) return next(createError('User not found', 404));
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** POST /users — admin creates a new user with explicit role */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'viewer' } = req.body;
    const db = getDb();

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return next(createError('Email is already in use', 409));
    }

    const id   = uuidv4();
    const hash = await bcrypt.hash(password, 12);

    db.prepare(`INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`).run(id, name, email, hash, role);

    const user = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(id);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

/** PATCH /users/:id — admin updates role / status / name */
function updateUser(req, res, next) {
  try {
    const db   = getDb();
    const user = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
    if (!user) return next(createError('User not found', 404));

    // Prevent an admin from demoting themselves
    if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
      return next(createError('You cannot change your own role', 403));
    }

    const { name, role, status } = req.body;
    const sets   = [];
    const params = [];

    if (name   !== undefined) { sets.push('name = ?');   params.push(name);   }
    if (role   !== undefined) { sets.push('role = ?');   params.push(role);   }
    if (status !== undefined) { sets.push('status = ?'); params.push(status); }

    if (!sets.length) return next(createError('No fields to update', 400));

    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
    params.push(req.params.id);

    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/** DELETE /users/:id — admin hard-deletes a user (protect self) */
function deleteUser(req, res, next) {
  try {
    const db = getDb();
    if (req.params.id === req.user.id) {
      return next(createError('You cannot delete your own account', 403));
    }
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return next(createError('User not found', 404));

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
