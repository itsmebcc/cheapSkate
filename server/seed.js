// cheapSkate — Seed Script
// Populates the database with sample affiliate offers + coupons for testing

import { getDb } from "./db.js";

const OFFERS = [
  // ── Retail ──
  { network: "amazon", merchantName: "Amazon", merchantId: "amazon", domain: "amazon.com",
    landingUrl: "https://www.amazon.com", discount: "Up to 10% cashback",
    description: "Earn cashback on everything at Amazon", commissionPct: 0.06, cookieWindow: 24 },
  { network: "ebay", merchantName: "eBay", merchantId: "ebay", domain: "ebay.com",
    landingUrl: "https://www.ebay.com", discount: "Up to 6% cashback",
    description: "Cashback on all eBay purchases", commissionPct: 0.06, cookieWindow: 30 },
  { network: "cj", merchantName: "Walmart", merchantId: "walmart", domain: "walmart.com",
    landingUrl: "https://www.walmart.com", discount: "2% cashback",
    description: "Cashback on everything at Walmart", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Target", merchantId: "target", domain: "target.com",
    landingUrl: "https://www.target.com", discount: "1-5% cashback",
    description: "Cashback at Target", commissionPct: 0.03, cookieWindow: 30 },

  // ── Apparel ──
  { network: "cj", merchantName: "Nike", merchantId: "nike", domain: "nike.com",
    landingUrl: "https://www.nike.com", discount: "5% cashback",
    description: "Cashback on Nike orders", commissionPct: 0.05, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Adidas", merchantId: "adidas", domain: "adidas.com",
    landingUrl: "https://www.adidas.com", discount: "4% cashback",
    description: "Cashback on Adidas footwear and apparel", commissionPct: 0.04, cookieWindow: 30 },
  { network: "cj", merchantName: "Gap", merchantId: "gap", domain: "gap.com",
    landingUrl: "https://www.gap.com", discount: "3% cashback",
    description: "Cashback at Gap and Gap brands", commissionPct: 0.03, cookieWindow: 30 },
  { network: "cj", merchantName: "Old Navy", merchantId: "oldnavy", domain: "oldnavy.com",
    landingUrl: "https://www.oldnavy.com", discount: "4% cashback",
    description: "Cashback at Old Navy", commissionPct: 0.04, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Macy's", merchantId: "macys", domain: "macys.com",
    landingUrl: "https://www.macys.com", discount: "3% cashback",
    description: "Cashback at Macy's", commissionPct: 0.03, cookieWindow: 30 },
  { network: "cj", merchantName: "Lululemon", merchantId: "lululemon", domain: "lululemon.com",
    landingUrl: "https://www.lululemon.com", discount: "3% cashback",
    description: "Cashback on Lululemon activewear", commissionPct: 0.03, cookieWindow: 30 },

  // ── Electronics ──
  { network: "shareasale", merchantName: "Best Buy", merchantId: "bestbuy", domain: "bestbuy.com",
    landingUrl: "https://www.bestbuy.com", discount: "2-4% cashback",
    description: "Cashback on electronics at Best Buy", commissionPct: 0.04, cookieWindow: 30 },
  { network: "cj", merchantName: "Dell", merchantId: "dell", domain: "dell.com",
    landingUrl: "https://www.dell.com", discount: "2-6% cashback",
    description: "Cashback on Dell computers and accessories", commissionPct: 0.04, cookieWindow: 30 },
  { network: "cj", merchantName: "Apple", merchantId: "apple", domain: "apple.com",
    landingUrl: "https://www.apple.com", discount: "1% cashback",
    description: "Cashback on Apple products", commissionPct: 0.01, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Samsung", merchantId: "samsung", domain: "samsung.com",
    landingUrl: "https://www.samsung.com", discount: "2% cashback",
    description: "Cashback on Samsung electronics", commissionPct: 0.02, cookieWindow: 30 },
  { network: "cj", merchantName: "HP", merchantId: "hp", domain: "hp.com",
    landingUrl: "https://www.hp.com", discount: "2-4% cashback",
    description: "Cashback on HP computers and printers", commissionPct: 0.03, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Lenovo", merchantId: "lenovo", domain: "lenovo.com",
    landingUrl: "https://www.lenovo.com", discount: "2-5% cashback",
    description: "Cashback on Lenovo laptops", commissionPct: 0.04, cookieWindow: 30 },

  // ── Home & Garden ──
  { network: "cj", merchantName: "Home Depot", merchantId: "homedepot", domain: "homedepot.com",
    landingUrl: "https://www.homedepot.com", discount: "2% cashback",
    description: "Cashback on home improvement", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Lowe's", merchantId: "lowes", domain: "lowes.com",
    landingUrl: "https://www.lowes.com", discount: "2% cashback",
    description: "Cashback at Lowe's", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Wayfair", merchantId: "wayfair", domain: "wayfair.com",
    landingUrl: "https://www.wayfair.com", discount: "2-5% cashback",
    description: "Cashback on furniture and home decor", commissionPct: 0.03, cookieWindow: 30 },

  // ── Travel ──
  { network: "shareasale", merchantName: "Booking.com", merchantId: "booking", domain: "booking.com",
    landingUrl: "https://www.booking.com", discount: "2-5% cashback",
    description: "Cashback on hotel bookings", commissionPct: 0.04, cookieWindow: 30 },
  { network: "cj", merchantName: "Expedia", merchantId: "expedia", domain: "expedia.com",
    landingUrl: "https://www.expedia.com", discount: "2% cashback",
    description: "Cashback on travel bookings", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Hotels.com", merchantId: "hotels", domain: "hotels.com",
    landingUrl: "https://www.hotels.com", discount: "2-4% cashback",
    description: "Cashback on hotel bookings", commissionPct: 0.03, cookieWindow: 30 },

  // ── Food & Delivery ──
  { network: "shareasale", merchantName: "DoorDash", merchantId: "doordash", domain: "doordash.com",
    landingUrl: "https://www.doordash.com", discount: "3% cashback",
    description: "Cashback on DoorDash orders", commissionPct: 0.03, cookieWindow: 30 },
  { network: "cj", merchantName: "Uber Eats", merchantId: "ubereats", domain: "ubereats.com",
    landingUrl: "https://www.ubereats.com", discount: "3% cashback",
    description: "Cashback on Uber Eats orders", commissionPct: 0.03, cookieWindow: 30 },
  { network: "shareasale", merchantName: "HelloFresh", merchantId: "hellofresh", domain: "hellofresh.com",
    landingUrl: "https://www.hellofresh.com", discount: "$10 off + cashback",
    description: "Cashback on HelloFresh meal kits", commissionPct: 0.08, cookieWindow: 30 },

  // ── Beauty & Personal Care ──
  { network: "shareasale", merchantName: "Sephora", merchantId: "sephora", domain: "sephora.com",
    landingUrl: "https://www.sephora.com", discount: "2% cashback",
    description: "Cashback on beauty products", commissionPct: 0.02, cookieWindow: 30 },

  // ── Office & Supplies ──
  { network: "shareasale", merchantName: "Staples", merchantId: "staples", domain: "staples.com",
    landingUrl: "https://www.staples.com", discount: "2% cashback",
    description: "Cashback on office supplies", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Zappos", merchantId: "zappos", domain: "zappos.com",
    landingUrl: "https://www.zappos.com", discount: "3% cashback",
    description: "Cashback on shoes and apparel", commissionPct: 0.03, cookieWindow: 30 },

  // ── Subscriptions ──
  { network: "shareasale", merchantName: "NordVPN", merchantId: "nordvpn", domain: "nordvpn.com",
    landingUrl: "https://nordvpn.com", discount: "20% off + cashback",
    description: "Cashback on NordVPN subscriptions", commissionPct: 0.15, cookieWindow: 30 },
  { network: "cj", merchantName: "Skillshare", merchantId: "skillshare", domain: "skillshare.com",
    landingUrl: "https://skillshare.com", discount: "Cashback on membership",
    description: "Cashback on Skillshare subscriptions", commissionPct: 0.10, cookieWindow: 30 },

  // ── Marketplaces ──
  { network: "shareasale", merchantName: "Groupon", merchantId: "groupon", domain: "groupon.com",
    landingUrl: "https://www.groupon.com", discount: "2% cashback",
    description: "Cashback on Groupon deals", commissionPct: 0.02, cookieWindow: 30 },
  { network: "shareasale", merchantName: "Etsy", merchantId: "etsy", domain: "etsy.com",
    landingUrl: "https://www.etsy.com", discount: "2% cashback",
    description: "Cashback on Etsy handmade goods", commissionPct: 0.02, cookieWindow: 30 },
];

const COUPONS = [
  // Amazon
  { domain: "amazon.com", code: "SAVE10", discount: "10% off", description: "Save 10% on select items" },
  { domain: "amazon.com", code: "FREE5", discount: "$5 off", description: "$5 off orders over $25" },
  { domain: "amazon.com", code: "20PRIME", discount: "20% off", description: "20% off for Prime members" },

  // Nike
  { domain: "nike.com", code: "NIKEFLASH", discount: "20% off", description: "Flash sale: 20% off full-price items" },
  { domain: "nike.com", code: "SAVE15", discount: "15% off", description: "15% off your order" },
  { domain: "nike.com", code: "NIKEMORE", discount: "$10 off", description: "$10 off orders over $100" },

  // Adidas
  { domain: "adidas.com", code: "ADIDAS20", discount: "20% off", description: "20% off your order" },
  { domain: "adidas.com", code: "FREE3STR", discount: "Free shipping", description: "Free shipping on orders over $50" },

  // Best Buy
  { domain: "bestbuy.com", code: "SAVE10", discount: "10% off", description: "10% off select electronics" },
  { domain: "bestbuy.com", code: "BB5OFF", discount: "$5 off", description: "$5 off orders over $50" },
  { domain: "bestbuy.com", code: "BB20", discount: "$20 off", description: "$20 off orders over $200" },

  // Walmart
  { domain: "walmart.com", code: "WALMART5", discount: "$5 off", description: "$5 off your order" },
  { domain: "walmart.com", code: "SAVE20", discount: "20% off", description: "20% off select items" },

  // Target
  { domain: "target.com", code: "TARGET10", discount: "10% off", description: "10% off your purchase" },
  { domain: "target.com", code: "CIRCLE5", discount: "$5 off", description: "$5 off orders over $50" },

  // eBay
  { domain: "ebay.com", code: "EBAY10", discount: "10% off", description: "10% off select items" },

  // Gap
  { domain: "gap.com", code: "GAP20", discount: "20% off", description: "20% off your order" },
  { domain: "gap.com", code: "GAPFREESHIP", discount: "Free shipping", description: "Free shipping on orders over $50" },

  // Old Navy
  { domain: "oldnavy.com", code: "OLD20", discount: "20% off", description: "20% off your order" },
  { domain: "oldnavy.com", code: "ONSAVE10", discount: "$10 off", description: "$10 off orders over $75" },

  // Macy's
  { domain: "macys.com", code: "MACYS20", discount: "20% off", description: "20% off select items" },
  { domain: "macys.com", code: "MACYFAM", discount: "15% off", description: "15% off for family members" },

  // Lululemon
  { domain: "lululemon.com", code: "LULU25", discount: "$25 off", description: "$25 off orders over $100" },

  // Home Depot
  { domain: "homedepot.com", code: "HD10", discount: "10% off", description: "10% off your order" },
  { domain: "homedepot.com", code: "HDSALE", discount: "$50 off", description: "$50 off orders over $500" },

  // Lowe's
  { domain: "lowes.com", code: "LOWES5", discount: "$5 off", description: "$5 off orders over $50" },
  { domain: "lowes.com", code: "LOWES10", discount: "10% off", description: "10% off select items" },

  // Dell
  { domain: "dell.com", code: "DELLSAVE", discount: "5% off", description: "5% off select computers" },
  { domain: "dell.com", code: "DELL10", discount: "10% off", description: "10% off accessories" },

  // Samsung
  { domain: "samsung.com", code: "SAMSUNG5", discount: "$5 off", description: "$5 off accessories" },
  { domain: "samsung.com", code: "SAMSUNG10", discount: "10% off", description: "10% off select TVs" },

  // HP
  { domain: "hp.com", code: "HP10", discount: "10% off", description: "10% off select computers" },
  { domain: "hp.com", code: "HPFREESHIP", discount: "Free shipping", description: "Free shipping on all orders" },

  // Lenovo
  { domain: "lenovo.com", code: "LENOVO5", discount: "5% off", description: "5% off laptops" },
  { domain: "lenovo.com", code: "LENOVO10", discount: "10% off", description: "10% off accessories" },

  // Wayfair
  { domain: "wayfair.com", code: "WAYFAIR10", discount: "10% off", description: "10% off your first order" },
  { domain: "wayfair.com", code: "WAY50", discount: "$50 off", description: "$50 off orders over $500" },

  // Booking.com
  { domain: "booking.com", code: "BOOK5", discount: "5% off", description: "5% off your booking" },
  { domain: "booking.com", code: "BOOK10", discount: "10% off", description: "10% off select hotels" },

  // Expedia
  { domain: "expedia.com", code: "EXP10", discount: "10% off", description: "10% off select hotels" },
  { domain: "expedia.com", code: "EXPSAVE", discount: "$25 off", description: "$25 off vacation packages" },

  // Hotels.com
  { domain: "hotels.com", code: "HOTEL5", discount: "5% off", description: "5% off your booking" },
  { domain: "hotels.com", code: "HOTEL10", discount: "10% off", description: "10% off select properties" },

  // DoorDash
  { domain: "doordash.com", code: "DASH15", discount: "$15 off", description: "$15 off first order" },
  { domain: "doordash.com", code: "DASH10", discount: "10% off", description: "10% off your order" },
  { domain: "doordash.com", code: "DASHFREE", discount: "Free delivery", description: "Free delivery on orders over $25" },

  // Uber Eats
  { domain: "ubereats.com", code: "UE10", discount: "$10 off", description: "$10 off first order" },
  { domain: "ubereats.com", code: "UEFREE", discount: "Free delivery", description: "Free delivery on orders over $15" },

  // HelloFresh
  { domain: "hellofresh.com", code: "HELLO10", discount: "$10 off", description: "$10 off first box" },
  { domain: "hellofresh.com", code: "HELLO20", discount: "20% off", description: "20% off second box" },

  // Sephora
  { domain: "sephora.com", code: "SEPHORA10", discount: "10% off", description: "10% off select items" },
  { domain: "sephora.com", code: "SEPHORA20", discount: "20% off", description: "20% off for Beauty Insider members" },

  // NordVPN
  { domain: "nordvpn.com", code: "NORD20", discount: "20% off", description: "20% off VPN subscription" },
  { domain: "nordvpn.com", code: "NORD30", discount: "30% off", description: "30% off 2-year plan" },

  // Skillshare
  { domain: "skillshare.com", code: "SKILL30", discount: "30 days free", description: "Free 30-day trial" },
  { domain: "skillshare.com", code: "SKILL50", discount: "50% off", description: "50% off annual membership" },

  // Groupon
  { domain: "groupon.com", code: "GROUPON10", discount: "10% off", description: "10% off select deals" },
  { domain: "groupon.com", code: "GROUPON20", discount: "20% off", description: "20% off local deals" },

  // Etsy
  { domain: "etsy.com", code: "ETSY10", discount: "10% off", description: "10% off select items" },
  { domain: "etsy.com", code: "ETSYFREE", discount: "Free shipping", description: "Free shipping on orders over $35" },

  // Staples
  { domain: "staples.com", code: "STAPLES10", discount: "10% off", description: "10% off office supplies" },

  // Zappos
  { domain: "zappos.com", code: "ZAPPOS5", discount: "$5 off", description: "$5 off shoes" },
  { domain: "zappos.com", code: "ZAPPOS10", discount: "10% off", description: "10% off select items" },
];

async function seed() {
  const db = getDb();

  // Clear existing
  db.prepare("DELETE FROM offers").run();
  db.prepare("DELETE FROM coupons").run();

  const stmt = db.prepare(
    "INSERT INTO offers (network, merchant_name, merchant_id, domain, landing_url, discount, description, commission_pct, cookie_window) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (const o of OFFERS) {
    stmt.run(o.network, o.merchantName, o.merchantId, o.domain, o.landingUrl, o.discount, o.description, o.commissionPct, o.cookieWindow);
  }

  const couponStmt = db.prepare(
    "INSERT INTO coupons (domain, code, discount, description) VALUES (?, ?, ?, ?)"
  );
  for (const c of COUPONS) {
    couponStmt.run(c.domain, c.code, c.discount, c.description);
  }

  // Seed Awin credentials for testing
  const existingNet = db.prepare("SELECT id FROM affiliate_networks WHERE name = 'awin'").get();
  if (!existingNet) {
    db.prepare("INSERT INTO affiliate_networks (name, api_key, publisher_id, active) VALUES (?, ?, ?, 1)")
      .run("awin", "8cd08e8b-1ca0-4867-9ebf-0ab8798209a5", "2942829");
    console.log("[cheapSkate] Awin credentials seeded");
  }

  console.log(`[cheapSkate] Seeded ${OFFERS.length} offers, ${COUPONS.length} coupons`);
}

seed().catch(console.error);
