// cheapSkate — Shared Constants
// Used by both the extension and server

export const APP_NAME = "cheapSkate";
export const VERSION = "1.0.0";

// User gets 50% of commission
export const USER_SPLIT_PERCENT = 0.5;

// Minimum withdrawal amount
export const MIN_WITHDRAWAL = 5.00;

// How often the extension syncs offers from the server
export const SYNC_INTERVAL_MINUTES = 30;

// Cookie window override — we drop cookie at checkout, so we want fresh cookies
export const RECOMMENDED_COOKIE_WINDOW_HOURS = 24;

// Default API server
export const API_BASE = "http://localhost:3001";

// Checkout URL patterns
export const CHECKOUT_PATTERNS = [
  "/checkout/",
  "/cart/",
  "/secure/checkout/",
  "/order-received/",
  "/thankyou/",
  "/order-confirmation/",
  "/order-complete/",
  "/on/demandware.store/",
];

// Known affiliate cookie names (for detecting competitor extensions)
export const KNOWN_AFFILIATE_COOKIES = {
  "_au_": "Amazon Associates",
  "_ce_s": "CJ (Commission Junction)",
  "_sa_": "ShareASale",
  "_ga_": "Google Analytics (affiliate)",
  "_aff_": "Generic affiliate",
  "__cf_": "Partnerize",
  "aws_aff": "Amazon Web Services",
  "ebay_aff": "eBay Partner Network",
};

// Supported affiliate networks (MVP)
export const SUPPORTED_NETWORKS = [
  "amazon",
  "cj",
  "shareasale",
  "ebay",
  "partnerize",
  "avantlink",
];
