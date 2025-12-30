// footer-loader.js
(async function () {
  const host = document.getElementById("site-footer");
  if (!host) return;

  try {
    const res = await fetch("./footer.html", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load footer.html");

    host.innerHTML = await res.text();

    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    if (typeof window.updateTranslations === "function") {
      window.updateTranslations();
    } else if (typeof window.applyTranslations === "function") {
      window.applyTranslations();
    }
  } catch (err) {
    console.error("Footer load error:", err);
  }
})();
