/**
 * i18n.js — Global translation system (EN/PT/ES)
 * Usage:
 * 1) Add data-translate="key" to any element you want translated.
 * 2) Include this file on ALL pages (before lang-auto.js is OK).
 * 3) lang-auto.js will auto-pick language based on browser and call setLanguage().
 */

window.translations = window.translations || {
  en: {
    // Footer / common
    "footer-nav": "Navigation",
    "footer-contact": "Contact & Connect",
    "footer-legal": "Legal",
    "footer-terms": "Terms of Use",
    "footer-privacy": "Privacy Policy",
    "client-login": "Client Login",
    "nav-home": "Home",
    "nav-about": "About",
    "nav-contact": "Contact",
    "nav-gallery": "Gallery",
    "footer-tagline": "Management Excellence, Flawless Execution.",
    "footer-location": "Miami, FL",
    "footer-powered": "Crafted & Managed by mcmprosolutions.com",
    "footer-copyright": "MCM Services USA Corporation",
  },
  pt: {
    "footer-nav": "Navegação",
    "footer-contact": "Contato & Conexões",
    "footer-legal": "Legal",
    "footer-terms": "Termos de Uso",
    "footer-privacy": "Política de Privacidade",
    "client-login": "Login do Cliente",
    "nav-home": "Início",
    "nav-about": "Sobre",
    "nav-contact": "Contato",
    "nav-gallery": "Galeria",
    "footer-tagline": "Excelência em gestão, execução impecável.",
    "footer-location": "Miami, FL",
    "footer-powered": "Criado & gerenciado por mcmprosolutions.com",
    "footer-copyright": "MCM Services USA Corporation",
  },
  es: {
    "footer-nav": "Navegación",
    "footer-contact": "Contacto y Conexión",
    "footer-legal": "Legal",
    "footer-terms": "Términos de Uso",
    "footer-privacy": "Política de Privacidad",
    "client-login": "Acceso del Cliente",
    "nav-home": "Inicio",
    "nav-about": "Acerca de",
    "nav-contact": "Contacto",
    "nav-gallery": "Galería",
    "footer-tagline": "Excelencia en gestión, ejecución impecable.",
    "footer-location": "Miami, FL",
    "footer-powered": "Creado y gestionado por mcmprosolutions.com",
    "footer-copyright": "MCM Services USA Corporation",
  }
};

(function () {
  function normalize(lang) {
    if (!lang) return "en";
    lang = String(lang).toLowerCase();
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("es")) return "es";
    return "en";
  }

    // Apply only i18n (data-translate) elements
  window.applyI18nTranslations = function applyI18nTranslations(lang) {

    lang = normalize(lang);
    localStorage.setItem("language", lang);
    document.documentElement.setAttribute("lang", lang);

    const dict = (window.translations && window.translations[lang]) || {};

    // Translate current DOM
    document.querySelectorAll("[data-translate]").forEach((el) => {
      const key = el.getAttribute("data-translate");
      if (dict[key]) el.innerHTML = dict[key];
    });

    // Optional: update Terms/Privacy page links if present
    const terms = document.getElementById("link-terms");
    const priv = document.getElementById("link-privacy");
    if (terms) {
      terms.href = lang === "pt" ? "terms-pt.html" : lang === "es" ? "terms-es.html" : "terms.html";
    }
    if (priv) {
      priv.href = lang === "pt" ? "privacy-pt.html" : lang === "es" ? "privacy-es.html" : "privacy.html";
    }
  };

  // Unified setLanguage: if another page already defines setLanguage (e.g., portfolio), we wrap it.
  (function attachUnifiedSetLanguage(){
    const prevSetLanguage = window.setLanguage;
    const hasPrev = typeof prevSetLanguage === 'function' && prevSetLanguage !== window.applyI18nTranslations;
    function unified(lang){
      const norm = normalize(lang);
      try { localStorage.setItem('language', norm); } catch(e) {}
      if (hasPrev && !unified.__busy) {
        unified.__busy = true;
        try { prevSetLanguage(norm); } catch(e) {}
        unified.__busy = false;
      }
      try { window.applyI18nTranslations(norm); } catch(e) {}
    }
    window.setLanguage = unified;
  })();

  // If a language is already stored, apply it on load.
  // IMPORTANT: only apply if the key exists; otherwise let lang-auto.js pick from the browser.
  let storedRaw = null;
  try { storedRaw = localStorage.getItem("language"); } catch(e) {}
  if (storedRaw) {
    const stored = normalize(storedRaw);
    window.addEventListener("DOMContentLoaded", () => window.setLanguage(stored));
  }
})();
