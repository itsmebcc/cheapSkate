// cheapSkate — API Server
// Express + SQLite backend for offer sync, user registration, conversion tracking

import express from "express";
import cors from "cors";
import { getDb } from "./db.js";
import { v4 as uuid } from "uuid";
import { createHash, randomBytes } from "crypto";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ───────────────────────────────────────────────────────────
// Health
// ───────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ ok: true, offers: countOffers(), users: countUsers() });
});

// ───────────────────────────────────────────────────────────
// Offer Sync (GET /api/offers)
// ───────────────────────────────────────────────────────────

app.get("/api/offers", (req, res) => {
  const db = getDb();
  const offers = db.prepare(
    "SELECT id, network, merchant_name, domain, landing_url, discount, description, commission_pct, cookie_window FROM offers WHERE active = 1"
  ).all();
  res.json(offers);
});

// ───────────────────────────────────────────────────────────
// Coupon Sync (GET /api/coupons)
// ───────────────────────────────────────────────────────────

app.get("/api/coupons", (req, res) => {
  const db = getDb();
  const coupons = db.prepare(
    "SELECT id, domain, code, discount, description FROM coupons WHERE active = 1"
  ).all();
  res.json(coupons);
});

// ───────────────────────────────────────────────────────────
// User Registration
// ───────────────────────────────────────────────────────────

app.post("/api/register", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const db = getDb();
  const existing = db.prepare("SELECT id, token FROM users WHERE email = ?").get(email);

  if (existing) {
    return res.json({ userId: existing.id, token: existing.token });
  }

  const userId = uuid();
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO users (id, email, token, balance, conversions) VALUES (?, ?, ?, 0, 0)")
    .run(userId, email, token);

  res.json({ userId, token });
});

// ───────────────────────────────────────────────────────────
// Conversion Tracking
// ───────────────────────────────────────────────────────────

app.post("/api/conversion", (req, res) => {
  const { userId, network, orderId, orderAmount, commission, offerId } = req.body;
  if (!userId || !orderAmount) return res.status(400).json({ error: "userId and orderAmount required" });

  const db = getDb();
  const userShare = commission * 0.5;

  db.prepare(
    "INSERT INTO conversions (user_id, offer_id, network, order_id, order_amount, commission, user_share, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')"
  ).run(userId, offerId || null, network, orderId || null, orderAmount, commission, userShare);

  // Update user balance
  db.prepare("UPDATE users SET balance = balance + ?, conversions = conversions + 1 WHERE id = ?")
    .run(userShare, userId);

  res.json({ commission, userShare });
});

// ───────────────────────────────────────────────────────────
// Balance Check
// ───────────────────────────────────────────────────────────

app.get("/api/balance/:userId", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT balance, conversions FROM users WHERE id = ?").get(req.params.userId);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(user);
});

// ───────────────────────────────────────────────────────────
// Redirect endpoint (/go/:network/:merchantId)
// ───────────────────────────────────────────────────────────

app.get("/go/:network/:merchantId", (req, res) => {
  const { network, merchantId } = req.params;
  const dest = req.query.dest || `https://${merchantId}`;

  // For MVP: log the redirect, then forward
  console.log(`[redirect] ${network}/${merchantId} → ${dest} (ref: ${req.query.ref || "none"})`);

  // In production: redirect through the affiliate network's deep-link
  // For MVP: just redirect to the merchant
  res.redirect(302, decodeURIComponent(dest));
});

// ───────────────────────────────────────────────────────────
// Admin: Add offers (for seeding)
// ───────────────────────────────────────────────────────────

app.post("/api/offers", (req, res) => {
  const offers = Array.isArray(req.body) ? req.body : [req.body];
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO offers (network, network_id, merchant_name, merchant_id, domain, landing_url, discount, description, commission_pct, cookie_window) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (const o of offers) {
    stmt.run(o.network, o.networkId || null, o.merchantName, o.merchantId, o.domain, o.landingUrl || null, o.discount || null, o.description || null, o.commissionPct || null, o.cookieWindow || 30);
  }

  res.json({ inserted: offers.length });
});

// ───────────────────────────────────────────────────────────
// Withdrawal page (MVP)
// ───────────────────────────────────────────────────────────

app.get("/withdraw", (req, res) => {
  const userId = req.query.userId;
  const db = getDb();
  const user = db.prepare("SELECT email, balance FROM users WHERE id = ?").get(userId);

  if (!user) return res.status(404).send("User not found");

  res.send(`
    <html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h1>🏷️ cheapSkate Withdrawal</h1>
      <p>Balance: <strong>$${user.balance.toFixed(2)}</strong></p>
      <p>Minimum withdrawal: $5.00</p>
      ${user.balance >= 5
        ? `<form method="POST" action="/withdraw">
            <input type="hidden" name="userId" value="${userId}">
            <p>Send to: <input name="address" placeholder="BTC/ETH address" style="width:300px;padding:8px"></p>
            <button style="padding:10px 24px;background:#22c55e;color:#fff;border:none;border-radius:10px;cursor:pointer">Withdraw</button>
          </form>`
        : `<p style="color:#999">Keep shopping to earn more!</p>`
      }
    </body></html>
  `);
});

app.post("/withdraw", (req, res) => {
  const { userId, address } = req.body;
  const db = getDb();
  const user = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
  if (!user || user.balance < 5) return res.status(400).send("Insufficient balance");

  // For MVP: mark as paid, reset balance
  db.prepare("UPDATE users SET balance = 0 WHERE id = ?").run(userId);
  console.log(`[withdrawal] ${userId} → ${address}: $${user.balance.toFixed(2)}`);
  res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>✅ Withdrawal submitted</h1><p>$${user.balance.toFixed(2)} sent to ${address}</p></body></html>`);
});

// ───────────────────────────────────────────────────────────
// Start
// ───────────────────────────────────────────────────────────

function countOffers() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as c FROM offers WHERE active=1").get();
  return row.c;
}

function countUsers() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get();
  return row.c;
}

app.listen(PORT, () => {
  console.log(`[cheapSkate] API server running on http://localhost:${PORT}`);
});
