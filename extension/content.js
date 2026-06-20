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

// Platform-specific DOM signals for checkout detection
const CHECKOUT_DOM_SIGNALS = [
  // Generic
  '.checkout',
  '#checkout',
  '.checkout-page',
  '.checkout-container',
  // Shopify
  '.cart__wrapper',
  '.cart-container',
  '.cart-content',
  '.cart-header',
  '#cart',
  '.shopify-section--cart',
  '.cart-form',
  // WooCommerce
  '.woocommerce-checkout',
  '.woocommerce-cart-form',
  '.woocommerce-checkout-review-order',
  '.checkout.woocommerce',
  '.woocommerce-order-received',
  // Magento
  '.checkout-cart',
  '.checkout-payment',
  '.checkout-method',
  '.opc-progress-bar',
  '.cart-summary',
  // BigCommerce
  '.checkout-content',
  '.checkout-page-content',
  '.cart-body',
  '.cart-links',
  // Salesforce Commerce
  '.cart-page',
  '.checkout-main',
  '.order-summary',
  '.payment-form',
];

// Product page signals — expanded
const PRODUCT_PAGE_SIGNALS = [
  // Generic add-to-cart
  '.add-to-cart', '#add-to-cart', '[data-add-to-cart]',
  '.add_to_cart', '#add_to_cart',
  '.product-details', '.product-page',
  '.buy-now', '#buy-now', '[data-buy-now]',
  '.price', '.product-price',
  // Platform-specific
  '.product-title',
  '.product-name',
  '.product-info',
  '.product-summary',
  '.product-description',
  // Shopify
  '.product__info',
  '.product__title',
  '.product-form',
  '.product-single',
  // WooCommerce
  '.product-summary',
  '.single-product',
  '.product-type-simple',
  '.product-type-variable',
  // Magento
  '.product-view',
  '.product-item-details',
  // Price indicators (present on product pages, not cart)
  '.price-wrapper',
  '.price-value',
  '.product-price',
  '.sale-price',
  '.regular-price',
];

// Coupon input field detection — covers Shopify, Magento, WooCommerce, BigCommerce, and generic
const COUPON_SELECTORS = [
  'input[placeholder*="coupon" i]',
  'input[placeholder*="discount" i]',
  'input[placeholder*="promo" i]',
  'input[placeholder*="gift card" i]',
  'input[placeholder*="voucher" i]',
  'input[id*="coupon" i]',
  'input[id*="discount" i]',
  'input[id*="promo" i]',
  'input[name*="coupon" i]',
  'input[name*="discount" i]',
  'input[name*="promo" i]',
  '#coupon',
  '#discount',
  '.coupon-input',
  '.discount-input',
  '.promo-input',
  '.coupon-code',
  'div.coupon input',
  'div.discount input',
  '[data-coupon] input',
  // WooCommerce specific
  '.woocommerce-form-coupon input[type="text"]',
  '#coupon_code',
  // Shopify specific
  '.discount-code-input',
  '#discount-input',
  '.input--coupon',
  // Magento specific
  '#coupon_code',
  '#discount-coupon-code',
  // BigCommerce specific
  '.coupon-form-input',
  '.promo-code-input',
];

// Coupon apply button detection
const APPLY_BUTTON_SELECTORS = [
  'button:contains("Apply")',
  'button:contains("apply")',
  'button:contains("Submit")',
  'button[id*="apply" i]',
  'button[id*="coupon" i]',
  'a:contains("Apply")',
  'button.coupon-apply',
  '#apply-coupon',
  '#coupon-button',
  '.coupon-form button',
  '.discount-form button',
  // WooCommerce
  '.woocommerce-form-coupon button[type="submit"]',
  // Shopify
  '.discount__button',
  '#discount-submit',
];

// ───────────────────────────────────────────────────────────
// Coupon auto-fill
// ───────────────────────────────────────────────────────────

async function autoApplyCoupon(domain, couponCode) {
  // Wait for the DOM to settle (coupon fields often render after page load)
  await delay(1500);

  const input = findCouponInput();
  if (!input) {
    console.log("[cheapSkate] No coupon input found on this page");
    return false;
  }

  // Fill the coupon code
  input.value = couponCode;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));

  // Find and click the apply button
  const applyBtn = findApplyButton(input);
  if (applyBtn) {
    applyBtn.click();
  } else {
    // No apply button — some platforms auto-validate on input
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", bubbles: true }));
  }

  // Show success notification
  showCouponNotification(couponCode);
  return true;
}

function findCouponInput() {
  for (const selector of COUPON_SELECTORS) {
    const el = document.querySelector(selector);
    if (el && el.tagName === "INPUT") return el;
  }
  return null;
}

function findApplyButton(input) {
  // Check near the input first
  const parent = input.closest("div, form, section");
  if (parent) {
    const btn = parent.querySelector("button[type='submit'], button, a");
    if (btn) return btn;
  }

  // Fall back to generic selectors
  for (const selector of APPLY_BUTTON_SELECTORS) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  return null;
}

function showCouponNotification(code) {
  const notif = document.createElement("div");
  notif.id = "cheapskate-coupon-notif";
  notif.innerHTML = `
    <span>🏷️ Coupon <strong>${code}</strong> applied via cheapSkate</span>
  `;
  const style = document.createElement("style");
  style.textContent = `
    #cheapskate-coupon-notif {
      position: fixed; top: 16px; right: 16px;
      background: #22c55e; color: #fff; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; font-weight: 500;
      z-index: 2147483647; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: cheapskate-slide 0.3s ease-out;
    }
    @keyframes cheapskate-slide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const COOLDOWN_PER_DOMAIN = 24 * 60 * 60 * 1000; // 24 hours

// ───────────────────────────────────────────────────────────
// State
// ───────────────────────────────────────────────────────────

let state = {
  userId: null,
  offers: [],
  coupons: [],
  shownDomains: new Set(),
  settings: {},
};

// ───────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────

async function init() {
  // Load userId and settings from storage
  chrome.storage.local.get(["userId", "offers", "coupons", "shownDomains", "settings"], (data) => {
    state.userId = data.userId || null;
    state.offers = data.offers || [];
    state.coupons = data.coupons || [];
    state.shownDomains = new Set(data.shownDomains || []);
    state.settings = data.settings || {};
  });

  // Listen for storage changes (background syncs offers here)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.offers) state.offers = changes.offers.newValue || [];
    if (changes.coupons) state.coupons = changes.coupons.newValue || [];
    if (changes.shownDomains) state.shownDomains = new Set(changes.shownDomains.newValue || []);
  });

  // Detect page type
  detectAndAct();

  // Listen for keyboard-triggered commands from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "APPLY_OFFER" && state.lastOffer && state.lastCoupon) {
      autoApplyCoupon(window.location.hostname, state.lastCoupon.code);
    }
  });
}

// ───────────────────────────────────────────────────────────
// Detection
// ───────────────────────────────────────────────────────────

function detectAndAct() {
  // Respect user settings
  if (state.settings.enabled === false) return;

  const url = window.location.href;
  const domain = window.location.hostname;
  const path = window.location.pathname;

  // Check URL patterns first (fast, no DOM query)
  const isCheckoutUrl = CHECKOUT_PATTERNS.some((p) => p.test(path) || p.test(url));

  // Then check DOM signals (covers platforms with non-standard URLs)
  const isCheckoutDom = CHECKOUT_DOM_SIGNALS.some((s) => document.querySelector(s));
  const isProduct = PRODUCT_PAGE_SIGNALS.some((s) => document.querySelector(s));

  const isCheckout = isCheckoutUrl || isCheckoutDom;

  if (isCheckout) {
    if (state.settings.showPopup === false) return;
    handleCheckoutPage(domain);
  } else if (isProduct) {
    handleProductPage(domain);
  }
}

// ───────────────────────────────────────────────────────────
// Checkout page — prime moment to pop up
// ───────────────────────────────────────────────────────────

async function handleCheckoutPage(domain) {
  // Respect cooldown setting (default 24h)
  const cooldownHours = state.settings.cooldownHours || 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const lastShown = state.shownDomains.lastShownTime?.[domain];
  if (lastShown && (Date.now() - lastShown) < cooldownMs) return;

  const offers = await getOffersForDomain(domain);
  const coupons = await getCouponsForDomain(domain);

  if (offers.length === 0) {
    // Check with background script for fresh offers
    chrome.runtime.sendMessage(
      { type: "GET_OFFERS_FOR_DOMAIN", domain },
      (offersFromBg) => {
        if (offersFromBg && offersFromBg.length > 0) {
          showPopup(offersFromBg[0], coupons, domain);
        }
      }
    );
    return;
  }

  showPopup(offers[0], coupons, domain);
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

function showPopup(bestOffer, coupons, domain) {
  // Store for keyboard shortcut reuse
  state.lastOffer = bestOffer;
  state.lastCoupon = coupons && coupons.length > 0 ? coupons[0] : null;
  // Mark shown with timestamp for cooldown tracking
  if (!state.shownDomains.lastShownTime) state.shownDomains.lastShownTime = {};
  state.shownDomains.lastShownTime[domain] = Date.now();
  chrome.storage.local.set({ shownDomains: state.shownDomains });

  // Find the first coupon code for this domain
  const coupon = coupons && coupons.length > 0 ? coupons[0] : null;

  const overlay = document.createElement("div");
  overlay.id = "cheapskate-overlay";
  overlay.innerHTML = `
    <div id="cheapskate-popup">
      <div id="cheapskate-close">&times;</div>
      <div id="cheapskate-brand">🏷️ cheapSkate</div>
      <div id="cheapskate-title">${coupon ? "Coupon + cashback found!" : "Deal found!"}</div>
      <div id="cheapskate-desc">
        ${coupon ? `Use code <strong>${coupon.code}</strong> — ${coupon.description || coupon.discount}` : (bestOffer.description || "Save on this purchase with an exclusive offer")}
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
    // Auto-apply coupon code if available
    if (coupon) {
      autoApplyCoupon(domain, coupon.code);
    }
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

async function getCouponsForDomain(domain) {
  return (state.coupons || []).filter(
    (c) => domain.includes(c.domain) || c.domain.includes(domain)
  );
}

// ───────────────────────────────────────────────────────────
// Boot
// ───────────────────────────────────────────────────────────

init();
