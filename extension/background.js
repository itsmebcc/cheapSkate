// cheapSkate — Background Service Worker
// Handles: offer DB sync, redirect orchestration, conversion tracking, storage

const API_BASE = "http://localhost:3001";
const SYNC_INTERVAL_MINUTES = 30;

// ───────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await syncOffers();
  chrome.alarms.create("syncOffers", { periodInMinutes: SYNC_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncOffers") syncOffers();
});

// ───────────────────────────────────────────────────────────
// Offer Sync
// ───────────────────────────────────────────────────────────

async function syncOffers() {
  try {
    const res = await fetch(`${API_BASE}/api/offers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const offers = await res.json();
    await chrome.storage.local.set({ offers, lastSync: Date.now() });
    console.log(`[cheapSkate] Synced ${offers.length} offers`);
  } catch (err) {
    console.warn("[cheapSkate] Sync failed:", err.message);
  }
}

// ───────────────────────────────────────────────────────────
// Redirect Orchestration
// ───────────────────────────────────────────────────────────

// Content script sends messages when user clicks the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "REDIRECT":
      handleRedirect(msg.offer, msg.userId);
      break;
    case "CONVERSION":
      handleConversion(msg.orderData, msg.userId);
      break;
    case "GET_BALANCE":
      getBalance(msg.userId).then(sendResponse);
      return true; // keep channel open for async response
    case "GET_OFFERS_FOR_DOMAIN":
      getOffersForDomain(msg.domain).then(sendResponse);
      return true;
  }
});

async function handleRedirect(offer, userId) {
  // Build the affiliate link and open a new tab
  const affiliateUrl = buildAffiliateUrl(offer, userId);
  chrome.tabs.create({ url: affiliateUrl, active: true });
}

function buildAffiliateUrl(offer, userId) {
  // For MVP: redirect through our domain, which then redirects to merchant
  // Real: use affiliate network's deep-link API
  return `${API_BASE}/go/${offer.network}/${offer.merchantId}?ref=${userId}&dest=${encodeURIComponent(offer.landingUrl)}`;
}

async function handleConversion(orderData, userId) {
  try {
    const res = await fetch(`${API_BASE}/api/conversion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...orderData }),
    });
    if (res.ok) {
      // Update local balance
      const { commission, userShare } = await res.json();
      const balance = await chrome.storage.local.get("balance");
      const newBalance = (balance.balance || 0) + userShare;
      await chrome.storage.local.set({ balance: newBalance });
    }
  } catch (err) {
    console.warn("[cheapSkate] Conversion report failed:", err.message);
  }
}

async function getBalance(userId) {
  const balance = await chrome.storage.local.get("balance");
  return balance.balance || 0;
}

async function getOffersForDomain(domain) {
  const data = await chrome.storage.local.get("offers");
  const offers = data.offers || [];
  return offers.filter((o) => domain.includes(o.domain) || o.domain.includes(domain));
}

// ───────────────────────────────────────────────────────────
// User registration (called from popup)
// ───────────────────────────────────────────────────────────

async function registerOrLogin(userId) {
  // For MVP: userId is a UUID generated on first launch
  // Stored locally in chrome.storage
  let { userId: storedId } = await chrome.storage.local.get("userId");
  if (!storedId) {
    storedId = crypto.randomUUID();
    await chrome.storage.local.set({ userId: storedId });
  }
  return storedId;
}

export {
  syncOffers,
  handleRedirect,
  handleConversion,
  getBalance,
  registerOrLogin,
};
