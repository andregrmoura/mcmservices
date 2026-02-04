(function () {
  function setTextVars(data) {
    document.querySelectorAll('[data-var]').forEach(el => {
      const key = el.getAttribute('data-var');
      if (data[key] !== undefined && data[key] !== null) el.textContent = data[key];
    });
  }

  function setSrcVars(data) {
    document.querySelectorAll('[data-src]').forEach(el => {
      const key = el.getAttribute('data-src');
      if (data[key]) el.setAttribute('src', data[key]);
    });
  }

  function setHrefVars(data) {
    document.querySelectorAll('[data-href]').forEach(el => {
      const key = el.getAttribute('data-href');
      if (!data[key]) return;

      el.setAttribute('href', data[key]);

      // Se for link externo (Notion), abre em nova aba com segurança
      if (/^https?:\/\//i.test(data[key])) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
      }
    });
  }

  function setStatusDot(data) {
    // CSS espera: active | pending | completed | inactive (minúsculo)
    const dot = document.querySelector('.meta-dot');
    if (!dot) return;

    const val = (data.projectStatusDot || '').toString().toLowerCase().trim();
    if (!val) return;

    dot.className = 'meta-dot ' + val;
  }

  function renderHistory(data) {
    // Estimates
    const estUL = document.getElementById('estimate-list');
    if (estUL && Array.isArray(data.estimatesHistory)) {
      estUL.innerHTML = '';
      data.estimatesHistory.forEach(item => {
        if (!item || !item.file) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = './estimates/' + item.file;   // item.file já inclui .pdf no seu JSON
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.label || item.file;
        li.appendChild(a);
        estUL.appendChild(li);
      });
    }

    // Invoices
    const invUL = document.getElementById('invoice-list');
    if (invUL && Array.isArray(data.invoicesHistory)) {
      invUL.innerHTML = '';
      data.invoicesHistory.forEach(item => {
        if (!item || !item.file) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
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
    setSrcVars(data);
    setHrefVars(data);
    setStatusDot(data);
    renderHistory(data);
  }

  function run() {
    fetch('./data/project.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Pequeno delay para não brigar com i18n (se existir na página)
        setTimeout(() => apply(data), 60);
      })
      .catch(console.error);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
