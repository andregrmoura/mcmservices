/* MCM Login - simple email/password against /content/portal_data.json (static)
   SECURITY NOTE: This is a convenience login only. Do NOT store sensitive info in portal_data.json.
*/
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.json();
}

function setError(msg){
  const el = document.getElementById("error-message");
  if(el) el.textContent = msg || "";
}

document.addEventListener("DOMContentLoaded", ()=>{
  // If already logged in, go to portal
  try{
    const s = JSON.parse(sessionStorage.getItem("mcm_portal_session") || "null");
    if(s && s.client_id){
      window.location.href = "portal.html";
      return;
    }
  }catch(e){}

  const form = document.getElementById("login-form");
  if(!form) return;

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    setError("");

    const email = (document.getElementById("email") || {}).value?.trim().toLowerCase();
    const password = (document.getElementById("password") || {}).value ?? "";

    if(!email || !password){
      setError("Please enter your email and password.");
      return;
    }

    try{
      const data = await fetchJson("/content/portal_data.json");
      const client = (data.clients || []).find(c => String(c.email || "").toLowerCase() === email);

      if(!client || String(client.password || "") !== String(password)){
        setError("Invalid email or password.");
        return;
      }

      sessionStorage.setItem("mcm_portal_session", JSON.stringify({
        client_id: client.id,
        email: client.email,
        ts: Date.now()
      }));

      window.location.href = "portal.html";
    }catch(err){
      console.error(err);
      setError("Login failed. Please try again or contact support.");
    }
  });

  // optional "Forgot Password" message
  const forgot = document.querySelector(".forgot-password a");
  if(forgot){
    forgot.addEventListener("click", (e)=>{
      e.preventDefault();
      setError("Please contact us to reset your password.");
    });
  }
});
