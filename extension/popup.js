// cheapSkate — Extension Popup Script

const API_BASE = "http://localhost:3001";

document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is registered
  const data = await chrome.storage.local.get(["userId", "balance", "conversions"]);
  const userId = data.userId;

  if (userId) {
    showDashboard(data);
  } else {
    document.getElementById("register-screen").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("register-btn").onclick = handleRegistration;
  }

  // Show offer count
  const offers = await chrome.storage.local.get("offers");
  document.getElementById("offer-count").textContent = (offers.offers || []).length;
});

async function showDashboard(data) {
  document.getElementById("register-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  const balance = data.balance || 0;
  document.getElementById("balance-display").textContent = `$${balance.toFixed(2)}`;
  document.getElementById("conversion-count").textContent = data.conversions || 0;

  document.getElementById("withdraw-btn").onclick = () => {
    // For MVP: redirect to withdrawal page
    chrome.tabs.create({ url: `${API_BASE}/withdraw?userId=${data.userId}` });
  };
}

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
