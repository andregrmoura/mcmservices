(function () {
  // Fade-in on load (works on normal load + back/forward cache)
  function fadeIn() {
    document.documentElement.classList.remove("is-leaving");
    document.body.classList.remove("is-leaving");
  }

  // Fade-out when clicking internal links (same tab)
  function shouldHandleLink(a) {
    if (!a) return false;
    const href = a.getAttribute("href") || "";

    // ignore anchors, mailto/tel, external, new tabs, downloads
    if (!href || href.startsWith("#")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;

    // external
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
    } catch {
      // if URL parsing fails, don't block
      return false;
    }

    return true;
  }

  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a");
    if (!a) return;
    if (!shouldHandleLink(a)) return;

    e.preventDefault();

    const href = a.href;

    document.documentElement.classList.add("is-leaving");
    document.body.classList.add("is-leaving");

    // quick premium fade
    setTimeout(() => {
      window.location.href = href;
    }, 140);
  });

  // load + bfcache
  window.addEventListener("pageshow", fadeIn);
  window.addEventListener("load", fadeIn);
})();
