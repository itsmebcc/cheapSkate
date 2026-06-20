// cheapSkate — Extension Popup Script
// Dashboard + Settings views

const API_BASE = "http://localhost:3001";

// ───────────────────────────────────────────────────────────
// Init
// ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get(["userId", "balance", "conversions", "settings"]);
  const userId = data.userId;
  const settings = data.settings || {};

  if (userId) {
    showDashboard(data);
  } else {
    document.getElementById("register-screen").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("register-btn").onclick = handleRegistration;
  }

  // Offer count
  const offers = await chrome.storage.local.get("offers");
  document.getElementById("offer-count").textContent = (offers.offers || []).length;

  // Navigation
  document.getElementById("nav-settings").onclick = () => showSettingsView(data);
  document.getElementById("nav-dashboard").onclick = () => showDashboard(data);
});

// ───────────────────────────────────────────────────────────
// Dashboard
// ───────────────────────────────────────────────────────────

async function showDashboard(data) {
  document.getElementById("register-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("dashboard-view").classList.remove("hidden");
  document.getElementById("settings-view").classList.add("hidden");

  document.getElementById("nav-dashboard").className = "active";
  document.getElementById("nav-settings").className = "";

  const balance = data.balance || 0;
  document.getElementById("balance-display").textContent = `$${balance.toFixed(2)}`;
  document.getElementById("conversion-count").textContent = data.conversions || 0;

  document.getElementById("withdraw-btn").onclick = () => {
    chrome.tabs.create({ url: `${API_BASE}/withdraw?userId=${data.userId}` });
  };
}

// ───────────────────────────────────────────────────────────
// Settings
// ───────────────────────────────────────────────────────────

async function showSettingsView(data) {
  document.getElementById("dashboard-view").classList.add("hidden");
  document.getElementById("settings-view").classList.remove("hidden");

  document.getElementById("nav-dashboard").className = "";
  document.getElementById("nav-settings").className = "active";

  const settings = await chrome.storage.local.get("settings");
  const s = settings.settings || {};

  // Toggle: enabled
  const toggleEnabled = document.getElementById("toggle-enabled");
  if (s.enabled !== false) toggleEnabled.classList.add("on");
  toggleEnabled.onclick = () => {
    const now = toggleEnabled.classList.toggle("on");
    saveSettings({ enabled: now });
  };

  // Toggle: popup
  const togglePopup = document.getElementById("toggle-popup");
  if (s.showPopup !== false) togglePopup.classList.add("on");
  togglePopup.onclick = () => {
    const now = togglePopup.classList.toggle("on");
    saveSettings({ showPopup: now });
  };

  // Cooldown
  const cooldownSelect = document.getElementById("cooldown-select");
  cooldownSelect.value = s.cooldownHours || 24;
  cooldownSelect.onchange = () => {
    saveSettings({ cooldownHours: parseInt(cooldownSelect.value) });
  };

  // User ID
  document.getElementById("user-id-display").textContent = data.userId || "—";

  // Referral link
  document.getElementById("referral-btn").onclick = () => {
    if (data.userId) {
      const refUrl = `${API_BASE}/ref/${data.userId}`;
      navigator.clipboard.writeText(refUrl).then(() => {
        alert("Referral link copied: " + refUrl);
      });
    }
  };
}

async function saveSettings(update) {
  const data = await chrome.storage.local.get("settings");
  const settings = data.settings || {};
  Object.assign(settings, update);
  await chrome.storage.local.set({ settings });
}

// ───────────────────────────────────────────────────────────
// Registration
// ───────────────────────────────────────────────────────────

async function handleRegistration() {
  const email = document.getElementById("email-input").value.trim();
  if (!email) return alert("Please enter an email");

  try {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const { userId, token } = await res.json();
    await chrome.storage.local.set({ userId, token, email, balance: 0, conversions: 0 });
    showDashboard({ userId, balance: 0, conversions: 0 });
  } catch (err) {
    alert("Registration failed: " + err.message);
  }
}
