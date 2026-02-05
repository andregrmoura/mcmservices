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

  

  
  
  function renderInsuranceStatus(data){
    if (!data) return;

    // Find the insurance card pill (the one under Insurance Status section)
    var cardTitle = document.querySelector('[data-translate="insurance-status-title"]');
    var scope = cardTitle ? cardTitle.closest('.history-card') : document;
    if (!scope) scope = document;

    var pill = scope.querySelector('.status-pill');
    var dot = scope.querySelector('.status-dot');
    var textEl = scope.querySelector('[data-var="insuranceStatus"]');
    if (!pill || !dot) return;

    // Text controlled by project.json (fallback keeps whatever is in HTML)
    var txt = (typeof data.insuranceStatus === 'string') ? data.insuranceStatus.trim() : '';
    if (textEl && txt) textEl.textContent = txt;

    // Dot color key: manual override via insuranceStatusDot OR inferred from text
    var key = (typeof data.insuranceStatusDot === 'string') ? data.insuranceStatusDot.trim().toLowerCase() : '';
    if (!key){
      var base = (txt || (textEl ? textEl.textContent : '') || '').toLowerCase();
      if (base.includes('pending') || base.includes('await') || base.includes('review') || base.includes('processing')) key = 'pending';
      else if (base.includes('inactive') || base.includes('expired') || base.includes('hold') || base.includes('cancel')) key = 'inactive';
      else key = 'active';
    }

    // Keep pill style; only adjust classes for dot (and optional pill marker)
    pill.classList.remove('active','pending','inactive');
    dot.classList.remove('active','pending','inactive');

    if (key === 'pending' || key === 'inactive' || key === 'active'){
      pill.classList.add(key);
      dot.classList.add(key);
    }
  }

function renderInsuranceRequirements(data){
    var list = document.getElementById('insuranceCoverageList');
    if (!list || !data) return;

    // Clear previous items
    list.innerHTML = '';

    var items = Array.isArray(data.insuranceRequirements) ? data.insuranceRequirements : [];
    items = items.map(function(x){ return (x || '').toString().trim(); }).filter(Boolean);

    // Hide fallback text if present (we keep it empty in HTML)
    var fallback = document.getElementById('insuranceCoverageFallback');
    if (fallback) fallback.style.display = items.length ? 'none' : 'none';

    if (!items.length) return;

    items.forEach(function(txt){
      var li = document.createElement('li');
      li.textContent = txt;
      list.appendChild(li);
    });
  }


  function renderProjectStatusDot(data){
    try{
      var dot = document.querySelector('.status-sheet .meta-dot');
      if (!dot || !data) return;

      dot.classList.remove('pending','completed','inactive');

      var status = (data.projectStatus || '').toString().toLowerCase();

      if (
        status.includes('pending') ||
        status.includes('awaiting') ||
        status.includes('waiting') ||
        status.includes('payment') ||
        status.includes('deposit')
      ){
        dot.classList.add('pending');
      } else if (
        status.includes('complete') ||
        status.includes('completed') ||
        status.includes('done') ||
        status.includes('finalized') ||
        status.includes('finished')
      ){
        dot.classList.add('completed');
      } else if (
        status.includes('inactive') ||
        status.includes('on hold') ||
        status.includes('paused') ||
        status.includes('cancel') ||
        status.includes('canceled') ||
        status.includes('expired')
      ){
        dot.classList.add('inactive');
      }
    }catch(e){}
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
        renderInsuranceRequirements(data);
    renderInsuranceStatus(data);
setHrefVars(data);
    renderHistory(data);

    // PDFs (show placeholder when empty OR missing file)
    return Promise.resolve()
      .then(function () { return handlePdf('currentEstimate', data.currentEstimate); })
      .then(function () { return handlePdf('currentInvoice', data.currentInvoice); })
      .then(function () {
        // Re-apply dynamic text once more (guards against late i18n repaint)
        setTimeout(function () { setTextVars(data);  }, 250);
      });
  }

  function run() {
    fetch('./data/project.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
                window.projectData = data;
        try{ window.dispatchEvent(new CustomEvent('projectDataLoaded', { detail: data })); }catch(e){}
setTimeout(function () { apply(data);

        // Expose loaded data for any page scripts
        window.projectData = data;

        // Ensure Project Status dot updates AFTER data is applied
        renderProjectStatusDot(data);

        // Notify listeners that data is applied (timing-safe)
        try{ window.dispatchEvent(new Event("projectDataApplied")); }catch(e){}
}, 50);
      })
      .catch(function (err) { console.error(err); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();