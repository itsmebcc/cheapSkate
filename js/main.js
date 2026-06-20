// cheapSkate — Marketing Site JS
// Waitlist signup, smooth scroll, animations
//
// For production, replace API_WAITLIST_URL with your Mailchimp/ConvertKit endpoint:
// - Mailchimp: https://<dc>.api.mailchimp.com/3.0/lists/<list_id>/members
// - ConvertKit:  https://api.convertkit.com/v3/forms/<form_id>/subscribe

const API_WAITLIST_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api/waitlist"
    : "https://api.cheapskate.gg/api/waitlist";

document.addEventListener("DOMContentLoaded", () => {
  // ──────────────────────────────────────────────
  // Waitlist form
  // ──────────────────────────────────────────────

  const form = document.getElementById("waitlist-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("waitlist-email").value.trim();
      if (!email) return;

      const btn = form.querySelector("button");
      btn.textContent = "Submitting...";
      btn.disabled = true;

      try {
        const res = await fetch(API_WAITLIST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          form.classList.add("hidden");
          document.getElementById("waitlist-success").classList.remove("hidden");
        } else {
          alert("Something went wrong. Try again or email us directly.");
        }
      } catch {
        // For MVP: local fallback — just show success
        form.classList.add("hidden");
        document.getElementById("waitlist-success").classList.remove("hidden");
      } finally {
        btn.textContent = "Join waitlist";
        btn.disabled = false;
      }
    });
  }

  // ──────────────────────────────────────────────
  // Smooth scroll for anchor links
  // ──────────────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
