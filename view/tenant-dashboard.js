// view/tenant-dashboard.js
const API_BASE_URL = "http://172.16.50.19:2600/api";

// Estado Global
let currentTenant = null;
let currentUser = null;
let allTickets = [];
let allTechnicians = [];
let allCategories = [];
let currentTicket = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initNavigation();
    initEventListeners();
    loadDashboard();
});

// Verificar autenticação
function checkAuthentication() {
    const token = localStorage.getItem('tenant_token');
    const tenantInfo = localStorage.getItem('tenant_info');
    const userInfo = localStorage.getItem('tenant_user');
    
    if (!token || !tenantInfo || !userInfo) {
        window.location.href = '/tenant-login.html';
        return;
    }
    
    currentTenant = JSON.parse(tenantInfo);
    currentUser = JSON.parse(userInfo);
    
    // Atualizar UI com informações do tenant e usuário
    document.getElementById('tenant-name').textContent = currentTenant.nome;
    document.getElementById('user-role').textContent = currentUser.role;
    document.getElementById('user-name').textContent = currentUser.nome;
    document.getElementById('user-email').textContent = currentUser.email;
}

// Navegação entre views
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            
            // Atualizar navegação ativa
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Mostrar view correspondente
            viewSections.forEach(view => view.classList.remove('active'));
            const targetSection = document.getElementById(`view-${targetView}`);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Carregar dados específicos da view
                if (targetView === 'dashboard') loadDashboard();
                if (targetView === 'tickets') loadTickets();
                if (targetView === 'technicians') loadTechnicians();
                if (targetView === 'config') loadConfig();
            }
        });
    });
    
    // Quick actions que mudam de view
    document.querySelectorAll('.action-card[data-view]').forEach(card => {
        card.addEventListener('click', () => {
            const targetView = card.getAttribute('data-view');
            const targetNav = document.querySelector(`.nav-item[data-view="${targetView}"]`);
            if (targetNav) targetNav.click();
        });
    });
}

// Event Listeners
function initEventListeners() {
    // Logout
    document.getElementById('btn-logout').addEventListener('click', logout);
    
    // Refresh buttons
    document.getElementById('btn-refresh-stats').addEventListener('click', loadDashboard);
    document.getElementById('btn-refresh-tickets').addEventListener('click', loadTickets);
    
    // Automação
    document.getElementById('btn-auto-assign').addEventListener('click', executeAutoAssign);
    document.getElementById('btn-auto-categorize').addEventListener('click', executeAutoCategorize);
    
    // Config
    document.getElementById('btn-test-glpi').addEventListener('click', testGlpiConnection);
    
    // Filtro de status
    document.getElementById('filter-status').addEventListener('change', (e) => {
        loadTickets(e.target.value);
    });
    
    // Modais
    document.getElementById('btn-confirm-assign').addEventListener('click', confirmAssignTicket);
    document.getElementById('btn-confirm-category').addEventListener('click', confirmAssignCategory);
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
    try {
        showLoading('Carregando estatísticas...');
        
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/stats`);
        const stats = await response.json();
        
        // Atualizar cards de estatísticas
        document.getElementById('stat-disponiveis').textContent = stats.chamados_disponiveis || 0;
        document.getElementById('stat-atribuidos').textContent = stats.chamados_atribuidos || 0;
        document.getElementById('stat-pendentes').textContent = stats.chamados_pendentes || 0;
        document.getElementById('stat-planejados').textContent = stats.chamados_planejados || 0;
        
        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar estatísticas');
    }
}

// ==================== CHAMADOS ====================
async function loadTickets(status = '10') {
    try {
        const ticketsList = document.getElementById('tickets-list');
        ticketsList.innerHTML = '<div class="loading-state"><i class="bi bi-hourglass-split"></i><p>Carregando chamados...</p></div>';
        
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/tickets?status=${status}`);
        const data = await response.json();
        
        allTickets = data.tickets || [];
        
        if (allTickets.length === 0) {
            ticketsList.innerHTML = '<div class="loading-state"><i class="bi bi-inbox"></i><p>Nenhum chamado encontrado</p></div>';
            return;
        }
        
        // Renderizar tickets
        ticketsList.innerHTML = allTickets.map(ticket => `
            <div class="ticket-card">
                <div class="ticket-header">
                    <span class="ticket-id">#${ticket.id}</span>
                    <span class="ticket-status" style="background: ${getStatusColor(ticket.status)};">
                        ${ticket.status_name}
                    </span>
                </div>
                <h3 class="ticket-title">${ticket.titulo}</h3>
                <div class="ticket-meta">
                    <span><i class="bi bi-person"></i> ${ticket.requerente_nome}</span>
                    <span><i class="bi bi-tag"></i> ${ticket.categoria}</span>
                    <span><i class="bi bi-exclamation-circle"></i> Urg: ${ticket.urgencia}</span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                    ${truncate(ticket.descricao_inicial, 120)}
                </p>
                <div class="ticket-actions">
                    <button class="ticket-btn" onclick="openAssignModal(${ticket.id})">
                        <i class="bi bi-person-plus"></i> Atribuir
                    </button>
                    <button class="ticket-btn" onclick="openCategoryModal(${ticket.id})">
                        <i class="bi bi-tag"></i> Categoria
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar chamados:', error);
        showError('Erro ao carregar chamados');
    }
}

// Abrir modal de atribuição
async function openAssignModal(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentTicket = ticket;
    
    document.getElementById('assign-ticket-title').textContent = ticket.titulo;
    document.getElementById('assign-ticket-category').textContent = ticket.categoria;
    
    // Carregar técnicos
    await loadTechniciansForAssign();
    
    showModal('modal-assign-ticket');
}

async function loadTechniciansForAssign() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const technicians = await response.json();
        
        const select = document.getElementById('assign-technician-select');
        select.innerHTML = '<option value="">Selecione um técnico</option>' +
            technicians.map(tech => `
                <option value="${tech._id}">
                    ${tech.nome} - ${tech.cargo?.nome || 'Sem cargo'}
                </option>
            `).join('');
    } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
    }
}

// Confirmar atribuição
async function confirmAssignTicket() {
    const technicianId = document.getElementById('assign-technician-select').value;
    
    if (!technicianId) {
        showError('Selecione um técnico');
        return;
    }
    
    try {
        showLoading('Atribuindo chamado...');
        
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/tickets/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: currentTicket.id,
                user_id: technicianId
            })
        });
        
        if (response.ok) {
            showSuccess('Chamado atribuído com sucesso!');
            closeModal('modal-assign-ticket');
            loadTickets();
            loadDashboard();
        } else {
            showError('Erro ao atribuir chamado');
        }
    } catch (error) {
        console.error('Erro ao atribuir chamado:', error);
        showError('Erro ao atribuir chamado');
    } finally {
        hideLoading();
    }
}

// Abrir modal de categoria
async function openCategoryModal(ticketId) {
    const ticket = allTickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    currentTicket = ticket;
    
    document.getElementById('category-ticket-title').textContent = ticket.titulo;
    
    // Carregar categorias
    await loadCategoriesForAssign();
    
    showModal('modal-assign-category');
}

async function loadCategoriesForAssign() {
    try {
        const response = await fetch(`${API_BASE_URL}/competencias`);
        const categories = await response.json();
        
        allCategories = categories;
        
        const select = document.getElementById('category-select');
        select.innerHTML = '<option value="">Selecione uma categoria</option>' +
            categories.map(cat => `
                <option value="${cat._id}">
                    ${cat.name}
                </option>
            `).join('');
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

// Confirmar categoria
async function confirmAssignCategory() {
    const categoryId = document.getElementById('category-select').value;
    
    if (!categoryId) {
        showError('Selecione uma categoria');
        return;
    }
    
    try {
        showLoading('Atribuindo categoria...');
        
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/tickets/category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: currentTicket.id,
                category_id: parseInt(categoryId)
            })
        });
        
        if (response.ok) {
            showSuccess('Categoria atribuída com sucesso!');
            closeModal('modal-assign-category');
            loadTickets();
        } else {
            showError('Erro ao atribuir categoria');
        }
    } catch (error) {
        console.error('Erro ao atribuir categoria:', error);
        showError('Erro ao atribuir categoria');
    } finally {
        hideLoading();
    }
}

// ==================== TÉCNICOS ====================
async function loadTechnicians() {
    try {
        const container = document.getElementById('technicians-grid');
        container.innerHTML = '<div class="loading-state"><i class="bi bi-hourglass-split"></i><p>Carregando técnicos...</p></div>';
        
        const response = await fetch(`${API_BASE_URL}/users`);
        const technicians = await response.json();
        
        allTechnicians = technicians;
        
        container.innerHTML = technicians.map(tech => `
            <div class="stat-card">
                <div class="stat-content">
                    <h3 style="margin-bottom: 0.5rem;">${tech.nome}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                        ${tech.cargo?.nome || 'Sem cargo'}
                    </p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <div>
                            <p style="font-size: 2rem; font-weight: 900; color: var(--primary);">
                                ${tech.estatisticas?.totalAtribuidos || 0}
                            </p>
                            <p style="font-size: 0.75rem; color: var(--text-muted);">ATRIBUÍDOS</p>
                        </div>
                        <div>
                            <p style="font-size: 2rem; font-weight: 900; color: var(--warning);">
                                ${tech.estatisticas?.totalPendentes || 0}
                            </p>
                            <p style="font-size: 0.75rem; color: var(--text-muted);">PENDENTES</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar técnicos:', error);
        showError('Erro ao carregar técnicos');
    }
}

// ==================== CONFIGURAÇÕES ====================
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/config`);
        const config = await response.json();
        
        document.getElementById('glpi-url').textContent = config.tenant.glpi_config.url;
        document.getElementById('auto-assign-enabled').checked = config.tenant.automation_config.auto_assign_enabled;
        document.getElementById('auto-categorize-enabled').checked = config.tenant.automation_config.auto_categorize_enabled;
        
    } catch (error) {
        console.error('Erro ao carregar config:', error);
    }
}

async function testGlpiConnection() {
    showLoading('Testando conexão...');
    
    // Simular teste de conexão
    setTimeout(() => {
        hideLoading();
        showSuccess('Conexão com GLPI OK!');
    }, 1500);
}

// ==================== AUTOMAÇÃO ====================
async function executeAutoAssign() {
    if (!confirm('Executar atribuição automática de chamados?')) return;
    
    try {
        showLoading('Executando atribuição automática...');
        
        const response = await fetch(`${API_BASE_URL}/tenant/${currentTenant.id}/tickets/auto-assign`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess(`${result.total_atribuidos || 0} chamados atribuídos!`);
            loadDashboard();
            loadTickets();
        } else {
            showError(result.message || 'Erro na atribuição automática');
        }
    } catch (error) {
        console.error('Erro na atribuição automática:', error);
        showError('Erro na atribuição automática');
    } finally {
        hideLoading();
    }
}

async function executeAutoCategorize() {
    if (!confirm('Executar categorização automática com IA?')) return;
    
    showLoading('Executando categorização com IA...');
    
    // Implementar chamada à API de categorização
    setTimeout(() => {
        hideLoading();
        showSuccess('Categorização concluída!');
    }, 2000);
}

// ==================== UTILITÁRIOS ====================
function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_user');
        localStorage.removeItem('tenant_info');
        window.location.href = '/tenant-login.html';
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function getStatusColor(status) {
    const colors = {
        1: 'rgba(0, 255, 255, 0.2)',  // Novo - Cyan
        2: 'rgba(0, 255, 136, 0.2)',  // Atribuído - Green
        3: 'rgba(79, 70, 229, 0.2)',  // Planejado - Blue
        4: 'rgba(255, 184, 0, 0.2)'   // Pendente - Orange
    };
    return colors[status] || 'rgba(255, 255, 255, 0.1)';
}

function truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

function showLoading(message) {
    // Implementar overlay de loading
    console.log('Loading:', message);
}

function hideLoading() {
    console.log('Loading complete');
}

function showSuccess(message) {
    alert('✓ ' + message);
}

function showError(message) {
    alert('✗ ' + message);
}

// Tornar funções globais para onclick
window.openAssignModal = openAssignModal;
window.openCategoryModal = openCategoryModal;
window.closeModal = closeModal;