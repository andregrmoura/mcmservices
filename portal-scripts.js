//
// ===============================================
// portal-scripts.js: Lógica de Autenticação e Dados do Firebase
// Este script é executado em portal.html
// ===============================================
//

// Importações necessárias para Auth e Firestore (ATUALIZADO PARA V10.x.x)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Firebase Configuration (MANTIDA IDÊNTICA)
const firebaseConfig = {
    apiKey: "AIzaSyAw4bA0M8bc8Qt0fvS5xmc2SBYQkxTVR7g",
    authDomain: "mcm-services-corp.firebaseapp.com",
    projectId: "mcm-services-corp",
    storageBucket: "mcm-services-corp.firebasestorage.app",
    messagingSenderId: "433317388623",
    appId: "1:433317388623:web:9db1f24060f026a670e53a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allProjectsData = []; 
const loader = document.getElementById('loader');
const projectsList = document.getElementById('projects-list');
const noProjectsMessage = document.getElementById('no-projects');
const welcomeMessageElement = document.getElementById('welcome-message');
const clientNameElement = document.getElementById('clientName');
const clientEmailElement = document.getElementById('clientEmail');
const clientPhoneElement = document.getElementById('clientPhone');
const clientAddressElement = document.getElementById('clientAddress');


// --- FUNÇÕES DE LÓGICA E UTILIDADE (SEM MUDANÇAS) ---

function getStatusClass(status) {
    if (status === 'Active') return 'status-active';
    if (status === 'Completed') return 'status-completed';
    if (status === 'Pending') return 'status-pending';
    return '';
}

function getStatusBgClass(status) {
    if (status === 'Active') return 'status-bg-active';
    if (status === 'Pending') return 'status-bg-pending';
    if (status === 'Completed') return 'status-bg-completed';
    return '';
}

function getFormattedDate(firebaseDate) {
    if (!firebaseDate) { return 'N/A'; }
    let jsDate;
    // Verifica se é um timestamp do Firebase
    if (firebaseDate && typeof firebaseDate.toDate === 'function') {
        jsDate = firebaseDate.toDate();
    }
    // Tenta converter se for string ou número (fallback)
    else {
        try {
            jsDate = new Date(firebaseDate);
             // Verifica se a data resultante é válida
             if (isNaN(jsDate.getTime())) throw new Error("Invalid date value");
        } catch (e) {
            console.error("Data inválida recebida:", firebaseDate, e);
            return 'Invalid Date';
        }
    }
    // Formata a data válida
    return jsDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}


// **IMPORTANTE**: Garante que a função global updateTableDataLabels exista antes de chamá-la
function renderProjects(projectsToRender) {
    projectsList.innerHTML = ''; // Limpa a lista atual

    if (!projectsToRender || projectsToRender.length === 0) {
        noProjectsMessage.style.display = 'block'; // Mostra mensagem "sem projetos"
        return; // Sai da função
    }
    noProjectsMessage.style.display = 'none'; // Esconde mensagem "sem projetos"

    projectsToRender.forEach(project => {
        const row = document.createElement('tr');
        const statusText = project.status || 'N/A';
        const badgeClass = getStatusClass(statusText);
        const bgClass = getStatusBgClass(statusText); // Classe para fundo da célula TD (opcional)

        // Lógica de Documentos (mantida)
        let documentsHtml = '';
        if (project.documents && Array.isArray(project.documents) && project.documents.length > 0) {
            // Novo formato (array de objetos)
            project.documents.forEach(doc => {
                 // Usa encodeURIComponent para nomes de arquivo com caracteres especiais
                 const safeName = encodeURIComponent(doc.name || 'Document');
                 const safeUrl = doc.url; // Assume que a URL já está correta
                 documentsHtml += `<a href="${safeUrl}" target="_blank" class="document-link" title="Open ${doc.name || 'Document'}"><i class="fas fa-file-alt"></i> ${doc.name || 'Document'}</a>`;
            });
        } else {
             documentsHtml = '<span style="color:#888;">N/A</span>';
        }


        const startDate = getFormattedDate(project.start_date);
        const completionDate = getFormattedDate(project.completion_date);
        const projectPrice = project.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.price) : 'N/A';
        const responsiblePerson = project.responsible_person || 'MCM Team';

        // Cria as células da tabela
        row.innerHTML = `
          <td data-label="Project Name">${project.name || 'No Name'}</td>
          <td data-label="Start Date">${startDate}</td>
          <td data-label="Completion Date">${completionDate}</td>
          <td data-label="Responsible">${responsiblePerson}</td>
          <td data-label="Price">${projectPrice}</td>
          <td data-label="Status" class="${bgClass}">
            <span class="status-badge ${badgeClass}">${statusText}</span>
          </td>
          <td data-label="Documents">${documentsHtml}</td>
        `;

        projectsList.appendChild(row);
    });

     // Chama a função global de atualização de data-labels APÓS renderizar
    if (typeof window.updateTableDataLabels === 'function') {
        const currentLang = localStorage.getItem('language') || 'en';
        window.updateTableDataLabels(currentLang);
    } else {
        console.warn("Função global updateTableDataLabels não encontrada.");
    }
}

// Expõe filterProjects globalmente para ser chamada pelo onchange=""
window.filterProjects = function() {
    const filterValue = document.getElementById('status-filter').value;

    if (filterValue === 'All') {
        renderProjects(allProjectsData); // Renderiza todos os projetos
    } else {
        // Filtra os projetos baseado no status selecionado
        const filtered = allProjectsData.filter(project => project.status === filterValue);
        renderProjects(filtered); // Renderiza apenas os projetos filtrados
    }
}

// Função para buscar dados do cliente e projetos
async function fetchProjects(user) {
    if (!user) {
        console.error("Usuário não autenticado ao tentar buscar projetos.");
        window.location.href = 'login.html'; // Redireciona se não houver usuário
        return;
    }

    loader.style.display = 'block'; // Mostra o loader
    projectsList.innerHTML = ''; // Limpa a lista
    noProjectsMessage.style.display = 'none'; // Esconde msg "sem projetos"
    allProjectsData = []; // Limpa dados antigos

    try {
        const uid = user.uid;
        const clientDocRef = doc(db, "Client", uid); // Referência ao documento do cliente
        const clientDoc = await getDoc(clientDocRef); // Busca o documento

        let clientName = 'N/A';

        // Preenche informações do cliente se o documento existir
        if (clientDoc.exists()) {
             const data = clientDoc.data();
             clientName = data.name || 'N/A';
             clientNameElement.textContent = clientName;
             clientEmailElement.textContent = user.email || 'N/A';
             clientPhoneElement.textContent = data.phone || 'N/A';
             clientAddressElement.textContent = data.address || 'N/A';
             // Define a mensagem de boas-vindas
             if (welcomeMessageElement) { // Verifica se o elemento existe
                welcomeMessageElement.textContent = `Welcome, ${clientName}!`;
                // Aplica tradução se a função global existir
                if (typeof window.applySingleTranslation === 'function') {
                    const currentLang = localStorage.getItem('language') || 'en';
                    // Traduz a mensagem de boas-vindas dinamicamente (exemplo)
                    // Você precisaria de uma chave específica para "Welcome, {name}!"
                    // window.applySingleTranslation(welcomeMessageElement, 'welcomeUserMessage', currentLang, { name: clientName });
                }
             }

        } else {
             // Se o documento do cliente não existe, preenche com N/A
             console.warn("Documento do cliente não encontrado para UID:", uid);
             clientNameElement.textContent = 'N/A';
             clientEmailElement.textContent = user.email || 'N/A';
             clientPhoneElement.textContent = 'N/A';
             clientAddressElement.textContent = 'N/A';
             if (welcomeMessageElement) {
                welcomeMessageElement.textContent = `Welcome! (Client profile not found)`;
             }
        }

        // Busca os projetos do cliente
        const projectsRef = collection(db, "Client", uid, "projects"); // Referência à subcoleção 'projects'
        const querySnapshot = await getDocs(projectsRef); // Busca os documentos da subcoleção

        querySnapshot.forEach((projectDoc) => {
            allProjectsData.push({ id: projectDoc.id, ...projectDoc.data() }); // Adiciona cada projeto ao array
        });

        // Ordena os projetos (opcional, exemplo por data de início, mais recente primeiro)
        allProjectsData.sort((a, b) => {
            const dateA = a.start_date?.toDate ? a.start_date.toDate() : new Date(0);
            const dateB = b.start_date?.toDate ? b.start_date.toDate() : new Date(0);
            return dateB - dateA; // Descendente
        });


        renderProjects(allProjectsData); // Renderiza os projetos na tabela

    } catch (error) {
        console.error("Erro ao buscar dados do Firestore:", error);
        // Exibe mensagem de erro mais informativa
        noProjectsMessage.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error loading project data. Please try again later or contact support.</p>`;
        noProjectsMessage.style.display = 'block';
        alert("An error occurred while loading your project data. Please check the console for details.");
    } finally {
        loader.style.display = 'none'; // Esconde o loader, mesmo se houver erro
    }
}


// --- LÓGICA DE AUTENTICAÇÃO E INICIALIZAÇÃO ---

// Verifica o estado de autenticação QUANDO A PÁGINA CARREGA
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuário está logado, busca os projetos
    console.log("Usuário autenticado:", user.uid);
    fetchProjects(user); // Chama a função para buscar os dados
  } else {
    // Usuário não está logado, redireciona para login
    console.log("Usuário não autenticado, redirecionando para login.");
    window.location.href = 'login.html';
  }
});


// --- LÓGICA DE EVENTOS ---

// Logout Logic (sem mudanças)
const logoutButton = document.getElementById('logout-btn');
if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Tentando fazer logout...");
        try {
            await signOut(auth);
            console.log("Logout bem-sucedido.");
            window.location.href = 'login.html'; // Redireciona após logout
        } catch (error) {
            console.error("Erro durante o logout:", error);
            alert("Could not log out. Please try again.");
        }
    });
} else {
    console.warn("Botão de logout não encontrado.");
}


// --- INICIALIZAÇÃO NO DOMContentLoaded (Apenas para garantir link ativo e idioma inicial) ---
// Removida a chamada a startLoadingData daqui, pois onAuthStateChanged cuida disso.
document.addEventListener('DOMContentLoaded', () => {
    // Inicialização da Tradução (usa as funções GLOBAIS definidas no HTML)
    let currentLang = localStorage.getItem('language') || 'en';
    if (typeof window.setLanguage === 'function') {
        window.setLanguage(currentLang);
    } else {
        console.warn("Função global setLanguage não encontrada.");
    }

    // Garante que o link Portal/Login esteja ativo
    document.querySelectorAll('.main-nav-links a').forEach(link => link.classList.remove('active'));
    const portalLink = document.querySelector('[data-key="navPortal"]');
    if (portalLink) portalLink.classList.add('active');
});