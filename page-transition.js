(() => {
  const LEAVE_CLASS = "is-leaving";
  const DURATION_MS = 180;

  // Global navigation helper (use in onclick/JS)
  function go(url) {
    try {
      const u = new URL(url, location.href);
      // external links -> normal navigation
      if (u.origin !== location.origin) {
        location.href = url;
        return;
      }
      // same-page hash -> normal
      if (u.pathname === location.pathname && u.search === location.search && u.hash) return;
    } catch (e) {
      location.href = url;
      return;
    }

    if (document.body.classList.contains(LEAVE_CLASS)) return;
    document.body.classList.add(LEAVE_CLASS);
    setTimeout(() => (location.href = url), DURATION_MS);
  }

  window.go = go;

  // On back/forward cache restore, ensure we show the page
  window.addEventListener("pageshow", () => {
    document.body.classList.remove(LEAVE_CLASS);
  });

  function shouldHandleLink(a) {
    if (!a || !a.href) return false;
    if (a.target === "_blank") return false;
    if (a.hasAttribute("download")) return false;

    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;

    // same-page hash -> don't intercept
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;

    return true;
  }

  // Intercept internal <a> clicks for fade-out
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!shouldHandleLink(a)) return;

      // don't intercept modified clicks (new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;

      e.preventDefault();
      go(a.href);
    },
    true
  );

  // Optional: prefetch on hover for snappier feel
  const prefetched = new Set();
  document.addEventListener(
    "mouseover",
    (e) => {
      const a = e.target.closest("a");
      if (!shouldHandleLink(a)) return;
      const href = a.href;
      if (prefetched.has(href)) return;
      prefetched.add(href);

      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      document.head.appendChild(link);
    },
    { passive: true }
  );

  // Optional: click on any element with data-href="..."
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target.closest("[data-href]");
      if (!el) return;

      // if user clicked a real link inside, let the link handler do its job
      if (e.target.closest("a")) return;

      // allow opting out
      if (el.hasAttribute("data-href-no-transition")) return;

      const href = el.getAttribute("data-href");
      if (!href) return;

      // modified clicks should behave normally
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;

      e.preventDefault();
      go(href);
    },
    true
  );
})();
