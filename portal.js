/* MCM Portal - simple client login + project viewer (static JSON)
   SECURITY NOTE: This is a lightweight "simple login" for convenience.
   Do NOT use this for sensitive data. For real security, use Netlify Identity + protected content.
*/
async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.json();
}

function moneyUSD(v){
  if (v === null || v === undefined || v === "") return "—";
  try { return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(v)); }
  catch(e){ return `$${v}`; }
}

function formatDateISO(d){
  if(!d) return "—";
  // accept YYYY-MM-DD or ISO
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
}

function statusBadge(status){
  const s = String(status || "").toLowerCase();
  if (["active","in progress","in-progress","progress"].includes(s)) return {cls:"status-active", label: status || "Active"};
  if (["pending","planned","on hold","on-hold"].includes(s)) return {cls:"status-pending", label: status || "Pending"};
  if (["completed","done","closed"].includes(s)) return {cls:"status-completed", label: status || "Completed"};
  return {cls:"status-pending", label: status || "Pending"};
}

function getSession(){
  try { return JSON.parse(sessionStorage.getItem("mcm_portal_session") || "null"); }
  catch(e){ return null; }
}

function clearSession(){
  sessionStorage.removeItem("mcm_portal_session");
}

function showMessage(msg){
  let box = document.getElementById("message-box");
  if(!box){
    box = document.createElement("div");
    box.id = "message-box";
    box.innerHTML = `<div id="message-text"></div><button id="message-close">OK</button>`;
    document.body.appendChild(box);
    document.getElementById("message-close").onclick = ()=> box.remove();
  }
  document.getElementById("message-text").textContent = msg;
}

function ensureDetailsUI(){
  const host = document.getElementById("portal-content");
  if(!host) return;

  if(!document.getElementById("project-details")){
    const wrap = document.createElement("div");
    wrap.id = "project-details";
    wrap.style.marginTop = "25px";
    wrap.style.display = "none";
    wrap.innerHTML = `
      <h3 style="font-family:'Playfair Display', serif; font-weight:400; color:#C7A96B; margin: 0 0 12px 0;">Project Details</h3>
      <div id="project-details-meta" style="margin-bottom: 15px; color:#555;"></div>
      <div id="project-gallery" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;"></div>
      <div id="project-docs"></div>

      <div id="mcm-lightbox" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:10000; align-items:center; justify-content:center;">
        <span id="mcm-lightbox-close" style="position:absolute; top:20px; right:35px; font-size:40px; color:#fff; cursor:pointer;">&times;</span>
        <img id="mcm-lightbox-img" alt="Project image" style="max-width:90%; max-height:90%; display:block; margin:auto;" />
      </div>
    `;
    host.appendChild(wrap);

    const lb = document.getElementById("mcm-lightbox");
    document.getElementById("mcm-lightbox-close").onclick = ()=>{ lb.style.display="none"; };
    lb.addEventListener("click",(e)=>{ if(e.target === lb) lb.style.display="none"; });
  }
}

function renderProjectDetails(project){
  ensureDetailsUI();
  const details = document.getElementById("project-details");
  const meta = document.getElementById("project-details-meta");
  const gallery = document.getElementById("project-gallery");
  const docs = document.getElementById("project-docs");

  if(!details || !meta || !gallery || !docs) return;

  details.style.display = "block";
  meta.innerHTML = `
    <div><strong>${project.title || "Project"}</strong></div>
    <div>Status: <span class="status-badge ${statusBadge(project.status).cls}">${statusBadge(project.status).label}</span></div>
    <div>Start: ${formatDateISO(project.start_date)} &nbsp; | &nbsp; Target: ${formatDateISO(project.end_date)}</div>
    <div>Responsible: ${project.responsible || "—"} &nbsp; | &nbsp; Price: ${moneyUSD(project.price_usd)}</div>
    ${project.description ? `<div style="margin-top:8px;">${project.description}</div>` : ""}
  `;

  gallery.innerHTML = "";
  const imgs = Array.isArray(project.gallery) ? project.gallery : [];
  if(imgs.length){
    imgs.forEach(url=>{
      const card = document.createElement("div");
      card.style.background="#fff";
      card.style.border="1px solid #eee";
      card.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)";
      card.style.cursor="pointer";
      card.innerHTML = `<img src="${url}" alt="Project image" style="width:100%; height:160px; object-fit:cover; display:block;">`;
      card.onclick = ()=>{
        const lb = document.getElementById("mcm-lightbox");
        const im = document.getElementById("mcm-lightbox-img");
        im.src = url;
        lb.style.display="flex";
      };
      gallery.appendChild(card);
    });
  } else {
    gallery.innerHTML = `<div style="color:#777;">No images yet.</div>`;
  }

  const pdfs = Array.isArray(project.documents) ? project.documents : [];
  if(pdfs.length){
    const list = pdfs.map(d=>{
      const label = d.label || "Document";
      const url = d.url || "#";
      return `<a class="document-link" href="${url}" target="_blank" rel="noopener">${label}</a>`;
    }).join("");
    docs.innerHTML = `
      <h4 style="margin:0 0 10px 0; font-size:1rem; color:#333; border-bottom:2px solid #C7A96B; display:inline-block; padding-bottom:5px;">Documents</h4>
      <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:10px;">${list}</div>
    `;
  } else {
    docs.innerHTML = `<div style="color:#777;">No documents uploaded yet.</div>`;
  }

  details.scrollIntoView({ behavior:"smooth", block:"start" });
}

function matchesFilter(project, filterValue){
  if(!filterValue || filterValue === "All") return true;
  const s = String(project.status || "").toLowerCase();
  if(filterValue === "Active") return ["active","in progress","in-progress","progress"].includes(s);
  if(filterValue === "Pending") return ["pending","planned","on hold","on-hold"].includes(s);
  if(filterValue === "Completed") return ["completed","done","closed"].includes(s);
  return true;
}

async function loadPortal(){
  const session = getSession();
  if(!session || !session.client_id){
    // not logged in
    window.location.href = "login.html";
    return;
  }

  const data = await fetchJson("/content/portal_data.json");
  const client = (data.clients || []).find(c => c.id === session.client_id);
  if(!client){
    clearSession();
    window.location.href = "login.html";
    return;
  }

  // Fill client info
  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val ?? "N/A"; };
  setText("clientName", client.name || "N/A");
  setText("clientEmail", client.email || "N/A");
  setText("clientPhone", client.phone || "N/A");
  setText("clientAddress", client.address || "N/A");

  const welcome = document.getElementById("welcome-message");
  if(welcome) welcome.textContent = `Welcome, ${client.name || "Client"}!`;

  // Filter projects
  const projects = (data.projects || []).filter(p => p.client_id === client.id);
  const tbody = document.getElementById("projects-list");
  if(!tbody) return;

  const content = document.getElementById("portal-content");
  if(content) content.style.display = "block";

  function render(){
    const filterValue = (document.getElementById("status-filter") || {}).value || "All";
    tbody.innerHTML = "";
    const list = projects.filter(p => matchesFilter(p, filterValue));

    if(!list.length){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="padding:16px; color:#777;">No projects found.</td>`;
      tbody.appendChild(tr);
      return;
    }

    list.forEach(p=>{
      const badge = statusBadge(p.status);
      const docsCount = Array.isArray(p.documents) ? p.documents.length : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Project">${p.title || "—"}</td>
        <td data-label="Start">${formatDateISO(p.start_date)}</td>
        <td data-label="Completion">${formatDateISO(p.end_date)}</td>
        <td data-label="Responsible">${p.responsible || "—"}</td>
        <td data-label="Price">${moneyUSD(p.price_usd)}</td>
        <td data-label="Status"><span class="status-badge ${badge.cls}">${badge.label}</span></td>
        <td data-label="Documents">
          <button class="logout-btn" style="padding:8px 12px; font-size:.85rem;" data-project="${p.id}">View</button>
          <span style="margin-left:10px; color:#777; font-size:.85rem;">${docsCount} file(s)</span>
        </td>
      `;
      tbody.appendChild(tr);

      tr.querySelector("button[data-project]").addEventListener("click", ()=> renderProjectDetails(p));
    });
  }

  // hook filter
  const filter = document.getElementById("status-filter");
  if(filter){
    filter.addEventListener("change", render);
  }
  render();

  // logout
  const logoutBtn = document.getElementById("logout-btn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=>{
      clearSession();
      window.location.href = "login.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadPortal().catch(err=>{
    console.error(err);
    showMessage("Could not load portal data. Please contact support.");
  });
});
