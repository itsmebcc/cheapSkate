// cheapSkate — SQLite Database Layer

import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "cheapskate.db");

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      token TEXT NOT NULL,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      balance REAL DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id TEXT NOT NULL REFERENCES users(id),
      referred_id TEXT NOT NULL REFERENCES users(id),
      commission_earned REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affiliate_networks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      api_key TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      network TEXT NOT NULL,
      network_id TEXT,
      merchant_name TEXT NOT NULL,
      merchant_id TEXT,
      domain TEXT NOT NULL,
      landing_url TEXT,
      discount TEXT,
      description TEXT,
      commission_pct REAL,
      cookie_window INTEGER DEFAULT 30,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id TEXT,
      domain TEXT NOT NULL,
      code TEXT NOT NULL,
      discount TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      offer_id TEXT,
      network TEXT,
      order_id TEXT,
      order_amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      user_share REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payout_hold_until TEXT,
      fraud_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fraud_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      order_id TEXT,
      return_order_id TEXT,
      flagged INTEGER DEFAULT 0,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
