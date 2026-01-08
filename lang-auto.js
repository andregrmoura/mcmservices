/**
 * lang-auto.js — Automatic language selection for the entire site
 * Picks language from the browser (navigator.languages / navigator.language)
 * and applies it through window.setLanguage(lang).
 *
 * Behavior:
 * - If user already has localStorage("language"), keep it (respects preference).
 * - Otherwise use the browser language.
 */
(function () {
  function normalize(lang) {
    if (!lang) return "en";
    lang = String(lang).toLowerCase();
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("es")) return "es";
    return "en";
  }

  const stored = localStorage.getItem("language");
  const browser = normalize((navigator.languages && navigator.languages[0]) || navigator.language || "en");
  const lang = normalize(stored || browser);

  localStorage.setItem("language", lang);
  document.documentElement.setAttribute("lang", lang);

  // Apply to the whole site (requires i18n.js included before or after; we retry if needed)
  function apply() {
    if (typeof window.setLanguage === "function") {
      window.setLanguage(lang);
      return true;
    }
    return false;
  }

  // Try immediately, then again on DOMContentLoaded if setLanguage wasn't ready yet
  if (!apply()) {
    window.addEventListener("DOMContentLoaded", apply);
  }
})();
