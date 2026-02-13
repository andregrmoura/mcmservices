/* footer-loader.js (safe)
   - Loads footer.html relative to THIS script's location (works from / and /projects/*)
   - After injection, rewrites internal href/src so they point to the site root correctly
   - Updates Terms/Privacy per language (en/pt/es) WITHOUT leading slash
*/
(function () {
  function getScriptDir() {
    var s = document.currentScript;
    var src = s && s.getAttribute('src') ? s.getAttribute('src') : '';
    if (!src) {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        var t = scripts[i].getAttribute('src') || '';
        if (/footer-loader\.js(\?.*)?$/i.test(t)) { src = t; break; }
      }
    }
    if (!src) return '';
    src = src.split('?')[0];
    return src.replace(/[^\/]*$/, ''); // '' or '../' or '../../'
  }

  function getLang() {
    try {
      var v = (localStorage.getItem('language') || document.documentElement.lang || 'en').toLowerCase();
      if (v.indexOf('pt') === 0) return 'pt';
      if (v.indexOf('es') === 0) return 'es';
      return 'en';
    } catch (e) { return 'en'; }
  }

  function ensureHost() {
    return document.getElementById('site-footer') || document.querySelector('footer') || null;
  }

  function rewriteAsset(el, attr, prefix) {
    var v = el.getAttribute(attr);
    if (!v) return;

    // ignore absolute URLs / anchors / mailto / tel / http(s)
    if (/^(https?:)?\/\//i.test(v)) return;
    if (/^(mailto:|tel:|#)/i.test(v)) return;

    // remove leading slash if present
    if (v.charAt(0) === '/') v = v.slice(1);

    // already prefixed
    if (prefix && v.indexOf(prefix) === 0) return;

    el.setAttribute(attr, prefix + v);
  }

  function fixLinksAndAssets(root, prefix) {
    // logo/link assets
    var imgs = root.querySelectorAll('img[src]');
    for (var i = 0; i < imgs.length; i++) rewriteAsset(imgs[i], 'src', prefix);

    var links = root.querySelectorAll('a[href]');
    for (var j = 0; j < links.length; j++) rewriteAsset(links[j], 'href', prefix);
  }

  function setLegalLinks(root, prefix) {
    var terms = { en: 'terms.html', pt: 'terms-pt.html', es: 'terms-es.html' };
    var priv  = { en: 'privacy.html', pt: 'privacy-pt.html', es: 'privacy-es.html' };
    var lang = getLang();

    var t = root.querySelector('#link-terms');
    var p = root.querySelector('#link-privacy');

    if (t) t.setAttribute('href', prefix + (terms[lang] || terms.en));
    if (p) p.setAttribute('href', prefix + (priv[lang]  || priv.en));

    var y = root.querySelector('#currentYear');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function mount() {
    var prefix = getScriptDir();
    var host = ensureHost();

    // if page doesn't have a footer placeholder, create one at end of body
    if (!host) {
      host = document.createElement('div');
      host.id = 'site-footer';
      document.body.appendChild(host);
    }

    fetch(prefix + 'footer.html')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (html) {
        host.innerHTML = html;

        // If footer.html includes <footer>, keep it as-is but ensure we can query inside host
        var scope = host;

        // Rewrite links/images first, then override legal links per language
        fixLinksAndAssets(scope, prefix);
        setLegalLinks(scope, prefix);

        // Re-apply when language changes (if your site uses setLanguage)
        if (typeof window.setLanguage === 'function' && !window.__footerLegalWrapped) {
          var orig = window.setLanguage;
          window.setLanguage = function () {
            var out = orig.apply(this, arguments);
            setLegalLinks(scope, prefix);
            return out;
          };
          window.__footerLegalWrapped = true;
        }
      })
      .catch(function () { /* fail silently */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  function ensureScript(src) {
    if ([...document.scripts].some(s => s.src && s.src.includes(src))) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
  
  // ...depois de injetar o footer:
  ensureScript("/page-transition.js");
  

})();