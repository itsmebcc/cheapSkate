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
  const { email, referralCode } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const db = getDb();
  const existing = db.prepare("SELECT id, token, referral_code FROM users WHERE email = ?").get(email);

  if (existing) {
    return res.json({ userId: existing.id, token: existing.token, referralCode: existing.referral_code });
  }

  // Generate a unique referral code
  let referralCodeStr;
  while (true) {
    referralCodeStr = randomBytes(4).toString("hex").slice(0, 8);
    const conflict = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(referralCodeStr);
    if (!conflict) break;
  }

  const userId = uuid();
  const token = randomBytes(32).toString("hex");

  // Find referrer if referral code provided
  let referredBy = null;
  if (referralCode) {
    const referrer = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(referralCode);
    if (referrer) referredBy = referrer.id;
  }

  // Insert user FIRST so the referral FK works
  db.prepare("INSERT INTO users (id, email, token, referral_code, referred_by, balance, conversions) VALUES (?, ?, ?, ?, ?, 0, 0)")
    .run(userId, email, token, referralCodeStr, referredBy);

  // Now create referral record (user exists in DB)
  if (referredBy) {
    db.prepare("INSERT INTO referrals (referrer_id, referred_id, commission_earned) VALUES (?, ?, 0)")
      .run(referredBy, userId);
  }

  res.json({ userId, token, referralCode: referralCodeStr });
});

// ───────────────────────────────────────────────────────────
// Conversion Tracking
// ───────────────────────────────────────────────────────────

app.post("/api/conversion", (req, res) => {
  const { userId, network, orderId, orderAmount, commission, offerId } = req.body;
  if (!userId || !orderAmount) return res.status(400).json({ error: "userId and orderAmount required" });

  const db = getDb();
  const userShare = commission * 0.5;

  // ── Fraud detection ──

  let fraudFlag = 0;
  let fraudReason = null;
  let status = "confirmed";

  // 1. Check if this orderId was already used (duplicate conversion)
  if (orderId) {
    const existing = db.prepare("SELECT id FROM conversions WHERE order_id = ? AND user_id = ?").get(orderId, userId);
    if (existing) {
      fraudFlag = 1;
      fraudReason = "duplicate_order_id";
      status = "flagged";
    }
  }

  // 2. Return-rate check: count user's conversions vs flagged returns
  if (!fraudFlag) {
    const totalConvs = db.prepare("SELECT COUNT(*) as c FROM conversions WHERE user_id = ?").get(userId);
    const flaggedCount = db.prepare("SELECT COUNT(*) as c FROM fraud_checks WHERE user_id = ? AND flagged = 1").get(userId);
    const total = totalConvs.c + 1; // including this one
    const flagged = flaggedCount.c;
    if (total > 3 && (flagged / total) > 0.2) {
      fraudFlag = 1;
      fraudReason = "return_rate_exceeded";
      status = "flagged";
    }
  }

  // 3. Payout hold: 30-day hold on first conversion
  let payoutHoldUntil = null;
  if (!fraudFlag) {
    const convCount = db.prepare("SELECT COUNT(*) as c FROM conversions WHERE user_id = ?").get(userId);
    if (convCount.c === 0) {
      // First conversion — hold for 30 days
      payoutHoldUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      status = "pending";
    } else if (convCount.c < 3) {
      // Hold until 3 conversions
      payoutHoldUntil = "requires_3_conversions";
      status = "pending";
    }
  }

  // Insert conversion with fraud info
  db.prepare(
    "INSERT INTO conversions (user_id, offer_id, network, order_id, order_amount, commission, user_share, status, payout_hold_until, fraud_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, offerId || null, network, orderId || null, orderAmount, commission, userShare, status, payoutHoldUntil, fraudFlag);

  // Only credit balance if not flagged
  if (!fraudFlag) {
    db.prepare("UPDATE users SET balance = balance + ?, conversions = conversions + 1 WHERE id = ?")
      .run(userShare, userId);

    // Referral commission: 10% of user's share to the referrer
    const user = db.prepare("SELECT referred_by FROM users WHERE id = ?").get(userId);
    if (user && user.referred_by) {
      const refCommission = userShare * 0.1;
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?")
        .run(refCommission, user.referred_by);
      db.prepare("UPDATE referrals SET commission_earned = commission_earned + ? WHERE referred_id = ?")
        .run(refCommission, userId);
    }
  }

  // Record fraud check
  if (fraudFlag && orderId) {
    db.prepare("INSERT INTO fraud_checks (user_id, order_id, flagged, reason) VALUES (?, ?, 1, ?)")
      .run(userId, orderId, fraudReason);
  }

  res.json({ commission, userShare, status, fraudFlag, fraudReason });
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
// Referral — get stats
// ───────────────────────────────────────────────────────────

app.get("/api/referral/:userId", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT referral_code, referred_by FROM users WHERE id = ?").get(req.params.userId);
  if (!user) return res.status(404).json({ error: "user not found" });

  // Count referrals and total commission earned
  const stats = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(commission_earned), 0) as total FROM referrals WHERE referrer_id = ?"
  ).get(req.params.userId);

  res.json({
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    referrals: stats.count,
    referralCommission: stats.total,
  });
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
  const user = db.prepare("SELECT balance, conversions FROM users WHERE id = ?").get(userId);
  if (!user || user.balance < 5) return res.status(400).send("Insufficient balance");

  // Fraud check: pending payout holds
  const pendingHolds = db.prepare(
    "SELECT COUNT(*) as c FROM conversions WHERE user_id = ? AND payout_hold_until IS NOT NULL AND status = 'pending'"
  ).get(userId);
  if (pendingHolds.c > 0) {
    return res.status(403).send("Payout on hold — first conversion pending 30-day review.");
  }

  // Fraud check: flagged conversions
  const flagged = db.prepare(
    "SELECT COUNT(*) as c FROM conversions WHERE user_id = ? AND fraud_flag = 1"
  ).get(userId);
  if (flagged.c > 0) {
    return res.status(403).send("Withdrawal blocked — suspicious activity flagged. Contact support.");
  }

  // Fraud check: minimum 3 conversions
  if (user.conversions < 3) {
    return res.status(403).send("Need at least 3 confirmed conversions before first withdrawal.");
  }

  // Mark as paid, reset balance
  db.prepare("UPDATE users SET balance = 0 WHERE id = ?").run(userId);
  console.log(`[withdrawal] ${userId} → ${address}: $${user.balance.toFixed(2)}`);
  res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>✅ Withdrawal submitted</h1><p>$${user.balance.toFixed(2)} sent to ${address}</p></body></html>`);
});

// ───────────────────────────────────────────────────────────
// Admin Auth
// ───────────────────────────────────────────────────────────

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin";

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ───────────────────────────────────────────────────────────
// Admin API — Stats
// ───────────────────────────────────────────────────────────

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT COUNT(*) as c FROM users").get();
  const conversions = db.prepare("SELECT COUNT(*) as c FROM conversions").get();
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(commission), 0) as total FROM conversions").get();
  const totalPaid = db.prepare("SELECT COALESCE(SUM(user_share), 0) as total FROM conversions").get();
  const offersCount = db.prepare("SELECT COUNT(*) as c FROM offers WHERE active=1").get();
  const couponsCount = db.prepare("SELECT COUNT(*) as c FROM coupons WHERE active=1").get();
  const referralsCount = db.prepare("SELECT COUNT(*) as c FROM referrals").get();
  const referralCommission = db.prepare("SELECT COALESCE(SUM(commission_earned), 0) as total FROM referrals").get();
  res.json({
    users: users.c,
    conversions: conversions.c,
    totalCommission: totalRevenue.total,
    totalPaidToUsers: totalPaid.total,
    offers: offersCount.c,
    coupons: couponsCount.c,
    referrals: referralsCount.c,
    referralCommission: referralCommission.total,
  });
});

// ───────────────────────────────────────────────────────────
// Admin API — Users list
// ───────────────────────────────────────────────────────────

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    "SELECT id, email, balance, conversions, created_at FROM users ORDER BY created_at DESC LIMIT 100"
  ).all();
  res.json(users);
});

// ───────────────────────────────────────────────────────────
// Admin API — Conversions list
// ───────────────────────────────────────────────────────────

app.get("/api/admin/conversions", requireAdmin, (req, res) => {
  const db = getDb();
  const convs = db.prepare(
    "SELECT c.id, c.user_id, u.email, c.network, c.order_amount, c.commission, c.user_share, c.status, c.created_at FROM conversions c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT 100"
  ).all();
  res.json(convs);
});

// ───────────────────────────────────────────────────────────
// Admin Dashboard (HTML)
// ───────────────────────────────────────────────────────────

app.get("/admin", (req, res) => {
  const token = ADMIN_TOKEN;
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cheapSkate Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #f8f8f8; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header h1 { font-size: 24px; }
    .header .token { font-size: 12px; color: #888; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; }
    .card-value { font-size: 28px; font-weight: 700; color: #22c55e; margin-bottom: 4px; }
    .card-label { font-size: 13px; color: #888; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 12px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #2a2a2a; }
    td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #1a1a1a; }
    .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
    .badge { padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .badge-confirmed { background: #22c55e; color: #000; }
    .badge-pending { background: #f59e0b; color: #000; }
    .nav { display: flex; gap: 16px; margin-bottom: 24px; }
    .nav a { color: #888; text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
    .nav a.active { color: #22c55e; background: #1a1a1a; }
    .nav a:hover { color: #f8f8f8; }
    @media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏷️ cheapSkate Admin</h1>
    <div class="token">Token: <code>${token}</code></div>
  </div>

  <div class="nav">
    <a href="/admin" class="active">Dashboard</a>
    <a href="/admin?view=users">Users</a>
    <a href="/admin?view=conversions">Conversions</a>
  </div>

  <div id="stats-grid" class="grid">
    <div class="card"><div class="card-value">—</div><div class="card-label">Users</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Conversions</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Total commission</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Paid to users</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Active offers</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Active coupons</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Referrals</div></div>
    <div class="card"><div class="card-value">—</div><div class="card-label">Referral commission</div></div>
  </div>

  <div id="table-container"></div>

  <script>
    const API_TOKEN = '${token}';
    const view = new URLSearchParams(location.search).get('view') || 'dashboard';

    async function loadStats() {
      const res = await fetch('/api/admin/stats?token=' + API_TOKEN);
      const d = await res.json();
      const cards = document.querySelectorAll('.card');
      cards[0].querySelector('.card-value').textContent = d.users;
      cards[1].querySelector('.card-value').textContent = d.conversions;
      cards[2].querySelector('.card-value').textContent = '$' + d.totalCommission.toFixed(2);
      cards[3].querySelector('.card-value').textContent = '$' + d.totalPaidToUsers.toFixed(2);
      cards[4].querySelector('.card-value').textContent = d.offers;
      cards[5].querySelector('.card-value').textContent = d.coupons;
      cards[6].querySelector('.card-value').textContent = d.referrals;
      cards[7].querySelector('.card-value').textContent = '$' + d.referralCommission.toFixed(2);
    }

    async function loadUsers() {
      const res = await fetch('/api/admin/users?token=' + API_TOKEN);
      const users = await res.json();
      let html = '<div class="section-title">Users</div><table><thead><tr><th>Email</th><th>Balance</th><th>Conversions</th><th>Created</th></tr></thead><tbody>';
      for (const u of users) {
        html += '<tr><td>' + esc(u.email) + '</td><td>$' + u.balance.toFixed(2) + '</td><td>' + u.conversions + '</td><td>' + u.created_at + '</td></tr>';
      }
      html += '</tbody></table>';
      document.getElementById('table-container').innerHTML = html;
    }

    async function loadConversions() {
      const res = await fetch('/api/admin/conversions?token=' + API_TOKEN);
      const convs = await res.json();
      let html = '<div class="section-title">Conversions</div><table><thead><tr><th>User</th><th>Network</th><th>Amount</th><th>Commission</th><th>User share</th><th>Status</th><th>Date</th></tr></thead><tbody>';
      for (const c of convs) {
        const badgeClass = c.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending';
        html += '<tr><td>' + esc(c.email || c.user_id) + '</td><td>' + esc(c.network) + '</td><td>$' + c.order_amount.toFixed(2) + '</td><td>$' + c.commission.toFixed(2) + '</td><td>$' + c.user_share.toFixed(2) + '</td><td><span class="badge ' + badgeClass + '">' + c.status + '</span></td><td>' + c.created_at + '</td></tr>';
      }
      html += '</tbody></table>';
      document.getElementById('table-container').innerHTML = html;
    }

    function esc(s) { return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>'); }

    if (view === 'users') loadUsers();
    else if (view === 'conversions') loadConversions();
    else { loadStats(); document.getElementById('table-container').innerHTML = ''; }
  </script>
</body>
</html>
  `);
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
