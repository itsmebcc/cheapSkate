// cheapSkate — Content Script
// Runs on every page. Detects checkout pages, shows offer popup overlay.

// ───────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────

const CHECKOUT_PATTERNS = [
  /\/checkout\//i,
  /\/cart\//i,
  /\/secure\/checkout\//i,
  /\/order-received\//i,
  /\/thankyou\//i,
  /\/order-confirmation\//i,
  /\/order-complete\//i,
  /\/on\/demandware\.store\//i,
  /\/(?:cart|basket|shopping-cart)/i,
];

const PRODUCT_PAGE_SIGNALS = [
  ".add-to-cart", "#add-to-cart", "[data-add-to-cart]",
  ".product-details", ".product-page",
  ".buy-now", "#buy-now", "[data-buy-now]",
  ".price", ".product-price",
];

const COOLDOWN_PER_DOMAIN = 24 * 60 * 60 * 1000; // 24 hours

// ───────────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────────

let state = {
  userId: null,
  offers: [],
  shownDomains: new Set(),
};

// ───────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────

async function init() {
  // Load userId from storage
  chrome.storage.local.get(["userId", "offers", "shownDomains"], (data) => {
    state.userId = data.userId || null;
    state.offers = data.offers || [];
    state.shownDomains = new Set(data.shownDomains || []);
  });

  // Listen for storage changes (background syncs offers here)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.offers) state.offers = changes.offers.newValue || [];
    if (changes.shownDomains) state.shownDomains = new Set(changes.shownDomains.newValue || []);
  });

  // Detect page type
  detectAndAct();
}

// ───────────────────────────────────────────────────────────
// Detection
// ───────────────────────────────────────────────────────────

function detectAndAct() {
  const url = window.location.href;
  const domain = window.location.hostname;
  const path = window.location.pathname;

  const isCheckout = CHECKOUT_PATTERNS.some((p) => p.test(path) || p.test(url));
  const isProduct = PRODUCT_PAGE_SIGNALS.some((s) => document.querySelector(s));

  if (isCheckout) {
    handleCheckoutPage(domain);
  } else if (isProduct) {
    handleProductPage(domain);
  }
}

// ───────────────────────────────────────────────────────────
// Checkout page — prime moment to pop up
// ───────────────────────────────────────────────────────────

async function handleCheckoutPage(domain) {
  // Don't spam if we already showed for this domain today
  if (state.shownDomains.has(domain)) return;

  const offers = await getOffersForDomain(domain);

  if (offers.length === 0) {
    // Check with background script for fresh offers
    chrome.runtime.sendMessage(
      { type: "GET_OFFERS_FOR_DOMAIN", domain },
      (offersFromBg) => {
        if (offersFromBg && offersFromBg.length > 0) {
          showPopup(offersFromBg[0], domain);
        }
      }
    );
    return;
  }

  showPopup(offers[0], domain);
}

// ───────────────────────────────────────────────────────────
// Product page — show subtle badge, not full popup
// ───────────────────────────────────────────────────────────

async function handleProductPage(domain) {
  const offers = await getOffersForDomain(domain);
  if (offers.length > 0) {
    injectBadge(offers[0]);
  }
}

// ───────────────────────────────────────────────────────────
// Popup Overlay
// ───────────────────────────────────────────────────────────

function showPopup(bestOffer, domain) {
  // Mark shown so we don't spam
  state.shownDomains.add(domain);
  chrome.storage.local.set({ shownDomains: [...state.shownDomains] });

  const overlay = document.createElement("div");
  overlay.id = "cheapskate-overlay";
  overlay.innerHTML = `
    <div id="cheapskate-popup">
      <div id="cheapskate-close">&times;</div>
      <div id="cheapskate-brand">🏷️ cheapSkate</div>
      <div id="cheapskate-title">Deal found!</div>
      <div id="cheapskate-desc">
        ${bestOffer.description || "Save on this purchase with an exclusive offer"}
      </div>
      <div id="cheapskate-value">
        <strong>${bestOffer.discount || "Cashback available"}</strong>
      </div>
      <button id="cheapskate-apply">Apply & Save 🎯</button>
      <button id="cheapskate-skip">No thanks</button>
    </div>
  `;

  // Styles
  const style = document.createElement("style");
  style.textContent = `
    #cheapskate-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4); z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #cheapskate-popup {
      background: #fff; border-radius: 16px; padding: 28px 32px;
      max-width: 380px; width: 90%; box-shadow: 0 12px 48px rgba(0,0,0,0.25);
      position: relative; text-align: center;
      animation: cheapskate-fade 0.25s ease-out;
    }
    @keyframes cheapskate-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    #cheapskate-close {
      position: absolute; top: 10px; right: 14px; cursor: pointer;
      font-size: 22px; color: #999; background: none; border: none;
    }
    #cheapskate-brand { font-size: 14px; color: #22c55e; margin-bottom: 8px; }
    #cheapskate-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    #cheapskate-desc { font-size: 14px; color: #555; margin-bottom: 10px; }
    #cheapskate-value { font-size: 18px; color: #16a34a; margin-bottom: 18px; }
    #cheapskate-apply {
      background: #22c55e; color: #fff; border: none; border-radius: 10px;
      padding: 10px 24px; font-size: 15px; font-weight: 600; cursor: pointer;
      margin-right: 8px; transition: background 0.15s;
    }
    #cheapskate-apply:hover { background: #16a34a; }
    #cheapskate-skip {
      background: #f0f0f0; color: #333; border: none; border-radius: 10px;
      padding: 10px 24px; font-size: 15px; cursor: pointer;
    }
    #cheapskate-skip:hover { background: #e0e0e0; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Events
  document.getElementById("cheapskate-close").onclick = () => overlay.remove();
  document.getElementById("cheapskate-skip").onclick = () => overlay.remove();
  document.getElementById("cheapskate-apply").onclick = () => {
    overlay.remove();
    chrome.runtime.sendMessage({
      type: "REDIRECT",
      offer: bestOffer,
      userId: state.userId,
    });
  };
}

// ───────────────────────────────────────────────────────────
// Subtle badge (for product pages, not checkout)
// ───────────────────────────────────────────────────────────

function injectBadge(offer) {
  const badge = document.createElement("div");
  badge.id = "cheapskate-badge";
  badge.innerHTML = `
    <span>🏷️ ${offer.discount || "Deal"} via cheapSkate</span>
  `;
  const style = document.createElement("style");
  style.textContent = `
    #cheapskate-badge {
      position: fixed; bottom: 16px; right: 16px;
      background: #22c55e; color: #fff; padding: 8px 14px;
      border-radius: 20px; font-size: 13px; font-weight: 500;
      cursor: pointer; z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: opacity 0.2s;
    }
    #cheapskate-badge:hover { opacity: 0.9; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(badge);

  badge.onclick = () => {
    badge.remove();
    chrome.runtime.sendMessage({
      type: "REDIRECT",
      offer,
      userId: state.userId,
    });
  };
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

async function getOffersForDomain(domain) {
  return (state.offers || []).filter(
    (o) => domain.includes(o.domain) || o.domain.includes(domain)
  );
}

// ───────────────────────────────────────────────────────────
// Boot
// ───────────────────────────────────────────────────────────

init();
