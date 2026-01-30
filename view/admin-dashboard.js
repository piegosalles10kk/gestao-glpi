// admin-dashboard.js
const API_BASE_URL = "http://172.16.50.19:2600/api";

// Estado Global
let allTenants = [];
let allPlans = [];
let systemConfig = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initNavigation();
    initEventListeners();
    loadOverview();
});

// Verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('mcp_token');
    const user = localStorage.getItem('mcp_user');
    
    if (!token || !user) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        document.getElementById('admin-name').textContent = userData.nome || 'Administrador';
    } catch (e) {
        console.error('Erro ao parsear dados do usuário');
    }
}

// Navegação entre views
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            
            // Atualizar navegação ativa
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Mostrar seção correspondente
            sections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(`view-${targetView}`);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Carregar dados da view
                if (targetView === 'overview') loadOverview();
                if (targetView === 'tenants') loadTenants();
                if (targetView === 'plans') loadPlans();
                if (targetView === 'settings') loadSettings();
            }
        });
    });
}

// Event Listeners
function initEventListeners() {
    // Logout
    document.getElementById('btn-logout').addEventListener('click', logout);
    
    // Overview
    document.getElementById('btn-refresh-stats').addEventListener('click', loadOverview);
    
    // Tenants
    document.getElementById('btn-create-tenant').addEventListener('click', () => {
        openTenantModal();
    });
    
    document.getElementById('form-tenant').addEventListener('submit', handleTenantSubmit);
    
    // Plans
    document.getElementById('btn-create-plan').addEventListener('click', () => {
        openPlanModal();
    });
    
    document.getElementById('form-plan').addEventListener('submit', handlePlanSubmit);
    
    // Settings
    document.getElementById('btn-save-mp').addEventListener('click', saveMercadoPago);
    document.getElementById('btn-test-mp').addEventListener('click', testMercadoPago);
    document.getElementById('btn-save-general').addEventListener('click', saveGeneralSettings);
}

// ==================== OVERVIEW ====================
async function loadOverview() {
    try {
        showLoading('Carregando estatísticas...');
        
        const response = await fetch(`${API_BASE_URL}/admin/stats`);
        const stats = await response.json();
        
        // Atualizar cards
        document.getElementById('stat-total-tenants').textContent = stats.total_tenants || 0;
        document.getElementById('stat-active-tenants').textContent = stats.active_tenants || 0;
        document.getElementById('stat-total-plans').textContent = stats.total_plans || 0;
        
        // Formatar receita
        const revenue = stats.monthly_revenue || 0;
        document.getElementById('stat-revenue').textContent = 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue);
        
        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar overview:', error);
        showToast('Erro ao carregar estatísticas', 'error');
    }
}

// ==================== TENANTS ====================
async function loadTenants() {
    try {
        const tbody = document.getElementById('tenants-table-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="loading-state">
                        <i class="bi bi-hourglass-split"></i>
                        Carregando tenants...
                    </div>
                </td>
            </tr>
        `;
        
        const response = await fetch(`${API_BASE_URL}/admin/tenants`);
        allTenants = await response.json();
        
        if (allTenants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="loading-state">
                            <i class="bi bi-inbox"></i>
                            Nenhum tenant cadastrado
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = allTenants.map(tenant => {
            const statusBadge = getStatusBadge(tenant.billing.status);
            const createdAt = new Date(tenant.createdAt).toLocaleDateString('pt-BR');
            const planName = tenant.plan?.nome || 'Sem plano';
            const planValue = tenant.plan?.valor_mensal || 0;
            
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${tenant.nome}</div>
                    </td>
                    <td>
                        <code style="font-size: 0.8125rem; color: var(--gray-600);">${tenant.slug}</code>
                    </td>
                    <td>${planName}</td>
                    <td>${statusBadge}</td>
                    <td>R$ ${planValue.toFixed(2)}</td>
                    <td>${createdAt}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="editTenant('${tenant._id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${tenant.billing.status === 'active' ? 
                                `<button class="btn-icon" onclick="suspendTenant('${tenant._id}')" title="Suspender">
                                    <i class="bi bi-pause-circle"></i>
                                </button>` :
                                `<button class="btn-icon" onclick="reactivateTenant('${tenant._id}')" title="Reativar">
                                    <i class="bi bi-play-circle"></i>
                                </button>`
                            }
                            <button class="btn-icon delete" onclick="deleteTenant('${tenant._id}')" title="Deletar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar tenants:', error);
        showToast('Erro ao carregar tenants', 'error');
    }
}

function getStatusBadge(status) {
    const statusMap = {
        'active': { class: 'badge-success', text: 'Ativo' },
        'trial': { class: 'badge-info', text: 'Trial' },
        'suspended': { class: 'badge-warning', text: 'Suspenso' },
        'cancelled': { class: 'badge-error', text: 'Cancelado' }
    };
    
    const statusInfo = statusMap[status] || statusMap['active'];
    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

async function openTenantModal(tenantId = null) {
    // Carregar planos para o select
    const response = await fetch(`${API_BASE_URL}/admin/plans`);
    const plans = await response.json();
    
    const planSelect = document.getElementById('tenant-plan');
    planSelect.innerHTML = '<option value="">Selecione um plano</option>' +
        plans.map(plan => `
            <option value="${plan._id}">
                ${plan.nome} - R$ ${plan.valor_mensal.toFixed(2)}/mês
            </option>
        `).join('');
    
    if (tenantId) {
        // Modo edição - carregar dados do tenant
        const tenant = allTenants.find(t => t._id === tenantId);
        if (tenant) {
            document.getElementById('modal-tenant-title').textContent = 'Editar Tenant';
            document.getElementById('tenant-id').value = tenant._id;
            document.getElementById('tenant-nome').value = tenant.nome;
            document.getElementById('tenant-slug').value = tenant.slug;
            document.getElementById('tenant-plan').value = tenant.plan._id;
            // ... preencher outros campos
        }
    } else {
        // Modo criação - limpar formulário
        document.getElementById('modal-tenant-title').textContent = 'Novo Tenant';
        document.getElementById('form-tenant').reset();
        document.getElementById('tenant-id').value = '';
    }
    
    showModal('modal-tenant');
}

async function handleTenantSubmit(e) {
    e.preventDefault();
    
    const tenantId = document.getElementById('tenant-id').value;
    const isEditing = !!tenantId;
    
    const payload = {
        nome: document.getElementById('tenant-nome').value,
        slug: document.getElementById('tenant-slug').value,
        plan_id: document.getElementById('tenant-plan').value,
        glpi_url: document.getElementById('tenant-glpi-url').value,
        glpi_app_token: document.getElementById('tenant-glpi-token').value,
        glpi_user_login: document.getElementById('tenant-glpi-login').value,
        glpi_user_password: document.getElementById('tenant-glpi-password').value,
        admin_nome: document.getElementById('tenant-admin-nome').value,
        admin_email: document.getElementById('tenant-admin-email').value,
        admin_password: document.getElementById('tenant-admin-password').value
    };
    
    const customValor = document.getElementById('tenant-custom-valor').value;
    if (customValor) {
        payload.custom_valor = parseFloat(customValor);
    }
    
    try {
        showLoading(isEditing ? 'Atualizando tenant...' : 'Criando tenant...');
        
        const url = isEditing 
            ? `${API_BASE_URL}/admin/tenants/${tenantId}`
            : `${API_BASE_URL}/admin/tenants`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(
                isEditing ? 'Tenant atualizado com sucesso!' : 'Tenant criado com sucesso!',
                'success'
            );
            closeModal('modal-tenant');
            loadTenants();
            loadOverview();
            
            // Se houver link de pagamento, mostrar ao usuário
            if (data.payment && data.payment.init_point) {
                if (confirm('Deseja abrir o link de pagamento do Mercado Pago?')) {
                    window.open(data.payment.init_point, '_blank');
                }
            }
        } else {
            showToast(data.message || 'Erro ao salvar tenant', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar tenant:', error);
        showToast('Erro ao salvar tenant', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteTenant(tenantId) {
    if (!confirm('Tem certeza que deseja deletar este tenant? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        showLoading('Deletando tenant...');
        
        const response = await fetch(`${API_BASE_URL}/admin/tenants/${tenantId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Tenant deletado com sucesso', 'success');
            loadTenants();
            loadOverview();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao deletar tenant', 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar tenant:', error);
        showToast('Erro ao deletar tenant', 'error');
    } finally {
        hideLoading();
    }
}

async function suspendTenant(tenantId) {
    if (!confirm('Deseja suspender este tenant?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/tenants/${tenantId}/suspend`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showToast('Tenant suspenso com sucesso', 'success');
            loadTenants();
        }
    } catch (error) {
        showToast('Erro ao suspender tenant', 'error');
    }
}

async function reactivateTenant(tenantId) {
    if (!confirm('Deseja reativar este tenant?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/tenants/${tenantId}/reactivate`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showToast('Tenant reativado com sucesso', 'success');
            loadTenants();
        }
    } catch (error) {
        showToast('Erro ao reativar tenant', 'error');
    }
}

// Tornar funções globais para onclick
window.editTenant = (id) => openTenantModal(id);
window.deleteTenant = deleteTenant;
window.suspendTenant = suspendTenant;
window.reactivateTenant = reactivateTenant;

// ==================== PLANS ====================
async function loadPlans() {
    try {
        const container = document.getElementById('plans-grid');
        container.innerHTML = `
            <div class="loading-state">
                <i class="bi bi-hourglass-split"></i>
                Carregando planos...
            </div>
        `;
        
        const response = await fetch(`${API_BASE_URL}/admin/plans`);
        allPlans = await response.json();
        
        if (allPlans.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="bi bi-inbox"></i>
                    Nenhum plano cadastrado
                </div>
            `;
            return;
        }
        
        container.innerHTML = allPlans.map(plan => {
            const features = [
                `Até ${plan.features.max_usuarios} usuários`,
                `Até ${plan.features.max_tecnicos} técnicos`,
                plan.features.automacao_enabled && 'Automação de chamados',
                plan.features.ia_categorization && 'Categorização com IA',
                plan.features.custom_branding && 'Marca personalizada',
                plan.features.api_access && 'Acesso à API',
                plan.features.priority_support && 'Suporte prioritário'
            ].filter(Boolean);
            
            return `
                <div class="plan-card">
                    <div class="plan-header">
                        <h3 class="plan-name">${plan.nome}</h3>
                        <div class="plan-price">
                            R$ ${plan.valor_mensal.toFixed(2)}
                            <span>/mês</span>
                        </div>
                    </div>
                    
                    ${plan.descricao ? `<p class="plan-description">${plan.descricao}</p>` : ''}
                    
                    <div class="plan-features">
                        ${features.map(feat => `
                            <div class="plan-feature">
                                <i class="bi bi-check-circle-fill"></i>
                                <span>${feat}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="plan-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editPlan('${plan._id}')">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn-icon delete" onclick="deletePlan('${plan._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        showToast('Erro ao carregar planos', 'error');
    }
}

async function openPlanModal(planId = null) {
    if (planId) {
        const plan = allPlans.find(p => p._id === planId);
        if (plan) {
            document.getElementById('modal-plan-title').textContent = 'Editar Plano';
            document.getElementById('plan-id').value = plan._id;
            document.getElementById('plan-nome').value = plan.nome;
            document.getElementById('plan-descricao').value = plan.descricao || '';
            document.getElementById('plan-valor').value = plan.valor_mensal;
            document.getElementById('plan-max-users').value = plan.features.max_usuarios;
            document.getElementById('plan-max-techs').value = plan.features.max_tecnicos;
            document.getElementById('plan-feat-automation').checked = plan.features.automacao_enabled;
            document.getElementById('plan-feat-ia').checked = plan.features.ia_categorization;
            document.getElementById('plan-feat-branding').checked = plan.features.custom_branding;
            document.getElementById('plan-feat-api').checked = plan.features.api_access;
            document.getElementById('plan-feat-support').checked = plan.features.priority_support;
        }
    } else {
        document.getElementById('modal-plan-title').textContent = 'Novo Plano';
        document.getElementById('form-plan').reset();
        document.getElementById('plan-id').value = '';
    }
    
    showModal('modal-plan');
}

async function handlePlanSubmit(e) {
    e.preventDefault();
    
    const planId = document.getElementById('plan-id').value;
    const isEditing = !!planId;
    
    const payload = {
        nome: document.getElementById('plan-nome').value,
        descricao: document.getElementById('plan-descricao').value,
        valor_mensal: parseFloat(document.getElementById('plan-valor').value),
        features: {
            max_usuarios: parseInt(document.getElementById('plan-max-users').value),
            max_tecnicos: parseInt(document.getElementById('plan-max-techs').value),
            automacao_enabled: document.getElementById('plan-feat-automation').checked,
            ia_categorization: document.getElementById('plan-feat-ia').checked,
            custom_branding: document.getElementById('plan-feat-branding').checked,
            api_access: document.getElementById('plan-feat-api').checked,
            priority_support: document.getElementById('plan-feat-support').checked
        }
    };
    
    try {
        showLoading(isEditing ? 'Atualizando plano...' : 'Criando plano...');
        
        const url = isEditing 
            ? `${API_BASE_URL}/admin/plans/${planId}`
            : `${API_BASE_URL}/admin/plans`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast(
                isEditing ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!',
                'success'
            );
            closeModal('modal-plan');
            loadPlans();
            loadOverview();
        } else {
            const data = await response.json();
            showToast(data.message || 'Erro ao salvar plano', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar plano:', error);
        showToast('Erro ao salvar plano', 'error');
    } finally {
        hideLoading();
    }
}

async function deletePlan(planId) {
    if (!confirm('Tem certeza que deseja deletar este plano?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/plans/${planId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Plano deletado com sucesso', 'success');
            loadPlans();
            loadOverview();
        } else {
            showToast(data.message || 'Erro ao deletar plano', 'error');
        }
    } catch (error) {
        showToast('Erro ao deletar plano', 'error');
    }
}

window.editPlan = (id) => openPlanModal(id);
window.deletePlan = deletePlan;

// ==================== SETTINGS ====================
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/system-config`);
        systemConfig = await response.json();
        
        // Mercado Pago
        document.getElementById('mercadopago-enabled').checked = systemConfig.mercadopago.enabled || false;
        document.getElementById('mp-access-token').value = systemConfig.mercadopago.access_token || '';
        document.getElementById('mp-public-key').value = systemConfig.mercadopago.public_key || '';
        document.getElementById('mp-webhook-url').value = systemConfig.mercadopago.webhook_url || '';
        
        // Geral
        document.getElementById('app-name').value = systemConfig.app_name || '';
        document.getElementById('app-url').value = systemConfig.app_url || '';
        
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showToast('Erro ao carregar configurações', 'error');
    }
}

async function saveMercadoPago() {
    const payload = {
        mercadopago: {
            enabled: document.getElementById('mercadopago-enabled').checked,
            access_token: document.getElementById('mp-access-token').value,
            public_key: document.getElementById('mp-public-key').value,
            webhook_url: document.getElementById('mp-webhook-url').value
        }
    };
    
    try {
        showLoading('Salvando configurações...');
        
        const response = await fetch(`${API_BASE_URL}/admin/system-config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('Configurações do Mercado Pago salvas com sucesso', 'success');
        } else {
            showToast('Erro ao salvar configurações', 'error');
        }
    } catch (error) {
        showToast('Erro ao salvar configurações', 'error');
    } finally {
        hideLoading();
    }
}

async function testMercadoPago() {
    try {
        showLoading('Testando conexão com Mercado Pago...');
        
        const response = await fetch(`${API_BASE_URL}/admin/test-mercadopago`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('✓ Conexão com Mercado Pago OK!', 'success');
        } else {
            showToast(data.message || 'Erro na conexão', 'error');
        }
    } catch (error) {
        showToast('Erro ao testar Mercado Pago', 'error');
    } finally {
        hideLoading();
    }
}

async function saveGeneralSettings() {
    const payload = {
        app_name: document.getElementById('app-name').value,
        app_url: document.getElementById('app-url').value
    };
    
    try {
        showLoading('Salvando configurações...');
        
        const response = await fetch(`${API_BASE_URL}/admin/system-config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast('Configurações gerais salvas com sucesso', 'success');
        } else {
            showToast('Erro ao salvar configurações', 'error');
        }
    } catch (error) {
        showToast('Erro ao salvar configurações', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== UTILITIES ====================
function logout() {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('mcp_token');
        localStorage.removeItem('mcp_user');
        window.location.href = '/login.html';
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.closeModal = closeModal;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="bi bi-${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Sucesso' : 'Erro'}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(message) {
    // Implementar overlay de loading se necessário
    console.log('Loading:', message);
}

function hideLoading() {
    console.log('Loading complete');
}