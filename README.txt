MCM Services — Global Auto Language Pack

Files included:
- index.html (updated): supports translating [data-translate] and [data-key], plus auto browser language.
- portfolio.html (updated): supports translating [data-key] and [data-translate], plus auto browser language.
- footer.html (unchanged): uses data-key attributes (works now on all pages).
- footer-loader.js (updated): robust path handling + sets correct terms/privacy links per language + reapplies translations.

How to use:
1) Replace these 4 files in your site root.
2) Hard refresh (Cmd+Shift+R) or clear cache.
3) Test:
   - Chrome: Settings > Languages > move English/Spanish/Portuguese to top and reload.
   - Or run in console:
       localStorage.setItem('language','en'); location.reload();
       localStorage.setItem('language','es'); location.reload();
       localStorage.setItem('language','pt'); location.reload();
       localStorage.removeItem('language'); location.reload();  (back to browser auto)
