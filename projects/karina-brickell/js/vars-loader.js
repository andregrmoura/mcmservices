(function () {
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function setTextVars(data) {
    qsa('[data-var]').forEach(function (el) {
      var key = el.getAttribute('data-var');
      if (data[key] !== undefined && data[key] !== null) el.textContent = data[key];
    });
  }

  function setHrefVars(data) {
    qsa('[data-href]').forEach(function (el) {
      var key = el.getAttribute('data-href');
      var val = data[key];
      if (!val) return;

      el.setAttribute('href', val);

      // External links (ex: Notion) open in new tab
      if (/^https?:\/\//i.test(val)) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      }
    });
  }

  function setStatusDot(data) {
    // CSS expects: active | pending | completed | inactive
    var dot = document.querySelector('.meta-dot');
    if (!dot) return;

    var val = (data.projectStatusDot || '').toString().toLowerCase().trim();
    if (!val) return;

    dot.className = 'meta-dot ' + val;
  }

  function togglePdf(key, showPdf) {
    var box = document.querySelector('[data-pdf-box="' + key + '"]');
    var ph  = document.querySelector('[data-placeholder-for="' + key + '"]');

    if (box) box.classList.toggle('is-hidden', !showPdf);
    if (ph)  ph.classList.toggle('is-hidden',  showPdf);
  }

  function fileExists(url) {
    // Use HEAD to avoid downloading the whole PDF
    return fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(function (r) { return r && r.ok; })
      .catch(function () { return false; });
  }

  function handlePdf(key, url) {
    // Always prevent any legacy src from loading
    var iframe = document.querySelector('iframe[data-src="' + key + '"]');
    if (iframe) {
      try { iframe.removeAttribute('src'); } catch (e) {}
    }

    if (!url) {
      togglePdf(key, false);
      return Promise.resolve();
    }

    return fileExists(url).then(function (ok) {
      if (ok) {
        if (iframe) iframe.setAttribute('src', url);
        togglePdf(key, true);
      } else {
        togglePdf(key, false);
      }
    });
  }

  function renderHistory(data) {
    var estUL = document.getElementById('estimate-list');
    var invUL = document.getElementById('invoice-list');
    var estEmpty = document.getElementById('estimate-empty');
    var invEmpty = document.getElementById('invoice-empty');

    var estArr = Array.isArray(data.estimatesHistory) ? data.estimatesHistory : [];
    var invArr = Array.isArray(data.invoicesHistory) ? data.invoicesHistory : [];

    if (estUL) estUL.innerHTML = '';
    if (invUL) invUL.innerHTML = '';

    if (estEmpty) estEmpty.classList.toggle('is-hidden', estArr.length > 0);
    if (invEmpty) invEmpty.classList.toggle('is-hidden', invArr.length > 0);

    if (estUL && estArr.length) {
      estArr.forEach(function (item) {
        if (!item || !item.file) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = './estimates/' + item.file;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.label || item.file;
        li.appendChild(a);
        estUL.appendChild(li);
      });
    }

    if (invUL && invArr.length) {
      invArr.forEach(function (item) {
        if (!item || !item.file) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = './invoices/' + item.file;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.label || item.file;
        li.appendChild(a);
        invUL.appendChild(li);
      });
    }
  }

  function apply(data) {
    setTextVars(data);
    setHrefVars(data);
    setStatusDot(data);
    renderHistory(data);

    // PDFs (show placeholder when empty OR missing file)
    return Promise.resolve()
      .then(function () { return handlePdf('currentEstimate', data.currentEstimate); })
      .then(function () { return handlePdf('currentInvoice', data.currentInvoice); })
      .then(function () {
        // Re-apply dynamic text once more (guards against late i18n repaint)
        setTimeout(function () { setTextVars(data); setStatusDot(data); }, 250);
      });
  }

  function run() {
    fetch('./data/project.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        setTimeout(function () { apply(data); }, 50);
      })
      .catch(function (err) { console.error(err); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();