// ─────────────────────────────────────────────────────────
// TrueSpend Mobile mockup — minimal interactions
// ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Category chips (Target/Walmart) — switch the recommendation hero
  document.querySelectorAll("[data-chip-group]").forEach(group => {
    const chips = group.querySelectorAll(".chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");

        const groupId = group.dataset.chipGroup;
        const cat = chip.dataset.category;
        const hero = document.querySelector(`[data-rec-hero="${groupId}"]`);
        if (!hero) return;

        const recs = {
          groceries:   { card: "Amex Gold",            num: "•• 1903", earn: "$6.00", note: "4× points on groceries",      cls: "warm" },
          electronics: { card: "Chase Sapphire",       num: "•• 4821", earn: "$1.50", note: "2× on Best Buy purchases",    cls: "" },
          clothing:    { card: "Chase Freedom Flex",   num: "•• 7740", earn: "$7.50", note: "5× this quarter (rotating)",  cls: "cool" },
          home:        { card: "Bank of America Cash", num: "•• 2210", earn: "$3.00", note: "3% choose-category bonus",    cls: "dark" },
          beauty:      { card: "Capital One Savor",    num: "•• 9988", earn: "$3.00", note: "3% on entertainment & dining",cls: "cool" },
          dining:      { card: "Amex Gold",            num: "•• 1903", earn: "$6.00", note: "4× points on dining",         cls: "warm" },
        };
        const r = recs[cat] || recs.electronics;
        hero.className = "rec-hero " + r.cls;
        hero.dataset.recHero = groupId;
        hero.querySelector(".rec-title").textContent  = "Use " + r.card;
        hero.querySelector(".rec-sub").textContent    = r.note;
        hero.querySelector(".earn-amount").textContent = r.earn;
        hero.querySelector(".card-num").textContent    = r.num;
      });
    });
  });

  // Switches
  document.querySelectorAll(".switch").forEach(sw => {
    sw.addEventListener("click", (e) => {
      e.stopPropagation();
      sw.classList.toggle("on");
    });
  });

  // Permission dialog dismiss
  document.querySelectorAll("[data-dismiss]").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".permission-overlay")?.classList.add("hidden");
    });
  });

  // Bottom tab switching within a phone (visual only)
  document.querySelectorAll(".tab-bar").forEach(bar => {
    const items = bar.querySelectorAll(".tab-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  });

  // Segmented controls (each .segmented is independent)
  document.querySelectorAll(".segmented").forEach(seg => {
    const items = seg.querySelectorAll(".seg");
    items.forEach(item => {
      item.addEventListener("click", () => {
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  });

  // Single-select chip rows that aren't part of [data-chip-group]
  document.querySelectorAll(".chip-row:not([data-chip-group])").forEach(row => {
    const chips = row.querySelectorAll(".chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
  });

  // FAB hover pulse — visual cue only
  document.querySelectorAll(".fab").forEach(fab => {
    fab.addEventListener("click", () => {
      fab.style.transform = "scale(0.92)";
      setTimeout(() => (fab.style.transform = ""), 120);
    });
  });

  // Camera shutter animation
  document.querySelectorAll(".cam-shutter").forEach(sh => {
    sh.addEventListener("click", () => {
      sh.style.transform = "scale(0.85)";
      sh.style.background = "hsl(218 91% 59%)";
      setTimeout(() => {
        sh.style.transform = "";
        sh.style.background = "white";
      }, 180);
    });
  });
});
