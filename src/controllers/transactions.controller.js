'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// ─── Helpers ────────────────────────────────────────────────────────────────

const SORT_MAP = {
  date_asc:    'date ASC,  created_at ASC',
  date_desc:   'date DESC, created_at DESC',
  amount_asc:  'amount ASC',
  amount_desc: 'amount DESC',
};

function buildFilter(query) {
  const { type, category, from, to } = query;
  const conditions = ['t.is_deleted = 0'];
  const params     = [];

  if (type)     { conditions.push('t.type = ?');       params.push(type);     }
  if (category) { conditions.push('t.category = ?');   params.push(category); }
  if (from)     { conditions.push('t.date >= ?');      params.push(from);     }
  if (to)       { conditions.push('t.date <= ?');      params.push(to);       }

  return { where: conditions.join(' AND '), params };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/** GET /transactions — list with filter + pagination */
function listTransactions(req, res, next) {
  try {
    const db = getDb();
    const { page = 1, limit = 20, sort = 'date_desc' } = req.query;
    const { where, params } = buildFilter(req.query);
    const orderBy = SORT_MAP[sort] || SORT_MAP.date_desc;
    const offset  = (page - 1) * limit;

    const countRow = db.prepare(`
      SELECT COUNT(*) AS n FROM transactions t WHERE ${where}
    `).get(...params);

    const rows = db.prepare(`
      SELECT
        t.id, t.amount, t.type, t.category, t.date, t.notes,
        t.created_at, t.updated_at,
        u.id   AS creator_id,
        u.name AS creator_name
      FROM transactions t
      JOIN users u ON u.id = t.created_by
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, +limit, +offset);

    res.json({
      total: countRow.n,
      page:  +page,
      limit: +limit,
      pages: Math.ceil(countRow.n / limit),
      data:  rows,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /transactions/:id */
function getTransaction(req, res, next) {
  try {
    const db  = getDb();
    const row = db.prepare(`
      SELECT
        t.id, t.amount, t.type, t.category, t.date, t.notes,
        t.created_at, t.updated_at,
        u.id   AS creator_id,
        u.name AS creator_name
      FROM transactions t
      JOIN users u ON u.id = t.created_by
      WHERE t.id = ? AND t.is_deleted = 0
    `).get(req.params.id);

    if (!row) return next(createError('Transaction not found', 404));
    res.json(row);
  } catch (err) {
    next(err);
  }
}

/** POST /transactions — analyst or admin can create */
function createTransaction(req, res, next) {
  try {
    const db  = getDb();
    const id  = uuidv4();
    const { amount, type, category, date, notes } = req.body;

    // Normalise date to string if express-validator converted it
    const dateStr = date instanceof Date
      ? date.toISOString().split('T')[0]
      : date;

    db.prepare(`
      INSERT INTO transactions (id, amount, type, category, date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, +amount, type, category, dateStr, notes || null, req.user.id);

    const row = db.prepare(`
      SELECT
        t.id, t.amount, t.type, t.category, t.date, t.notes,
        t.created_at, t.updated_at,
        u.id AS creator_id, u.name AS creator_name
      FROM transactions t
      JOIN users u ON u.id = t.created_by
      WHERE t.id = ?
    `).get(id);

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

/** PATCH /transactions/:id — analyst or admin can edit */
function updateTransaction(req, res, next) {
  try {
    const db  = getDb();
    const txn = db.prepare('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!txn) return next(createError('Transaction not found', 404));

    const { amount, type, category, date, notes } = req.body;
    const sets   = [];
    const params = [];

    if (amount   !== undefined) { sets.push('amount = ?');   params.push(+amount);  }
    if (type     !== undefined) { sets.push('type = ?');     params.push(type);     }
    if (category !== undefined) { sets.push('category = ?'); params.push(category); }
    if (date     !== undefined) {
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
      sets.push('date = ?');
      params.push(dateStr);
    }
    if (notes !== undefined) { sets.push('notes = ?'); params.push(notes); }

    if (!sets.length) return next(createError('No fields to update', 400));

    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')");
    params.push(req.params.id);

    db.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT
        t.id, t.amount, t.type, t.category, t.date, t.notes,
        t.created_at, t.updated_at,
        u.id AS creator_id, u.name AS creator_name
      FROM transactions t
      JOIN users u ON u.id = t.created_by
      WHERE t.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/** DELETE /transactions/:id — soft delete, admin only */
function deleteTransaction(req, res, next) {
  try {
    const db  = getDb();
    const txn = db.prepare('SELECT id FROM transactions WHERE id = ? AND is_deleted = 0').get(req.params.id);
    if (!txn) return next(createError('Transaction not found', 404));

    db.prepare(`
      UPDATE transactions
      SET is_deleted = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
      WHERE id = ?
    `).run(req.params.id);

    res.json({ message: 'Transaction deleted successfully', id: req.params.id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
