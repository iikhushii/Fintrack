'use strict';

/**
 * Seed script — run with: node src/config/seed.js
 * Creates:
 *   admin@finance.dev  / Admin@123
 *   analyst@finance.dev / Analyst@123
 *   viewer@finance.dev  / Viewer@123
 * Plus 20 sample transactions
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./database');

function randDate(daysBack = 90) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().split('T')[0];
}

/**
 * Runs the seed logic and returns a summary object.
 * Safe to call multiple times — uses INSERT OR IGNORE so existing rows are skipped.
 *
 * @returns {Promise<{ usersSeeded: string[], transactionsSeeded: number }>}
 */
async function runSeed() {
  const db = getDb();

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { name: 'Alice Admin',    email: 'admin@finance.dev',   role: 'admin',   password: 'Admin@123' },
    { name: 'Anna Analyst',   email: 'analyst@finance.dev', role: 'analyst', password: 'Analyst@123' },
    { name: 'Victor Viewer',  email: 'viewer@finance.dev',  role: 'viewer',  password: 'Viewer@123' },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password, role)
    VALUES (@id, @name, @email, @password, @role)
  `);

  const createdUsers = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const id   = uuidv4();
    insertUser.run({ ...u, id, password: hash });
    createdUsers.push({ id, ...u });
    console.log(`  ✔ User: ${u.email}  (${u.role})`);
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  // Resolve the admin user's actual id from the DB (handles re-runs where the
  // INSERT OR IGNORE above was a no-op and createdUsers[0].id is a fresh uuid).
  const adminRow = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@finance.dev');
  const adminId  = adminRow.id;

  const insertTxn = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, amount, type, category, date, notes, created_by)
    VALUES (@id, @amount, @type, @category, @date, @notes, @created_by)
  `);

  const samples = [
    { type: 'income',  category: 'Salary',        amount: 5000.00, notes: 'Monthly salary' },
    { type: 'income',  category: 'Freelance',      amount: 1200.50, notes: 'Web project payment' },
    { type: 'income',  category: 'Investment',     amount: 340.75,  notes: 'Dividend income' },
    { type: 'expense', category: 'Rent',           amount: 1500.00, notes: 'Monthly rent' },
    { type: 'expense', category: 'Groceries',      amount: 280.30,  notes: 'Weekly groceries' },
    { type: 'expense', category: 'Utilities',      amount: 120.00,  notes: 'Electricity bill' },
    { type: 'expense', category: 'Entertainment',  amount: 65.99,   notes: 'Streaming + dining' },
    { type: 'expense', category: 'Travel',         amount: 430.00,  notes: 'Flight tickets' },
    { type: 'expense', category: 'Healthcare',     amount: 200.00,  notes: 'Doctor visit' },
    { type: 'income',  category: 'Freelance',      amount: 800.00,  notes: 'Logo design gig' },
    { type: 'expense', category: 'Education',      amount: 99.00,   notes: 'Online course' },
    { type: 'expense', category: 'Groceries',      amount: 310.45,  notes: 'Monthly stock-up' },
    { type: 'income',  category: 'Investment',     amount: 150.25,  notes: 'Stock sale profit' },
    { type: 'expense', category: 'Utilities',      amount: 95.50,   notes: 'Water + internet' },
    { type: 'expense', category: 'Travel',         amount: 220.00,  notes: 'Hotel stay' },
    { type: 'income',  category: 'Salary',         amount: 5000.00, notes: 'Monthly salary' },
    { type: 'expense', category: 'Rent',           amount: 1500.00, notes: 'Monthly rent' },
    { type: 'expense', category: 'Entertainment',  amount: 45.00,   notes: 'Movie + popcorn' },
    { type: 'expense', category: 'Healthcare',     amount: 75.00,   notes: 'Pharmacy' },
    { type: 'income',  category: 'Other',          amount: 250.00,  notes: 'Gift received' },
  ];

  for (const s of samples) {
    insertTxn.run({ id: uuidv4(), ...s, date: randDate(), created_by: adminId });
  }
  console.log(`  ✔ Inserted ${samples.length} sample transactions`);
  console.log('\nSeed complete ✅');

  return {
    usersSeeded: users.map(u => ({ email: u.email, role: u.role })),
    transactionsSeeded: samples.length,
  };
}

module.exports = { runSeed };

// Allow running directly: node src/config/seed.js
if (require.main === module) {
  runSeed().catch(console.error);
}
