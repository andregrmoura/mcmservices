/* ============================
   Project Portal Access - portal-access.js
   - Remember access per project
   - NEVER remember on /projects/template/ (test environment)
   - Optional: ?test=1 forces login
   - Sends full_name + email to /.netlify/functions/save-leads
   ============================ */

(() => {
  // --------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function getProjectSlugFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    // expected: /projects/{slug}/access.html  OR /projects/{slug}/
    if (parts[0] !== "projects") return "";
    return parts[1] || "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function setStatus(message, type = "error") {
    // Expected container:
    // <div id="saveStatus" class="status-box"></div>
    // Or it will fallback to alert.
    const box = $("#saveStatus");
    if (!box) {
      if (message) alert(message);
      return;
    }

    box.style.display = message ? "block" : "none";
    box.textContent = message || "";

    box.classList.remove("is-error", "is-success", "is-info");
    if (type === "success") box.classList.add("is-success");
    else if (type === "info") box.classList.add("is-info");
    else box.classList.add("is-error");
  }

  function safeJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function normalizeName(name) {
    return String(name || "").trim().replace(/\s+/g, " ");
  }

  // --------- Config ----------
  const projectSlug = getProjectSlugFromPath();
  const isTemplate = (projectSlug || "").toLowerCase() === "template";

  const url = new URL(window.location.href);
  const forceLogin = url.searchParams.get("test") === "1"; // /projects/x/?test=1

  // Access saved per project (recommended)
  const accessKey = `portalAccess:${projectSlug || "unknown"}`;

  // You can set project URL in HTML:
  // <body data-project-url="/projects/slug/project.html">
  // or include a hidden input:
  // <input type="hidden" id="projectUrl" value="/projects/slug/">
  function getProjectUrlFallback() {
    const fromBody = document.body?.dataset?.projectUrl;
    if (fromBody) return fromBody;

    const hidden = $("#projectUrl");
    if (hidden && hidden.value) return hidden.value;

    // Fallback: go to project root folder
    if (projectSlug) return `/projects/${projectSlug}/`;
    return "/projects/";
  }

  // --------- Elements ----------
  // Expected IDs (you can keep your HTML as is; this is tolerant):
  // #fullName, #email, #continueBtn, #clearSavedAccess, #useDifferentEmail, #portalAccessForm
  const fullNameEl =
    $("#fullName") || $("#full_name") || $("#name") || $("#fullNameInput");
  const emailEl = $("#email") || $("#emailInput");

  const continueBtn = $("#continueBtn") || $("#continue-to-portal");
  const clearBtn = $("#clearSavedAccess") || $("#clear-saved-access");
  const useDifferentBtn = $("#useDifferentEmail") || $("#use-different-email");

  const form = $("#portalAccessForm") || $("form");

  // --------- Load saved access ----------
  function getSavedAccess() {
    const raw = localStorage.getItem(accessKey);
    if (!raw) return null;
    const data = safeJsonParse(raw);
    if (!data) return null;

    // minimal shape validation
    if (!data.email || !data.full_name) return null;
    return data;
  }

  function saveAccess(data) {
    // Never remember for template (test env)
    if (isTemplate) return;

    // Also allow forcing login without saving
    if (forceLogin) return;

    localStorage.setItem(
      accessKey,
      JSON.stringify({
        full_name: data.full_name,
        email: data.email,
        ts: Date.now(),
      })
    );
  }

  function clearAccess() {
    localStorage.removeItem(accessKey);
    sessionStorage.removeItem("portalLead"); // optional: your session object
  }

  function redirectTo(urlToGo) {
    window.location.href = urlToGo;
  }

  // --------- Auto-skip logic ----------
  // If already saved access AND not template AND not forced -> redirect straight away
  const saved = getSavedAccess();
  if (saved && !isTemplate && !forceLogin) {
    // Optional: if you want to validate server-side anyway, you can call save-leads silently.
    // Here we just redirect to project url.
    redirectTo(getProjectUrlFallback());
    return;
  }

  // Pre-fill fields if saved (even on template we won't save, but can prefill if you want)
  if (saved && fullNameEl && !fullNameEl.value) fullNameEl.value = saved.full_name;
  if (saved && emailEl && !emailEl.value) emailEl.value = saved.email;

  // --------- Submit handler ----------
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setStatus("");

    const full_name = normalizeName(fullNameEl ? fullNameEl.value : "");
    const email = String(emailEl ? emailEl.value : "").trim().toLowerCase();

    if (!full_name || full_name.length < 2) {
      setStatus("Please enter your full name.");
      return;
    }
    if (!isValidEmail(email)) {
      setStatus("Please enter a valid email.");
      return;
    }

    const project_url = getProjectUrlFallback();

    // UI: disable button
    const btn = continueBtn || (form ? form.querySelector('button[type="submit"]') : null);
    if (btn) btn.disabled = true;

    try {
      const res = await fetch("/.netlify/functions/save-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,          // IMPORTANT: backend expects full_name
          email,
          project_slug: projectSlug || "unknown",
          project_url,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          `Save failed (${res.status}).`;
        setStatus(msg);
        return;
      }

      // Save access (except template / forceLogin)
      saveAccess({ full_name, email });

      // Optional: store session lead for dashboard usage in your client admin UI
      sessionStorage.setItem(
        "portalLead",
        JSON.stringify({
          full_name,
          email,
          project_slug: projectSlug || "unknown",
          last_seen: new Date().toISOString(),
        })
      );

      // Redirect
      const redirect_to = data?.redirect_to || project_url;
      setStatus("Access confirmed. Redirecting...", "success");

      // small delay for UX
      setTimeout(() => redirectTo(redirect_to), 250);
    } catch (err) {
      setStatus(err?.message || "Server error. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // --------- Buttons ----------
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", handleSubmit);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAccess();
      setStatus("Saved access cleared.", "info");

      // clear fields too
      if (fullNameEl) fullNameEl.value = "";
      if (emailEl) emailEl.value = "";
    });
  }

  if (useDifferentBtn) {
    useDifferentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Keep saved access unless you want to clear here as well:
      // clearAccess();
      if (fullNameEl) fullNameEl.focus();
      if (emailEl) emailEl.value = "";
      setStatus("");
    });
  }

  // --------- Small hint for template ----------
  if (isTemplate) {
    // optional: show a message
    // (only if you have #saveStatus available)
    setStatus("Template mode: access is not remembered (test environment).", "info");
  }
})();
