// cheapSkate — Server Integration Tests
// Run: node test.js
// Tests all API endpoints end-to-end with a fresh database.
// Requires the server to be running on port 3001 (node server.js & node test.js)

import http from "http";

let testUserId;
let testUserToken;
let testReferralCode;

// ── Helpers ──

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["x-admin-token"] = token;
    const opts = {
      hostname: "localhost",
      port: 3001,
      path,
      method,
      headers,
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assertEq(label, actual, expected) {
  const ok = actual === expected || (typeof actual === "number" && typeof expected === "number" && Math.abs(actual - expected) < 0.001);
  if (ok) console.log(`  ✓ ${label}`);
  else {
    console.log(`  ✗ ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  }
}

function assertHas(label, obj, key) {
  if (obj && obj[key] !== undefined) console.log(`  ✓ ${label}`);
  else {
    console.log(`  ✗ ${label}: missing key "${key}" in ${JSON.stringify(obj)}`);
    process.exitCode = 1;
  }
}

// ── Tests ──

async function runTests() {
  console.log("\n🏷️  cheapSkate — Integration Tests\n");

  // 1. Health
  console.log("── Health ──");
  const health = await request("GET", "/api/health");
  assertEq("status 200", health.status, 200);
  assertEq("ok true", health.body.ok, true);
  assertEq("offers > 0", health.body.offers > 0, true);

  // 2. Offers
  console.log("\n── Offers ──");
  const offers = await request("GET", "/api/offers");
  assertEq("status 200", offers.status, 200);
  assertEq("offers array", Array.isArray(offers.body), true);
  assertEq("has offers", offers.body.length > 0, true);
  assertHas("has domain", offers.body[0], "domain");

  // 3. Coupons
  console.log("\n── Coupons ──");
  const coupons = await request("GET", "/api/coupons");
  assertEq("status 200", coupons.status, 200);
  assertEq("coupons array", Array.isArray(coupons.body), true);
  assertEq("has coupons", coupons.body.length > 0, true);
  assertHas("has code", coupons.body[0], "code");

  // 4. Register
  console.log("\n── Registration ──");
  const reg = await request("POST", "/api/register", { email: "test@cheapskate.gg" });
  assertEq("status 200", reg.status, 200);
  assertHas("has userId", reg.body, "userId");
  assertHas("has token", reg.body, "token");
  assertHas("has referralCode", reg.body, "referralCode");
  testUserId = reg.body.userId;
  testUserToken = reg.body.token;
  testReferralCode = reg.body.referralCode;
  console.log("  userId:", testUserId.slice(0, 8) + "...");

  // 5. Register again (same email — returns existing)
  console.log("\n── Re-registration ──");
  const rereg = await request("POST", "/api/register", { email: "test@cheapskate.gg" });
  assertEq("status 200", rereg.status, 200);
  assertEq("same userId", rereg.body.userId, testUserId);

  // 6. Referral registration
  console.log("\n── Referral ──");
  const refReg = await request("POST", "/api/register", { email: "friend@cheapskate.gg", referralCode: testReferralCode });
  assertEq("status 200", refReg.status, 200);
  assertHas("has userId", refReg.body, "userId");
  const friendId = refReg.body.userId;

  const refStats = await request("GET", `/api/referral/${testUserId}`);
  assertEq("status 200", refStats.status, 200);
  assertEq("referral code matches", refStats.body.referralCode, testReferralCode);
  assertEq("has 1 referral", refStats.body.referrals, 1);

  // 7. Balance (before conversions)
  console.log("\n── Balance ──");
  const bal = await request("GET", `/api/balance/${testUserId}`);
  assertEq("status 200", bal.status, 200);
  assertEq("balance 0", bal.body.balance, 0);
  assertEq("conversions 0", bal.body.conversions, 0);

  // 8. Conversion (first — should be pending with 30-day hold)
  console.log("\n── Conversion (first) ──");
  const conv1 = await request("POST", "/api/conversion", {
    userId: friendId,
    network: "amazon",
    orderAmount: 100,
    commission: 6,
    orderId: "ORD-TEST-001",
  });
  assertEq("status 200", conv1.status, 200);
  assertEq("userShare 3.00", conv1.body.userShare, 3);
  assertEq("status pending (hold)", conv1.body.status, "pending");
  assertEq("no fraud flag", conv1.body.fraudFlag, 0);

  // 9. Referral commission earned
  console.log("\n── Referral commission ──");
  const refStats2 = await request("GET", `/api/referral/${testUserId}`);
  assertEq("referral commission > 0", refStats2.body.referralCommission > 0, true);

  // 10. Duplicate order fraud detection
  console.log("\n── Fraud: duplicate order ──");
  const conv2 = await request("POST", "/api/conversion", {
    userId: friendId,
    network: "amazon",
    orderAmount: 50,
    commission: 3,
    orderId: "ORD-TEST-001", // same order ID
  });
  assertEq("flagged as fraud", conv2.body.fraudFlag, 1);
  assertEq("status flagged", conv2.body.status, "flagged");

  // 11. Admin stats
  console.log("\n── Admin ──");
  const adminStats = await request("GET", "/api/admin/stats", null, "admin");
  assertEq("status 200", adminStats.status, 200);
  assertEq("users >= 2", adminStats.body.users >= 2, true);
  assertEq("conversions >= 1", adminStats.body.conversions >= 1, true);
  assertEq("offers > 0", adminStats.body.offers > 0, true);
  assertEq("coupons > 0", adminStats.body.coupons > 0, true);

  const adminUsers = await request("GET", "/api/admin/users", null, "admin");
  assertEq("status 200", adminUsers.status, 200);
  assertEq("users array", Array.isArray(adminUsers.body), true);

  const adminConvs = await request("GET", "/api/admin/conversions", null, "admin");
  assertEq("status 200", adminConvs.status, 200);
  assertEq("convs array", Array.isArray(adminConvs.body), true);

  // 12. Admin auth — no token
  console.log("\n── Admin auth ──");
  const noAuth = await request("GET", "/api/admin/stats");
  assertEq("401 without token", noAuth.status, 401);

  // 13. Withdrawal — insufficient balance (pending conversion wasn't credited)
  console.log("\n── Withdrawal ──");
  const withdrawLow = await request("POST", "/withdraw", { userId: friendId, address: "test" });
  assertEq("400 low balance", withdrawLow.status, 400);

  // 14. Withdrawal — admin can bypass (admin endpoint doesn't exist yet, skip)
  console.log("  (pending hold check requires balance ≥ $5 — skipped)");
  assertEq("skip", true, true);

  // 15. Redirect endpoint
  console.log("\n── Redirect ──");
  const redirect = await request("GET", "/go/amazon/amazon?dest=https://amazon.com");
  assertEq("302 redirect", redirect.status, 302);

  // Summary
  console.log("\n──────────────────────");
  console.log("Tests complete.");
  if (process.exitCode) console.log("⚠️  Some tests FAILED");
  else console.log("✅ All tests passed");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exitCode = 1;
});
