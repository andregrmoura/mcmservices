// footer-loader.js
// Loads /footer.html into <div id="site-footer"></div> and re-applies translations.

(async function () {
  const host = document.getElementById("site-footer");
  if (!host) return;

  try {
    // Use absolute path so it works from ANY folder/page.
    const res = await fetch("/footer.html", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load /footer.html");

    host.innerHTML = await res.text();

    // Update year
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Re-apply translations after injecting footer HTML
    // Your site exposes setLanguage(lang) globally (window.setLanguage).
    const lang = localStorage.getItem("language") || "en";
    if (typeof window.setLanguage === "function") {
      window.setLanguage(lang);
    }
  } catch (err) {
    console.error("Footer load error:", err);
  }
})();
