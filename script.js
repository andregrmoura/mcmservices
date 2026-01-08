// ============================
// 1. OBJETO DE TRADUÇÃO (COMPLETO E ATUALIZADO)
// ============================
const translations = {
    'en': {
        // Modal Pop-up
        'modal-title': 'Elevated Residential Projects',
        'modal-text': 'Exclusive consulting and management for high-end homes in Miami',
        'modal-btn': 'Schedule NowBook a Private Consultation',
        
        // Hero Titles (Premium)
        'hero1-title': 'Project Management for High-End Homes',
        'hero1-subtitle': 'From concept to completion — seamless coordination and quality control.',
        'hero2-title': 'Premium Residential Project Oversight', 
        'hero2-subtitle': 'Flawless execution delivered with transparency and strategic planning.',
        'hero3-title': 'Structure and Precision for Your Vision',
        'hero3-subtitle': 'Risk mitigation, budget control, and high-quality craftsmanship, guaranteed.',
        'hero-btn': 'Request Exclusive Project',
        'hero-btn-portfolio': 'View Portfolio', 
        
        // About Section (Premium)
        'about-title': 'Why Choose Us', 
        'about-p1': 'We manage every step of your home improvement project with precision, transparency, and high-end craftsmanship — ensuring your home receives the expertise it deserves.',
        'about-p2': 'Our approach is focused on structure, **communication** and **risk control**, offering homeowners peace of mind while every phase of the project is managed with precision.',
        'about-p3': 'Our founder holds **qualifications in Project Management from FIU (Florida International University)**, and important **certifications** in **OSHA** and **NCCER**, reinforcing our commitment to safety, quality, and professional standards.',


        // Default (Mantido)
        'nav-home': 'Home', 'nav-about': 'About', 'nav-contact': 'Contact', 'nav-gallery': 'Gallery', 'client-login': 'Client Login',
        'services-title': 'Our Project Management Services',
        'service1-title': 'Initiation & Scope', 'service1-text': 'We clearly define the **scope**, establishing measurable **goals** and objectives. We create initial documentation, identify stakeholders, and structure the work plan to ensure full alignment from the start.',
        'service2-title': 'Schedules & Time Management', 'service2-text': 'We develop realistic and detailed schedules (Gantt/PERT). We optimize the allocation of **resources** (team, materials, budget) to keep the project on track and maximize efficiency.',
        'service3-title': 'Risk & Quality', 'service3-text': 'We perform proactive **risk** identification, analysis, and monitoring to mitigate impacts. We implement rigorous **quality** control to ensure all deliverables meet defined standards.',
        'service4-title': 'Stakeholders', 'service4-text': 'We maintain transparent and constant **communication** with everyone involved. We prepare clear status reports and manage **stakeholder** expectations to ensure continuous satisfaction and collaboration.',
        'service5-title': 'Budget & Cost Control', 'service5-text': 'We manage the project **budget** with precision. We monitor costs, control cash flow, and use Earned Value (EVA) techniques to ensure the project is completed within financial constraints.',
        'service6-title': 'Final Delivery', 'service6-text': 'We handle the final delivery, formal client acceptance, and administrative **closure**. We collect **lessons learned** to refine processes and ensure continuous improvement in future projects.',
        'testimonials-title': 'Client Testimonials',
        'testimonial1-text': 'MCM Services delivered outstanding management. The **schedule** was precise and the **budget** control kept everything smooth. Total professionalism.',
        'testimonial2-text': 'They coordinated our renovation with precision. Excellent **communication**, **risk control** and high-quality final result.',
        'testimonial3-text': 'Outstanding **stakeholder coordination** on a complex interior design project. High-end service from start to finish.',
        'contact-title': 'Request a Project Estimate', 'contact-subtitle': 'Start transforming your project today. Excellence in management from start to finish.',
        'contact-input-name': 'Your Name', 'contact-input-email': 'Your Email', 'contact-input-msg': 'Describe your project, timeline, and location',
        'contact-btn-submit': 'Request Estimate', 'contact-btn-whatsapp': 'Contact via WhatsApp',
        'footer-tagline': 'Management Excellence, Flawless Execution.', 'footer-location': 'Miami, FL', 
        'footer-nav': 'Navigation', 'footer-contact': 'Contact & Connect', 'footer-legal': 'Legal', 
        'footer-terms': 'Terms of Use', 'footer-privacy': 'Privacy Policy', 'footer-dev': 'Developed by Andre Moura',
        'footer-copy': 'MCM Services Pro Solutions. All rights reserved.',
    },
    'pt': {
        // Modal Pop-up
        'modal-title': 'Bem-vindo(a) à MCM Services',
        'modal-text': 'Agende uma consulta exclusiva para discutir seu projeto residencial de alto padrão em Miami-Dade ou Broward.',
        'modal-btn': 'Agendar Agora',

        // Hero Titles (Premium)
        'hero1-title': 'Gerenciamento de Projetos para Residências de Alto Padrão',
        'hero1-subtitle': 'Do conceito à conclusão — coordenação e controle de qualidade impecáveis.',
        'hero2-title': 'Supervisão Premium de Projetos Residenciais', 
        'hero2-subtitle': 'Execução impecável entregue com transparência e planejamento estratégico.',
        'hero3-title': 'Estrutura e Precisão para a Sua Visão',
        'hero3-subtitle': 'Mitigação de riscos, controle de orçamento e acabamento de alta qualidade, garantidos.',
        'hero-btn': 'Solicitar Projeto Exclusivo',
        'hero-btn-portfolio': 'Ver Portfólio', 
        
        // About Section (Premium)
        'about-title': 'Por Que Nos Escolher', 
        'about-p1': 'Gerenciamos cada etapa do seu projeto residencial com precisão, transparência e alta qualidade de execução — garantindo que sua casa receba a expertise que merece.',
        'about-p2': 'Nossa abordagem foca em estrutura, **comunicação** e **controle de risco**, oferecendo tranquilidade aos proprietários enquanto cada fase do projeto é gerenciada com precisão.',
        'about-p3': 'Nosso fundador possui **qualificação em Gerenciamento de Projetos pela FIU (Universidade Internacional da Florida)**, e importantes **certificações** em **OSHA** e **NCCER**, o que reforça nosso compromisso com segurança, qualidade e padrões profissionais.',

        // Default (Mantido)
        'nav-home': 'Início', 'nav-about': 'Sobre', 'nav-contact': 'Contato', 'nav-gallery': 'Galeria', 'client-login': 'Login do Cliente',
        'services-title': 'Nossos Serviços de Gerenciamento',
        'service1-title': 'Iniciação e Escopo', 'service1-text': 'Definimos claramente o **escopo**, estabelecendo **metas** e objetivos mensuráveis. Criamos a documentação inicial, identificamos stakeholders e estruturamos o plano de trabalho para alinhamento total desde o início.',
        'service2-title': 'Cronograma e Tempo', 'service2-text': 'Desenvolvemos cronogramas detalhados e realistas (Gantt/PERT). Otimizamos a alocação de **recursos** (equipe, materiais, orçamento) para manter o projeto no prazo e maximizar a eficiência.',
        'service3-title': 'Risco e Qualidade', 'service3-text': 'Realizamos identificação, análise e monitoramento proativos de **riscos** para mitigar impactos. Implementamos um rigoroso controle de **qualidade** para garantir que todas as entregas atendam aos padrões definidos.',
        'service4-title': 'Partes Interessadas (Stakeholders)', 'service4-text': 'Mantemos **comunicação** transparente e constante com todos os envolvidos. Preparamos relatórios de status claros e gerenciamos as expectativas das **partes interessadas** para garantir satisfação e colaboração contínuas.',
        'service5-title': 'Orçamento e Custos', 'service5-text': 'Gerenciamos o **orçamento** do projeto com precisão. Monitoramos custos, controlamos o fluxo de caixa e usamos técnicas de Valor Agregado (EVA) para garantir que o projeto seja concluído dentro das restrições financeiras.',
        'service6-title': 'Entrega Final', 'service6-text': 'Lidamos com a entrega final, aceitação formal do cliente e **encerramento** administrativo. Coletamos **lições aprendidas** para refinar processos e garantir a melhoria contínua em projetos futuros.',
        'testimonials-title': 'Depoimentos de Clientes',
        'testimonial1-text': 'A MCM Services entregou um gerenciamento excepcional. O **cronograma** foi preciso e o **controle de orçamento** manteve tudo tranquilo. Profissionalismo total.',
        'testimonial2-text': 'Eles coordenaram nossa reforma com precisão. Excelente **comunicação**, **controle de risco** e resultado final de alta qualidade.',
        'testimonial3-text': 'Coordenação de **stakeholders** excepcional em um projeto complexo de design de interiores. Serviço de alto padrão do início ao fim.',
        'contact-title': 'Solicite um Orçamento de Projeto', 'contact-subtitle': 'Comece a transformar seu projeto hoje. Excelência em gestão do início ao fim.',
        'contact-input-name': 'Seu Nome', 'contact-input-email': 'Seu E-mail', 'contact-input-msg': 'Descreva seu projeto, cronograma e localização',
        'contact-btn-submit': 'Solicitar Orçamento', 'contact-btn-whatsapp': 'Contato via WhatsApp',
        'footer-tagline': 'Excelência em Gestão, Execução Impecável.', 'footer-location': 'Miami, FL', 
        'footer-nav': 'Navegação', 'footer-contact': 'Contato e Conexão', 'footer-legal': 'Legal', 
        'footer-terms': 'Termos de Uso', 'footer-privacy': 'Política de Privacidade', 'footer-dev': 'Desenvolvido por Andre Moura',
        'footer-copy': 'MCM Services Pro Solutions. Todos os direitos reservados.',
    },
    'es': {
        // Modal Pop-up
        'modal-title': 'Bienvenido(a) a MCM Services',
        'modal-text': 'Agende una consulta exclusiva para discutir su proyecto residencial de alta gama en Miami-Dade o Broward.',
        'modal-btn': 'Agendar Ahora',
        
        // Hero Titles (Premium)
        'hero1-title': 'Gestión de Proyectos para Residencias de Alta Gama',
        'hero1-subtitle': 'Desde el concepto hasta la finalización — coordinación y control de calidad impecables.',
        'hero2-title': 'Supervisión Premium de Proyectos Residenciales', 
        'hero2-subtitle': 'Ejecución impecable entregada con transparencia y planificación estratégica.',
        'hero3-title': 'Estrutura y Precisión para Su Visión',
        'hero3-subtitle': 'Mitigación de riesgos, control de presupuesto y artesanía de alta calidad, garantizados.',
        'hero-btn': 'Solicitar Proyecto Exclusivo',
        'hero-btn-portfolio': 'Ver Portafolio', 
        
        // About Section (Premium)
        'about-title': 'Por Qué Elegirnos', 
        'about-p1': 'Gestionamos cada paso de su proyecto residencial con precisión, transparencia y alta calidad de ejecución, garantizando que su hogar reciba la experiencia que merece.',
        'about-p2': 'Nuestro enfoque se centra en la estructura, la **comunicação** y el **control de riesgos**, ofreciendo tranquilidad a los propietarios mientras cada fase del proyecto se gestiona con precisión.',
        'about-p3': 'Nuestro fundador posee **calificación en Gestión de Proyectos por la FIU (Universidad Internacional de Florida)**, y importantes **certificaciones** en **OSHA** y **NCCER**, lo que refuerza nuestro compromiso con seguridad, calidad y estándares profesionales.',

        // Default (Mantido)
        'nav-home': 'Inicio', 'nav-about': 'Nosotros', 'nav-contact': 'Contacto', 'nav-gallery': 'Galería', 'client-login': 'Acceso Clientes',
        'services-title': 'Nuestros Servicios de Gestión',
        'service1-title': 'Iniciación y Alcance', 'service1-text': 'Definimos claramente el **alcance**, estableciendo **metas** y objetivos medibles. Creamos la documentación inicial, identificamos a los stakeholders y estructuramos el plan de trabajo para una alineação total desde el inicio.',
        'service2-title': 'Cronogramas y Tiempo', 'service2-text': 'Desarrollamos cronogramas detallados y realistas (Gantt/PERT). Optimizamos la asignación de **recursos** (equipo, materiales, presupuesto) para mantener el proyecto a tiempo y maximizar la eficiencia.',
        'service3-title': 'Riesgo y Calidad', 'service3-text': 'Realizamos identificación, análisis y monitoreo proactivo de **riesgos** para mitigar impactos. Implementamos um rigoroso control de **calidad** para asegurar que todas las entregas cumplan con los estándares definidos.',
        'service4-title': 'Partes Interesadas (Stakeholders)', 'service4-text': 'Mantemos **comunicación** transparente e constante con todos los involucrados. Preparamos informes de estado claros e gerenciamos las expectativas de las **partes interesadas** para garantir a satisfação e colaboração continuas.',
        'service5-title': 'Presupuesto y Costos', 'service5-text': 'Gestionamos el **presupuesto** del proyecto con precisión. Monitoreamos los costos, controlamos el flujo de caixa e utilizamos técnicas de Valor Ganado (EVA) para asegurar que o projeto se complete dentro de las restricciones financieras.',
        'service6-title': 'Entrega Final', 'service6-text': 'Manejamos la entrega final, la aceptación formal del cliente y el **cierre** administrativo. Recopilamos **lições aprendidas** para refinar processos e garantir a melhora continua em projetos futuros.',
        'testimonials-title': 'Testimonios de Clientes',
        'testimonial1-text': 'MCM Services brindó una gestión excepcional. El **cronograma** fue preciso y el **control de presupuesto** mantuvo todo fluido. Profesionalismo total.',
        'testimonial2-text': 'Coordinaron nuestra renovación con precisión. Excelente **comunicação**, **control de riesgos** y un resultado final de alta calidad.',
        'testimonial3-text': 'Excelente **coordinación de stakeholders** en un proyecto complejo de diseño de interiores. High-end service from start to finish.',
        'contact-title': 'Solicite una Estimación de Proyecto', 'contact-subtitle': 'Comience a transformar su proyecto hoy. Excelencia en gestión de principio a fin.',
        'contact-input-name': 'Su Nombre', 'contact-input-email': 'Su Correo Electrónico', 'contact-input-msg': 'Describa su proyecto, cronograma y ubicación',
        'contact-btn-submit': 'Solicitar Estimación', 'contact-btn-whatsapp': 'Contactar vía WhatsApp',
        'footer-tagline': 'Excelência en la Gestión, Ejecución Impecável.', 'footer-location': 'Miami, FL', 
        'footer-nav': 'Navegación', 'footer-contact': 'Contacto y Conexión', 'footer-legal': 'Legal', 
        'footer-terms': 'Términos de Uso', 'footer-privacy': 'Política de Privacidade', 'footer-dev': 'Desarrollado por Andre Moura',
        'footer-copy': 'MCM Services Pro Solutions. Todos los derechos reservados.',
    }
};

let currentLang = localStorage.getItem('language') || 'en';
const supportedLangs = ['en', 'pt', 'es'];


// ===================================
// 2. FUNÇÕES GERAIS E DE TRADUÇÃO
// ===================================

function updateTexts(lang) {
    const dictionary = translations[lang];
    if (!dictionary) return;

    document.getElementById("currentYear").textContent = new Date().getFullYear(); 

    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        const translation = dictionary[key];

        if (translation) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.setAttribute('placeholder', translation);
            } 
            else {
                // Substitui **texto** por <strong>texto</strong> e insere o HTML
                element.innerHTML = translation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
        }
    });
}

window.setLanguage = function(lang) {
    if (!translations[lang]) { lang = 'en'; }
    localStorage.setItem('language', lang);
    currentLang = lang;
    updateTexts(lang);
    
    // Atualiza o estado ativo de todas as bandeiras (desktop e mobile)
    document.querySelectorAll('.lang-switcher img, .mobile-nav-flags img').forEach(img => {
        img.classList.remove("active");
        if (img.getAttribute('data-lang') === lang) {
            img.classList.add("active");
        }
    });
    
    document.documentElement.lang = lang;
}

// Função para abrir/fechar o menu sanduíche
window.toggleMenu = function() {
    const body = document.body;
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const isMenuOpen = body.classList.contains('menu-open');
    
    if (isMenuOpen) {
        body.classList.remove('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        // Mudar ícone para barras
        hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
    } else {
        body.classList.add('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        // Mudar ícone para X (fechar)
        hamburgerBtn.innerHTML = '<i class="fas fa-times"></i>';
    }
}


// ======================================
// MODAL POPUP (Janela ao Abrir) - NOVO!
// ======================================
const modal = document.getElementById('welcomeModal');
    
function openModal() {
    // Verifica se o modal já foi exibido nesta sessão
    if (sessionStorage.getItem('modalShown') !== 'true') {
        modal.classList.add('open');
        document.body.classList.add('menu-open'); // Usa a mesma classe para travar o scroll
    }
}

window.closeModal = function() {
    modal.classList.remove('open');
    document.body.classList.remove('menu-open');
    // Define que o modal foi exibido para não aparecer novamente na mesma sessão
    sessionStorage.setItem('modalShown', 'true'); 
}


// ============================
// HERO Slider (100vh Fade Suave)
// ============================
let currentSlide = 0;
const slides = document.querySelectorAll(".hero-slide");
const dots = document.querySelectorAll(".dot");

function showSlide(index) {
// Reset animations by removing/re-adding the active class
slides.forEach(slide => slide.classList.remove("active"));
dots.forEach(dot => dot.classList.remove("active"));

if (slides[index]) slides[index].classList.add("active");
if (dots[index]) dots[index].classList.add("active");

currentSlide = index;
}

function nextSlide() {
currentSlide = (currentSlide + 1) % slides.length;
showSlide(currentSlide);
}

let slideInterval = setInterval(nextSlide, 9000);

dots.forEach(dot => {
dot.addEventListener("click", () => {
    clearInterval(slideInterval);
    showSlide(parseInt(dot.dataset.slide));
    slideInterval = setInterval(nextSlide, 9000);
});
});

// Initial calls
showSlide(0); 


/// ============================
// Carousel de Serviços (FINAL – viewport scroll)
// ============================
window.moveCarousel = function(direction) {
  const viewport = document.querySelector('.carousel-viewport');
  const track = document.querySelector('.service-cards-carousel');
  if (!viewport || !track) return;

  const card = track.querySelector('.card-style');
  if (!card) return;

  const gap = parseFloat(getComputedStyle(track).gap) || 0;

  // (mobile) se não tiver gap, usa margens do card
  const cs = getComputedStyle(card);
  const m = (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);

  const step = card.getBoundingClientRect().width + (gap || m);

  viewport.scrollBy({ left: direction * step, behavior: 'smooth' });
};

// Adiciona um listener para atualizar a largura quando a tela for redimensionada
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    // Atraso de 100ms para evitar recálculos excessivos durante o redimensionamento
    resizeTimeout = setTimeout(() => {
        // Chamada com direction=0 para forçar o recálculo e o posicionamento
        // do card atualmente visível, sem efetuar movimento extra.
        window.moveCarousel(0);
        if (typeof updateServiceCarouselButtons === 'function') updateServiceCarouselButtons();
}, 100); 
});

// ============================
// Carousel Buttons State (disable at ends)
// ============================
function updateServiceCarouselButtons() {
  const viewport = document.querySelector('.carousel-viewport');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  if (!viewport || !prevBtn || !nextBtn) return;

  const eps = 2;
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;

  const atStart = viewport.scrollLeft <= eps;
  const atEnd = viewport.scrollLeft >= (maxScroll - eps);

  prevBtn.disabled = atStart;
  nextBtn.disabled = atEnd;
}

// Update on load + scroll + resize
document.addEventListener('DOMContentLoaded', () => {
  const viewport = document.querySelector('.carousel-viewport');
  if (viewport) viewport.addEventListener('scroll', () => updateServiceCarouselButtons(), { passive: true });
  updateServiceCarouselButtons();
});


/* =========================================================
   FOOTER LEGAL LINKS FIX (Terms / Privacy)
   - Does NOT change header/footer structure
   - Sets correct hrefs on all pages (root and nested /projects/*)
   ========================================================= */
(function () {
  function normalizeLang(raw) {
    var v = (raw || '').toLowerCase();
    if (v.indexOf('pt') === 0) return 'pt';
    if (v.indexOf('es') === 0) return 'es';
    return 'en';
  }

  function getLang() {
    try {
      var ls = localStorage.getItem('language');
      if (ls) return normalizeLang(ls);
    } catch (e) {}
    return normalizeLang(document.documentElement.lang || (navigator.language || 'en'));
  }

  function getRootPrefix() {
    // build prefix to site root based on current path depth
    // e.g. /portfolio.html -> ""
    //      /projects/index.html -> "../"
    //      /projects/khoudari/index.html -> "../../"
    var path = (window.location && window.location.pathname) ? window.location.pathname : '';
    path = path.split('?')[0].split('#')[0];

    var parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return ''; // at root

    // remove the file name
    parts.pop();
    var depth = parts.length;
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    return prefix;
  }

  function setHref(sel, href) {
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('href', href);
    }
  }

  function applyFix() {
    var lang = getLang();
    var prefix = getRootPrefix();

    var termsFile = (lang === 'pt') ? 'terms-pt.html' : (lang === 'es') ? 'terms-es.html' : 'terms.html';
    var privFile  = (lang === 'pt') ? 'privacy-pt.html' : (lang === 'es') ? 'privacy-es.html' : 'privacy.html';

    var termsHref = prefix + termsFile;
    var privHref  = prefix + privFile;

    // Supports both patterns used across your pages
    setHref('#link-terms', termsHref);
    setHref('#link-privacy', privHref);
    setHref('a[data-translate="footer-terms"]', termsHref);
    setHref('a[data-translate="footer-privacy"]', privHref);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  } else {
    applyFix();
  }

  // If your site switches language dynamically, keep links synced
  try {
    if (typeof window.setLanguage === 'function' && !window.__footerLegalFixWrapped) {
      var originalSetLanguage = window.setLanguage;
      window.setLanguage = function () {
        var out = originalSetLanguage.apply(this, arguments);
        applyFix();
        return out;
      };
      window.__footerLegalFixWrapped = true;
    }
  } catch (e) {}
})();

