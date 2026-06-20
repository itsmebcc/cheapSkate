// cheapSkate — Background Service Worker
// Handles: offer DB sync, redirect orchestration, conversion tracking, storage

const API_BASE = "http://localhost:3001";
const SYNC_INTERVAL_MINUTES = 30;

// ───────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  await syncOffers();
  chrome.alarms.create("syncOffers", { periodInMinutes: SYNC_INTERVAL_MINUTES });

  if (details.reason === "install") {
    // Open onboarding on first install
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  } else if (details.reason === "update") {
    // Show changelog on update
    const prevVersion = details.previousVersion;
    const changelog = getChangelogSince(prevVersion);
    if (changelog) {
      chrome.tabs.create({
        url: chrome.runtime.getURL("onboarding.html") + `?update=${encodeURIComponent(changelog)}`,
      });
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncOffers") syncOffers();
});

// ───────────────────────────────────────────────────────────
// Keyboard commands
// ───────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "apply-offer") {
    // Find the active tab and send a message to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "APPLY_OFFER" });
      }
    });
  }
  if (command === "open-settings") {
    chrome.runtime.openOptionsPage?.() || chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
});

// ───────────────────────────────────────────────────────────
// Changelog for update notifications
// ───────────────────────────────────────────────────────────

function getChangelogSince(prevVersion) {
  const versions = [
    { v: "1.0.0", title: "🚀 Initial release", items: [
      "Cashback popup at checkout",
      "Coupon auto-application (63 codes across 32 stores)",
      "User registration & balance tracking",
      "Referral system (10% commission)",
      "Fraud detection (payout holds, duplicate orders)",
      "Keyboard shortcuts (Alt+Shift+C / Alt+Shift+S)",
      "Admin dashboard with withdrawal approvals",
      "Firefox support",
      "Settings: toggle, cooldown, popup control",
    ]},
  ];

  const entries = versions.filter((v) => v.v !== prevVersion && v.v !== "1.0.0");
  // For now, just show the latest version's changelog
  const latest = versions[versions.length - 1];
  if (latest.v !== prevVersion) {
    return `**${latest.title}**\\n${latest.items.map((i) => `• ${i}`).join("\\n")}`;
  }
  return null;
}

// ───────────────────────────────────────────────────────────
// Offer Sync
// ───────────────────────────────────────────────────────────

async function syncOffers() {
  try {
    const [offersRes, couponsRes] = await Promise.all([
      fetch(`${API_BASE}/api/offers`),
      fetch(`${API_BASE}/api/coupons`),
    ]);
    if (!offersRes.ok) throw new Error(`Offers HTTP ${offersRes.status}`);
    if (!couponsRes.ok) throw new Error(`Coupons HTTP ${couponsRes.status}`);
    const offers = await offersRes.json();
    const coupons = await couponsRes.json();
    await chrome.storage.local.set({ offers, coupons, lastSync: Date.now() });
    // Reset retry counter on success
    await chrome.storage.local.set({ syncRetryCount: 0 });
    console.log(`[cheapSkate] Synced ${offers.length} offers, ${coupons.length} coupons`);
  } catch (err) {
    console.warn("[cheapSkate] Sync failed:", err.message);
    // Exponential backoff: 30s, 60s, 120s, 240s... up to 30 min
    const data = await chrome.storage.local.get("syncRetryCount");
    const retries = (data.syncRetryCount || 0) + 1;
    const delay = Math.min(30000 * Math.pow(2, retries - 1), 1800000);
    await chrome.storage.local.set({ syncRetryCount: retries });
    console.log(`[cheapSkate] Retry ${retries} in ${Math.round(delay / 1000)}s`);
    setTimeout(() => syncOffers(), delay);
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
    case "GET_COUPONS_FOR_DOMAIN":
      getCouponsForDomain(msg.domain).then(sendResponse);
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

async function getCouponsForDomain(domain) {
  const data = await chrome.storage.local.get("coupons");
  const coupons = data.coupons || [];
  return coupons.filter((c) => domain.includes(c.domain) || c.domain.includes(domain));
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
