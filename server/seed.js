// cheapSkate — Seed Script
// Populates the database with sample affiliate offers for testing

import { getDb } from "./db.js";

const OFFERS = [
  // Amazon
  { network: "amazon", merchantName: "Amazon", merchantId: "amazon", domain: "amazon.com",
    landingUrl: "https://www.amazon.com", discount: "Up to 10% cashback",
    description: "Earn cashback on everything at Amazon", commissionPct: 0.06, cookieWindow: 24 },

  { network: "amazon", merchantName: "Amazon Music", merchantId: "amazon", domain: "amazon.com",
    landingUrl: "https://www.amazon.com/music", discount: "5% cashback on music",
    description: "Cashback on Amazon Music purchases", commissionPct: 0.05, cookieWindow: 24 },

  // eBay
  { network: "ebay", merchantName: "eBay", merchantId: "ebay", domain: "ebay.com",
    landingUrl: "https://www.ebay.com", discount: "Up to 6% cashback",
    description: "Cashback on all eBay purchases", commissionPct: 0.06, cookieWindow: 30 },

  // Nike (on CJ/ShareASale)
  { network: "cj", merchantName: "Nike", merchantId: "nike", domain: "nike.com",
    landingUrl: "https://www.nike.com", discount: "5% cashback",
    description: "Cashback on Nike orders", commissionPct: 0.05, cookieWindow: 30 },

  // Best Buy
  { network: "shareasale", merchantName: "Best Buy", merchantId: "bestbuy", domain: "bestbuy.com",
    landingUrl: "https://www.bestbuy.com", discount: "2-4% cashback",
    description: "Cashback on electronics at Best Buy", commissionPct: 0.04, cookieWindow: 30 },

  // Walmart
  { network: "cj", merchantName: "Walmart", merchantId: "walmart", domain: "walmart.com",
    landingUrl: "https://www.walmart.com", discount: "2% cashback",
    description: "Cashback on everything at Walmart", commissionPct: 0.02, cookieWindow: 30 },

  // Target
  { network: "shareasale", merchantName: "Target", merchantId: "target", domain: "target.com",
    landingUrl: "https://www.target.com", discount: "1-5% cashback",
    description: "Cashback at Target", commissionPct: 0.03, cookieWindow: 30 },

  // Home Depot
  { network: "cj", merchantName: "Home Depot", merchantId: "homedepot", domain: "homedepot.com",
    landingUrl: "https://www.homedepot.com", discount: "2% cashback",
    description: "Cashback on home improvement", commissionPct: 0.02, cookieWindow: 30 },

  // Lowe's
  { network: "shareasale", merchantName: "Lowe's", merchantId: "lowes", domain: "lowes.com",
    landingUrl: "https://www.lowes.com", discount: "2% cashback",
    description: "Cashback at Lowe's", commissionPct: 0.02, cookieWindow: 30 },

  // Dell
  { network: "cj", merchantName: "Dell", merchantId: "dell", domain: "dell.com",
    landingUrl: "https://www.dell.com", discount: "2-6% cashback",
    description: "Cashback on Dell computers and accessories", commissionPct: 0.04, cookieWindow: 30 },

  // Apple (usually low commission)
  { network: "cj", merchantName: "Apple", merchantId: "apple", domain: "apple.com",
    landingUrl: "https://www.apple.com", discount: "1% cashback",
    description: "Cashback on Apple products", commissionPct: 0.01, cookieWindow: 30 },

  // Hotels / Travel
  { network: "shareasale", merchantName: "Booking.com", merchantId: "booking", domain: "booking.com",
    landingUrl: "https://www.booking.com", discount: "2-5% cashback",
    description: "Cashback on hotel bookings", commissionPct: 0.04, cookieWindow: 30 },

  { network: "cj", merchantName: "Expedia", merchantId: "expedia", domain: "expedia.com",
    landingUrl: "https://www.expedia.com", discount: "2% cashback",
    description: "Cashback on travel bookings", commissionPct: 0.02, cookieWindow: 30 },

  // Food delivery
  { network: "shareasale", merchantName: "DoorDash", merchantId: "doordash", domain: "doordash.com",
    landingUrl: "https://www.doordash.com", discount: "3% cashback",
    description: "Cashback on DoorDash orders", commissionPct: 0.03, cookieWindow: 30 },

  { network: "cj", merchantName: "Uber Eats", merchantId: "ubereats", domain: "ubereats.com",
    landingUrl: "https://www.ubereats.com", discount: "3% cashback",
    description: "Cashback on Uber Eats orders", commissionPct: 0.03, cookieWindow: 30 },

  // Subscription services
  { network: "shareasale", merchantName: "NordVPN", merchantId: "nordvpn", domain: "nordvpn.com",
    landingUrl: "https://nordvpn.com", discount: "20% off + cashback",
    description: "Cashback on NordVPN subscriptions", commissionPct: 0.15, cookieWindow: 30 },

  { network: "cj", merchantName: "Skillshare", merchantId: "skillshare", domain: "skillshare.com",
    landingUrl: "https://skillshare.com", discount: "Cashback on membership",
    description: "Cashback on Skillshare subscriptions", commissionPct: 0.10, cookieWindow: 30 },
];

async function seed() {
  const db = getDb();

  // Clear existing
  db.prepare("DELETE FROM offers").run();

  const stmt = db.prepare(
    "INSERT INTO offers (network, merchant_name, merchant_id, domain, landing_url, discount, description, commission_pct, cookie_window) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (const o of OFFERS) {
    stmt.run(o.network, o.merchantName, o.merchantId, o.domain, o.landingUrl, o.discount, o.description, o.commissionPct, o.cookieWindow);
  }

  console.log(`[cheapSkate] Seeded ${OFFERS.length} offers`);
}

seed().catch(console.error);
