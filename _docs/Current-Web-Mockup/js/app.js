// ──────────────────────────────────────────────────────────
// TrueSpend mockup — shared JS
// Mounts the top nav + footer, marks the active link, wires
// modals and tiny interactions.
// ──────────────────────────────────────────────────────────

(function () {
  const PAGES = {
    public: [
      { href: "index.html#how-it-works", label: "How It Works" },
      { href: "index.html#features",     label: "Features" },
      { href: "index.html#privacy",      label: "Privacy" },
      { href: "about.html",              label: "About" },
    ],
    app: [
      { href: "dashboard.html",    label: "Dashboard" },
      { href: "screens.html",      label: "Screens" },
      { href: "transactions.html", label: "Transactions" },
      { href: "budgets.html",      label: "Budgets" },
      { href: "credit-cards.html", label: "Cards" },
      { href: "insights.html",     label: "Insights" },
      { href: "location.html",     label: "Location" },
      { href: "favorites.html",    label: "Favorites" },
      { href: "settings.html",     label: "Settings" },
    ],
  };

  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  // "App" pages get the in-app top nav; everything else gets the marketing nav.
  const appPages = new Set([
    "dashboard.html","transactions.html","budgets.html","credit-cards.html",
    "insights.html","location.html","favorites.html","settings.html",
    "admin.html",
  ]);
  const isAppPage = appPages.has(here);

  function buildNav() {
    const links = isAppPage ? PAGES.app : PAGES.public;
    const right = isAppPage
      ? `
        <a href="settings.html" class="btn btn-ghost btn-sm" aria-label="Settings">⚙️</a>
        <div class="avatar" title="You">SR</div>
      `
      : `<a href="index.html#waitlist" class="btn btn-primary btn-sm">Join Waitlist</a>`;

    return `
      <header class="topnav">
        <div class="container topnav-inner">
          <a href="${isAppPage ? 'dashboard.html' : 'index.html'}" class="brand">
            <span class="brand-mark">T</span>
            <span>TrueSpend</span>
          </a>
          <nav class="nav-links">
            ${links.map(p => `
              <a href="${p.href}" class="${here === p.href.toLowerCase() ? 'active' : ''}">${p.label}</a>
            `).join("")}
          </nav>
          <div class="nav-cta">${right}</div>
        </div>
      </header>
    `;
  }

  function buildFooter() {
    return `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <div class="brand mb-2">
                <span class="brand-mark">T</span>
                <span>TrueSpend</span>
              </div>
              <p class="muted" style="font-size: .875rem; max-width: 280px;">
                AI-powered personal finance. Your data stays yours — encrypted, never sold.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <a href="features.html">Features</a>
              <a href="screens.html">Screens</a>
              <a href="pricing.html">Pricing</a>
              <a href="dashboard.html">Dashboard</a>
              <a href="insights.html">Insights</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="about.html">About</a>
              <a href="#">Careers</a>
              <a href="#">Brand</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
              <a href="#">Status</a>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© 2026 TrueSpend. All rights reserved.</span>
            <span>v0.1.0 · Mockup</span>
          </div>
        </div>
      </footer>
    `;
  }

  function mount() {
    const navHost = document.getElementById("nav-host");
    const footHost = document.getElementById("footer-host");
    if (navHost) navHost.innerHTML = buildNav();
    if (footHost) footHost.innerHTML = buildFooter();

    // Modal open/close
    document.querySelectorAll("[data-modal-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-modal-open");
        document.getElementById(id)?.classList.add("open");
      });
    });
    document.querySelectorAll("[data-modal-close]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".modal-overlay")?.classList.remove("open");
      });
    });
    document.querySelectorAll(".modal-overlay").forEach(o => {
      o.addEventListener("click", e => {
        if (e.target === o) o.classList.remove("open");
      });
    });

    // Tab buttons
    document.querySelectorAll("[data-tabs]").forEach(host => {
      const tabs = host.querySelectorAll("[data-tab]");
      const panels = document.querySelectorAll(`[data-tab-panel][data-tabs-group="${host.dataset.tabs}"]`);
      tabs.forEach(t => {
        t.addEventListener("click", () => {
          tabs.forEach(x => x.classList.remove("active"));
          panels.forEach(p => p.classList.add("hidden"));
          t.classList.add("active");
          const target = document.querySelector(`[data-tab-panel="${t.dataset.tab}"]`);
          target?.classList.remove("hidden");
        });
      });
    });

    // Screen inventory filter on screens.html
    document.querySelectorAll("[data-screen-filter]").forEach(filter => {
      const buttons = filter.querySelectorAll("[data-phase]");
      const cards = document.querySelectorAll(".screen-card[data-phase]");
      buttons.forEach(button => {
        button.addEventListener("click", () => {
          buttons.forEach(item => item.classList.remove("active"));
          button.classList.add("active");
          const phase = button.dataset.phase;
          cards.forEach(card => {
            card.classList.toggle("hidden", phase !== "all" && card.dataset.phase !== phase);
          });
        });
      });
    });

    document.querySelectorAll(".waitlist-form").forEach(form => {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const button = form.querySelector("button");
        if (!button) return;
        const original = button.textContent;
        button.textContent = "You're on the list";
        setTimeout(() => {
          button.textContent = original;
        }, 1800);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
