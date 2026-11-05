/* ==========================================================================
   Bay City High School – shared behaviour
   Works with style.css. Progressive enhancement: pages stay readable without JS.
   Sections: 1 Preferences · 2 Navigation · 3 Ticker · 4 Tabs · 5 Disclosures
             6 Carousels · 7 Dialogs · 8 Toggles · 9 Counters
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let uid = 0;
  const ensureId = (el, prefix) => {
    if (!el.id) el.id = `${prefix}-${++uid}`;
    return el.id;
  };
  const store = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        /* storage unavailable */
      }
    },
  };

  /* 1. Accessibility preferences (text size, contrast) ------------------- */
  function initPreferences() {
    const root = document.documentElement;
    const btn = $("#accessibility-btn");
    const panel = $("#access-panel");
    const inc = $("#inc-font");
    const dec = $("#dec-font");
    const contrast = $("#toggle-contrast");
    const reset = $("#reset-access");
    if (!btn || !panel) return;

    let size = parseInt(store.get("bchs-font-size"), 10) || 100;
    let high = store.get("bchs-contrast") === "on";

    const apply = () => {
      root.style.fontSize = size === 100 ? "" : `${size}%`;
      document.body.classList.toggle("high-contrast", high);
      if (contrast) contrast.setAttribute("aria-pressed", String(high));
      if (inc) inc.disabled = size >= 200;
      if (dec) dec.disabled = size <= 70;
    };
    const save = () => {
      store.set("bchs-font-size", String(size));
      store.set("bchs-contrast", high ? "on" : "off");
    };

    const setOpen = (open, returnFocus) => {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        const first = $("button:not([disabled])", panel);
        if (first) first.focus();
      } else if (returnFocus) {
        btn.focus();
      }
    };

    btn.addEventListener("click", () => setOpen(panel.hidden, false));
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false, true);
      }
    });
    document.addEventListener("click", (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target))
        setOpen(false, false);
    });

    if (inc)
      inc.addEventListener("click", () => {
        size = Math.min(size + 10, 200);
        apply();
        save();
      });
    if (dec)
      dec.addEventListener("click", () => {
        size = Math.max(size - 10, 70);
        apply();
        save();
      });
    if (contrast)
      contrast.addEventListener("click", () => {
        high = !high;
        apply();
        save();
      });
    if (reset)
      reset.addEventListener("click", () => {
        size = 100;
        high = false;
        apply();
        save();
      });

    apply();
  }

  /* 2. Navigation: mobile menu + dropdown disclosures -------------------- */
  function initNav() {
    const toggle = $("#nav-toggle");
    const nav = $("#site-nav");
    if (!toggle || !nav) return;
    const mq = window.matchMedia("(max-width: 62em)");

    const closeDropdowns = (except) => {
      $$('.dropdown-toggle[aria-expanded="true"]', nav).forEach((b) => {
        if (b !== except) b.setAttribute("aria-expanded", "false");
      });
    };
    const setMenu = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-locked", open && mq.matches);
      if (!open) closeDropdowns();
    };

    toggle.addEventListener("click", () =>
      setMenu(toggle.getAttribute("aria-expanded") !== "true"),
    );

    $$(".dropdown-toggle", nav).forEach((b) => {
      b.addEventListener("click", () => {
        const open = b.getAttribute("aria-expanded") === "true";
        closeDropdowns(b);
        b.setAttribute("aria-expanded", String(!open));
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const openDrop = $('.dropdown-toggle[aria-expanded="true"]', nav);
      if (openDrop) {
        openDrop.setAttribute("aria-expanded", "false");
        openDrop.focus();
        nav.classList.add("is-dismissed");
      } else if (
        toggle.getAttribute("aria-expanded") === "true" &&
        mq.matches
      ) {
        setMenu(false);
        toggle.focus();
      }
    });
    // Escape hides hover menus until the pointer leaves the nav (WCAG 1.4.13)
    nav.addEventListener("mouseleave", () =>
      nav.classList.remove("is-dismissed"),
    );

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        closeDropdowns();
        if (mq.matches) setMenu(false);
      }
    });
    // Close a dropdown when focus moves out of it
    nav.addEventListener("focusout", (e) => {
      const item = e.target.closest(".has-dropdown");
      if (item && !item.contains(e.relatedTarget)) {
        const b = $(".dropdown-toggle", item);
        if (b) b.setAttribute("aria-expanded", "false");
      }
    });
    mq.addEventListener("change", () => setMenu(false));
  }

  /* 3. Breaking-news ticker: pause / play -------------------------------- */
  function initTicker() {
    $$(".ticker").forEach((ticker) => {
      const btn = $(".ticker-toggle", ticker);
      if (!btn) return;
      const set = (paused) => {
        ticker.classList.toggle("is-paused", paused);
        btn.setAttribute("aria-pressed", String(paused));
        btn.setAttribute(
          "aria-label",
          paused ? "Play breaking news ticker" : "Pause breaking news ticker",
        );
        btn.firstElementChild &&
          (btn.firstElementChild.className = paused
            ? "fas fa-play"
            : "fas fa-pause");
      };
      btn.addEventListener("click", () =>
        set(!ticker.classList.contains("is-paused")),
      );
      set(reduceMotion.matches);
    });
  }

  /* 4. Tabs (vertical tab list on content pages) ------------------------- */
  function initTabs() {
    const list = $('.tab[role="tablist"]');
    if (!list) return;
    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((t) =>
      document.getElementById(t.getAttribute("aria-controls")),
    );
    const crumb = $("#current-crumb");
    const base = document.title.split(" | ").pop();

    const activate = (tab, { focus = false, scroll = false } = {}) => {
      tabs.forEach((t, i) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle("active", on);
        if (panels[i]) panels[i].hidden = !on;
      });
      if (crumb) crumb.textContent = tab.textContent.trim();
      const name = tab.textContent.trim();
      document.title = `${name} | ${base}`;
      // widgets that measure themselves (e.g. the calendar) need to re-measure once their panel is visible
      window.requestAnimationFrame(() =>
        window.dispatchEvent(new Event("resize")),
      );
      if (focus) tab.focus();
      if (scroll) {
        const panel = document.getElementById(
          tab.getAttribute("aria-controls"),
        );
        if (panel)
          panel.scrollIntoView({
            behavior: reduceMotion.matches ? "auto" : "smooth",
            block: "start",
          });
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        activate(tab);
        const id = tab.getAttribute("aria-controls");
        if (history.replaceState) history.replaceState(null, "", `#${id}`);
      });
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight")
          next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
          next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          activate(next, { focus: true });
        }
      });
    });

    const fromHash = (scroll) => {
      const id = decodeURIComponent(location.hash.slice(1));
      const tab = tabs.find((t) => t.getAttribute("aria-controls") === id);
      if (tab) {
        activate(tab, { scroll });
        return true;
      }
      return false;
    };
    window.addEventListener("hashchange", () => fromHash(true));
    if (!fromHash(false))
      activate($('[aria-selected="true"]', list) || tabs[0]);
  }

  /* 5. Disclosures: accordions, collapsibles, how-to steps --------------- */
  function initDisclosures() {
    const selector = ".faq-question, .collapsible, .howto-btn";
    const buttons = $$(selector);
    buttons.forEach((btn) => {
      let panel =
        btn.getAttribute("aria-controls") &&
        document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) panel = btn.nextElementSibling;
      if (!panel) return;
      ensureId(panel, "panel");
      ensureId(btn, "trigger");
      btn.setAttribute("aria-controls", panel.id);
      if (!btn.hasAttribute("aria-expanded"))
        btn.setAttribute("aria-expanded", "false");
      btn.type = "button";
      panel.classList.add("collapse");
      if (!panel.hasAttribute("role")) panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btn.id);
      if (!$(":scope > .collapse-inner", panel)) {
        const inner = document.createElement("div");
        inner.className = "collapse-inner";
        while (panel.firstChild) inner.appendChild(panel.firstChild);
        panel.appendChild(inner);
      }
      const set = (open) => {
        btn.setAttribute("aria-expanded", String(open));
        panel.classList.toggle("is-open", open);
        btn.classList.toggle("active", open);
      };
      set(btn.getAttribute("aria-expanded") === "true");
      btn.addEventListener("click", () => {
        const willOpen = btn.getAttribute("aria-expanded") !== "true";
        if (willOpen && btn.dataset.group) {
          buttons
            .filter(
              (o) =>
                o !== btn &&
                o.dataset.group === btn.dataset.group &&
                o.getAttribute("aria-expanded") === "true",
            )
            .forEach((o) => o.click());
        }
        set(willOpen);
      });
    });
    // Steps that should start open
    $$("[data-open-first]").forEach((group) => {
      const first = $(selector, group);
      if (first && first.getAttribute("aria-expanded") !== "true")
        first.click();
    });
  }

  /* 6. Carousels / slideshows ------------------------------------------- */
  function initCarousels() {
    $$("[data-carousel]").forEach((root) => {
      const slides = $$("[data-slide]", root);
      if (slides.length < 2) return;
      const prev = $("[data-carousel-prev]", root);
      const next = $("[data-carousel-next]", root);
      const dots = $$("[data-carousel-dot]", root);
      const pause = $("[data-carousel-pause]", root);
      const live = $("[data-carousel-live]", root);
      const autoplay =
        root.hasAttribute("data-autoplay") && !reduceMotion.matches;
      let index = 0;
      let timer = null;
      let paused = !autoplay;

      root.setAttribute("role", "region");
      root.setAttribute("aria-roledescription", "carousel");
      slides.forEach((s, i) => {
        s.setAttribute("role", "group");
        s.setAttribute("aria-roledescription", "slide");
        s.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
      });

      const show = (n, announce) => {
        index = (n + slides.length) % slides.length;
        slides.forEach((s, i) => {
          s.hidden = i !== index;
        });
        dots.forEach((d, i) => {
          d.classList.toggle("active", i === index);
          if (i === index) d.setAttribute("aria-current", "true");
          else d.removeAttribute("aria-current");
        });
        if (live && announce)
          live.textContent = `Slide ${index + 1} of ${slides.length}`;
      };
      const stop = () => {
        clearInterval(timer);
        timer = null;
      };
      const start = () => {
        stop();
        if (!paused) timer = setInterval(() => show(index + 1, false), 5000);
      };
      const setPaused = (value) => {
        paused = value;
        if (pause) {
          pause.setAttribute("aria-pressed", String(paused));
          pause.setAttribute(
            "aria-label",
            paused ? "Start slide show" : "Pause slide show",
          );
          const icon = pause.firstElementChild;
          if (icon) icon.className = paused ? "fas fa-play" : "fas fa-pause";
        }
        if (live) live.setAttribute("aria-live", paused ? "polite" : "off");
        start();
      };

      if (prev) prev.addEventListener("click", () => show(index - 1, true));
      if (next) next.addEventListener("click", () => show(index + 1, true));
      dots.forEach((d, i) => d.addEventListener("click", () => show(i, true)));
      if (pause) pause.addEventListener("click", () => setPaused(!paused));
      root.addEventListener("focusin", stop);
      root.addEventListener("focusout", start);
      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", start);
      root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          show(index - 1, true);
        } else if (e.key === "ArrowRight") {
          show(index + 1, true);
        }
      });

      show(0, false);
      setPaused(paused);
    });
  }

  /* 7. Dialogs: focus management for the existing modal markup ---------- */
  function initDialogs() {
    const dialogs = $$(".modal-overlay, .modal");
    if (!dialogs.length) return;
    let opener = null;
    document.addEventListener(
      "click",
      (e) => {
        const t = e.target.closest("a, button");
        if (t && !t.closest(".modal-overlay, .modal")) opener = t;
      },
      true,
    );

    const focusables = (root) =>
      $$(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        root,
      ).filter((el) => el.offsetParent !== null);

    dialogs.forEach((overlay) => {
      const card = $(".modal-card, .modal-content", overlay) || overlay;
      const title = $("#modalTitle", overlay) || $(".highlight-name", overlay);
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      if (title)
        overlay.setAttribute("aria-labelledby", ensureId(title, "dlg-title"));
      else overlay.setAttribute("aria-label", "Details");
      card.tabIndex = -1;
      let wasOpen = false;

      const isOpen = () => getComputedStyle(overlay).display !== "none";
      const sync = () => {
        const open = isOpen();
        if (open && !wasOpen) {
          wasOpen = true;
          document.body.classList.add("nav-locked");
          const target = $(".modal-close, .close", overlay) || card;
          requestAnimationFrame(() => target.focus());
        } else if (!open && wasOpen) {
          wasOpen = false;
          document.body.classList.remove("nav-locked");
          if (opener && document.contains(opener)) opener.focus();
        }
      };
      new MutationObserver(sync).observe(overlay, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const close = $(".modal-close, .close", overlay);
          if (close) close.click();
          else overlay.style.display = "none";
        } else if (e.key === "Tab") {
          const items = focusables(overlay);
          if (!items.length) {
            e.preventDefault();
            return;
          }
          const first = items[0];
          const last = items[items.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === card)
          ) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    });
  }

  /* 8. Generic show/hide toggles ---------------------------------------- */
  function initToggles() {
    $$("[data-toggle]").forEach((btn) => {
      const target = document.getElementById(btn.dataset.toggle);
      if (!target) return;
      btn.setAttribute("aria-controls", target.id);
      btn.setAttribute("aria-expanded", String(!target.hidden));
      btn.addEventListener("click", () => {
        target.hidden = !target.hidden;
        btn.setAttribute("aria-expanded", String(!target.hidden));
      });
    });
  }

  /* 9. Count-up numbers (skipped when reduced motion is requested) ------- */
  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;
    const run = (el) => {
      const end = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      if (reduceMotion.matches || !("IntersectionObserver" in window)) {
        el.textContent = end.toLocaleString() + suffix;
        return;
      }
      const start = performance.now();
      const duration = 1600;
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(end * p).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            run(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    counters.forEach((c) => io.observe(c));
  }

  const init = () => {
    initPreferences();
    initNav();
    initTicker();
    initTabs();
    initDisclosures();
    initCarousels();
    initDialogs();
    initToggles();
    initCounters();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
