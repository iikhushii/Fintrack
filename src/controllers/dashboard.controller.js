'use strict';

const { getDb } = require('../config/database');

// ─── Helpers ────────────────────────────────────────────────────────────────

function currentMonthBounds() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return {
    from: `${year}-${month}-01`,
    to:   `${year}-${month}-31`,
  };
}

function nMonthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /dashboard/summary
 * Returns: total income, total expenses, net balance, transaction count.
 * Optional query params: from, to  (default = all time)
 */
function getSummary(req, res, next) {
  try {
    const db = getDb();
    const { from, to } = req.query;

    const conditions = ['is_deleted = 0'];
    const params     = [];
    if (from) { conditions.push('date >= ?'); params.push(from); }
    if (to)   { conditions.push('date <= ?'); params.push(to);   }
    const where = conditions.join(' AND ');

    const row = db.prepare(`
      SELECT
        ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS total_income,
        ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS total_expenses,
        COUNT(*) AS transaction_count
      FROM transactions
      WHERE ${where}
    `).get(...params);

    const total_income   = row.total_income   || 0;
    const total_expenses = row.total_expenses || 0;

    res.json({
      total_income,
      total_expenses,
      net_balance:       +(total_income - total_expenses).toFixed(2),
      transaction_count: row.transaction_count,
      period: { from: from || 'all-time', to: to || 'all-time' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/category-breakdown
 * Returns income & expense totals grouped by category.
 * Optional: type=income|expense, from, to
 */
function getCategoryBreakdown(req, res, next) {
  try {
    const db = getDb();
    const { type, from, to } = req.query;

    const conditions = ['is_deleted = 0'];
    const params     = [];
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (from) { conditions.push('date >= ?'); params.push(from); }
    if (to)   { conditions.push('date <= ?'); params.push(to);   }
    const where = conditions.join(' AND ');

    const rows = db.prepare(`
      SELECT
        type,
        category,
        ROUND(SUM(amount), 2) AS total,
        COUNT(*)              AS count
      FROM transactions
      WHERE ${where}
      GROUP BY type, category
      ORDER BY type, total DESC
    `).all(...params);

    // Shape into { income: [...], expense: [...] }
    const grouped = { income: [], expense: [] };
    for (const r of rows) {
      grouped[r.type]?.push({ category: r.category, total: r.total, count: r.count });
    }

    res.json(grouped);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/monthly-trend
 * Returns income vs expense totals per month for the last N months.
 * Query: months=6 (default 6, max 24)
 */
function getMonthlyTrend(req, res, next) {
  try {
    const db     = getDb();
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
    const from   = nMonthsAgo(months - 1).slice(0, 7) + '-01'; // first day of start month

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', date)                                        AS month,
        ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),2) AS income,
        ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),2) AS expense
      FROM transactions
      WHERE is_deleted = 0 AND date >= ?
      GROUP BY month
      ORDER BY month ASC
    `).all(from);

    // Fill in months that had zero transactions
    const resultMap = {};
    for (const r of rows) resultMap[r.month] = r;

    const filled = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      filled.push(resultMap[key] || { month: key, income: 0, expense: 0 });
    }

    // Attach net balance per month
    const trend = filled.map(m => ({
      ...m,
      net: +(m.income - m.expense).toFixed(2),
    }));

    res.json({ months, trend });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/weekly-trend
 * Returns income vs expense per day for the last 7 days.
 */
function getWeeklyTrend(req, res, next) {
  try {
    const db   = getDb();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    const fromStr = from.toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT
        date,
        ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),2) AS income,
        ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),2) AS expense
      FROM transactions
      WHERE is_deleted = 0 AND date >= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(fromStr);

    const resultMap = {};
    for (const r of rows) resultMap[r.date] = r;

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trend.push(resultMap[key] || { date: key, income: 0, expense: 0 });
    }

    res.json({ trend });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/recent-activity
 * Returns the N most recent non-deleted transactions.
 * Query: limit=10 (max 50)
 */
function getRecentActivity(req, res, next) {
  try {
    const db    = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const rows = db.prepare(`
      SELECT
        t.id, t.amount, t.type, t.category, t.date, t.notes, t.created_at,
        u.name AS creator_name
      FROM transactions t
      JOIN users u ON u.id = t.created_by
      WHERE t.is_deleted = 0
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ limit, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /dashboard/current-month
 * Convenience endpoint: summary scoped to the current calendar month.
 */
function getCurrentMonth(req, res, next) {
  req.query = { ...req.query, ...currentMonthBounds() };
  return getSummary(req, res, next);
}

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getWeeklyTrend,
  getRecentActivity,
  getCurrentMonth,
};
