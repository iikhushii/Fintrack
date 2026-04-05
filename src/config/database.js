'use strict';

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './finance.db';
const dbPath = path.resolve(DB_PATH);

let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initialiseSchema(db);
  }
  return db;
}

function initialiseSchema(db) {
  db.exec(`
    -- ─────────────────────────────────────
    --  USERS
    -- ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('viewer','analyst','admin')) DEFAULT 'viewer',
      status      TEXT NOT NULL CHECK(status IN ('active','inactive')) DEFAULT 'active',
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    -- ─────────────────────────────────────
    --  TRANSACTIONS (financial records)
    -- ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      amount      REAL NOT NULL CHECK(amount > 0),
      type        TEXT NOT NULL CHECK(type IN ('income','expense')),
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      notes       TEXT,
      created_by  TEXT NOT NULL REFERENCES users(id),
      is_deleted  INTEGER NOT NULL DEFAULT 0,   -- soft delete flag
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    -- ─────────────────────────────────────
    --  REFRESH TOKENS  (optional auth)
    -- ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_txn_type     ON transactions(type)     WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category) WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_txn_date     ON transactions(date)     WHERE is_deleted = 0;
    CREATE INDEX IF NOT EXISTS idx_txn_creator  ON transactions(created_by);
  `);
}

module.exports = { getDb };
