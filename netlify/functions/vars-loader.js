(function(){
  if (!window.location.pathname.startsWith("/projects/")) return;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const slug = parts[1];
  if (!slug) return;

  fetch("/.netlify/functions/notify-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectSlug: slug })
  }).catch(()=>{});
})();
