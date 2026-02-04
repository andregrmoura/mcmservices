(function () {
  function apply(data) {
    // text vars
    document.querySelectorAll('[data-var]').forEach(el => {
      const key = el.getAttribute('data-var');
      if (data[key] !== undefined && data[key] !== null) {
        el.textContent = data[key];
      }
    });

    // iframe/src vars
    document.querySelectorAll('[data-src]').forEach(el => {
      const key = el.getAttribute('data-src');
      if (data[key]) el.setAttribute('src', data[key]);
    });

    // href vars
    document.querySelectorAll('[data-href]').forEach(el => {
      const key = el.getAttribute('data-href');
      if (data[key]) el.setAttribute('href', data[key]);
    });

    // status dot class (active | pending | completed | inactive)
    const dot = document.querySelector('[data-status-dot]');
    if (dot && data.projectStatusDot) {
      dot.className = 'meta-dot ' + data.projectStatusDot;
    }
  }

  function run() {
    fetch('./data/project.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // dá um pequeno delay pra não brigar com i18n (que roda no DOMContentLoaded)
        setTimeout(() => apply(data), 60);
      })
      .catch(console.error);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
