/* MCM Portfolio - dynamic gallery from /content/portfolio_data.json */
async function fetchJson(url){
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.json();
}

function getLang(){
  // If your site uses setLanguage() with localStorage, respect it
  const saved = localStorage.getItem("lang") || localStorage.getItem("language");
  if(saved) return saved;
  // fallback: look for active flag
  const active = document.querySelector('.lang-switcher img.active, .mobile-nav-flags img.active');
  return active?.getAttribute("data-lang") || "en";
}

function t(obj, lang){
  if(obj == null) return "";
  if(typeof obj === "string") return obj;
  return obj[lang] || obj["en"] || Object.values(obj)[0] || "";
}

function setHero(data, lang){
  const hero = document.getElementById("sobre");
  if(hero && data.hero?.background){
    hero.style.backgroundImage = `url('${data.hero.background}')`;
  }
  const h2 = document.querySelector("#sobre h2[data-key='portfolioTitle']");
  const p  = document.querySelector("#sobre p[data-key='portfolioSubtitle']");
  if(h2) h2.textContent = t(data.hero?.title, lang) || h2.textContent;
  if(p)  p.textContent  = t(data.hero?.subtitle, lang) || p.textContent;

  const st = document.querySelector("[data-key='portfolioSectionTitle']");
  if(st) st.textContent = t(data.sectionTitle, lang) || st.textContent;
}

function openLightbox(url){
  // Reuse existing lightbox if present, else create
  let lb = document.querySelector(".lightbox");
  if(!lb){
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML = `<span class="close-btn">&times;</span><img class="lightbox-content" alt="Expanded image">`;
    document.body.appendChild(lb);
    lb.querySelector(".close-btn").onclick = ()=> lb.remove();
    lb.addEventListener("click",(e)=>{ if(e.target === lb) lb.remove(); });
  }
  lb.querySelector(".lightbox-content").src = url;
}

function renderProjects(data, lang){
  const grid = document.querySelector(".project-grid");
  if(!grid) return;

  const projects = Array.isArray(data.projects) ? data.projects : [];
  grid.innerHTML = "";

  projects.forEach(p=>{
    const title = t(p.title, lang);
    const desc  = t(p.desc, lang);
    const image = p.image || "";

    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-image-container">
        <img src="${image}" alt="${title || 'Project image'}" class="project-img">
        <i class="fas fa-search-plus expand-icon"></i>
      </div>
      <div class="card-content-portfolio">
        <h3>${title}</h3>
        <p>${desc}</p>
      </div>
    `;
    card.querySelector(".project-image-container").onclick = ()=> openLightbox(image);
    grid.appendChild(card);
  });
}

async function loadPortfolio(){
  const data = await fetchJson("/content/portfolio_data.json");
  const lang = getLang();

  setHero(data, lang);
  renderProjects(data, lang);

  // If page has a setLanguage function, we hook it to re-render after language change
  if(typeof window.setLanguage === "function"){
    const original = window.setLanguage;
    window.setLanguage = function(newLang){
      try { localStorage.setItem("lang", newLang); } catch(e){}
      original(newLang);
      setHero(data, newLang);
      renderProjects(data, newLang);
    };
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadPortfolio().catch(err=> console.error(err));
});
