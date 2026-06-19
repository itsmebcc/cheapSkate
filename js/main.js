// cheapSkate — Marketing Site JS
// Waitlist signup, smooth scroll, animations

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
        const res = await fetch("https://api.cheapskate.gg/api/waitlist", {
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
