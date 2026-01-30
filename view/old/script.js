const API_BASE_URL = "http://172.16.50.19:2500/api";

// Verificar autenticação ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initNavigation();
    loadDashboardData();
    initLogout();
    
    // Event listeners para configuração
    const formGlpiConfig = document.getElementById('form-glpi-config');
    if (formGlpiConfig) {
        formGlpiConfig.addEventListener('submit', saveGlpiConfig);
    }
    
    const btnTestGlpi = document.getElementById('btn-test-glpi');
    if (btnTestGlpi) {
        btnTestGlpi.addEventListener('click', testGlpiConnection);
    }
    
    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
        formChangePassword.addEventListener('submit', changePassword);
    }
});

// ==================== AUTENTICAÇÃO ====================

// Verificar se está autenticado
function checkAuthentication() {
    const token = localStorage.getItem('mcp_token');
    const user = localStorage.getItem('mcp_user');
    
    if (!token || !user) {
        window.location.href = '/login.html';
        return;
    }
    
    // Exibir nome do usuário
    try {
        const userData = JSON.parse(user);
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.innerHTML = `
                <span class="admin-badge">${userData.role}</span>
                <div class="avatar"><i class="bi bi-person-circle"></i></div>
            `;
        }
    } catch (e) {
        console.error('Erro ao parsear dados do usuário');
    }
}

// Logout
function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                localStorage.removeItem('mcp_token');
                localStorage.removeItem('mcp_user');
                window.location.href = '/login.html';
            }
        });
    }
}

// Adicionar interceptor para incluir token nas requisições
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const token = localStorage.getItem('mcp_token');
    if (token && args[1]) {
        if (!args[1].headers) {
            args[1].headers = {};
        }
        args[1].headers['Authorization'] = `Bearer ${token}`;
    }
    return originalFetch.apply(this, args);
};

// ==================== CONFIGURAÇÕES ====================

// Toggle de senha nas configurações
function toggleConfigPassword() {
    const input = document.getElementById('config-glpi-password');
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

// Carregar configurações GLPI
async function loadGlpiConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config/glpi`);
        
        if (response.ok) {
            const config = await response.json();
            
            document.getElementById('config-glpi-url').value = config.glpi_url || '';
            document.getElementById('config-glpi-token').value = config.glpi_app_token || '';
            document.getElementById('config-glpi-login').value = config.glpi_user_login || '';
            document.getElementById('config-glpi-password').value = config.glpi_user_password || '';
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// Salvar configurações GLPI
async function saveGlpiConfig(e) {
    e.preventDefault();
    
    const payload = {
        glpi_url: document.getElementById('config-glpi-url').value.trim(),
        glpi_app_token: document.getElementById('config-glpi-token').value.trim(),
        glpi_user_login: document.getElementById('config-glpi-login').value.trim(),
        glpi_user_password: document.getElementById('config-glpi-password').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/config/glpi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showConfigStatus('Configurações salvas com sucesso!', 'success');
        } else {
            showConfigStatus('Erro ao salvar configurações', 'error');
        }
    } catch (error) {
        showConfigStatus('Erro ao conectar com o servidor', 'error');
    }
}

// Testar conexão GLPI
async function testGlpiConnection() {
    const btn = document.getElementById('btn-test-glpi');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> <span>Testando...</span>';
    
    const payload = {
        glpi_url: document.getElementById('config-glpi-url').value.trim(),
        glpi_app_token: document.getElementById('config-glpi-token').value.trim(),
        glpi_user_login: document.getElementById('config-glpi-login').value.trim(),
        glpi_user_password: document.getElementById('config-glpi-password').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/config/glpi/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showConfigStatus('✓ Conexão estabelecida com sucesso!', 'success');
        } else {
            showConfigStatus('✗ ' + data.message, 'error');
        }
    } catch (error) {
        showConfigStatus('✗ Erro ao testar conexão', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-wifi"></i> <span>Testar Conexão</span>';
    }
}

// Exibir status de configuração
function showConfigStatus(message, type) {
    const statusDiv = document.getElementById('config-status');
    const icon = statusDiv.querySelector('i');
    const span = statusDiv.querySelector('span');
    
    span.textContent = message;
    statusDiv.style.display = 'flex';
    
    if (type === 'success') {
        statusDiv.style.background = '#dcfce7';
        statusDiv.style.color = '#16a34a';
        icon.className = 'bi bi-check-circle';
    } else {
        statusDiv.style.background = '#fee2e2';
        statusDiv.style.color = '#dc2626';
        icon.className = 'bi bi-x-circle';
    }
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Alterar senha
async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('A nova senha deve ter no mínimo 6 caracteres');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('mcp_user'));
    
    const payload = {
        username: user.username,
        currentPassword,
        newPassword
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Senha alterada com sucesso!');
            document.getElementById('form-change-password').reset();
        } else {
            alert(data.message || 'Erro ao alterar senha');
        }
    } catch (error) {
        alert('Erro ao conectar com o servidor');
    }
}

// ==================== NAVEGAÇÃO ====================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    
    const pageTitles = {
        'dash': 'Dashboard',
        'users': 'Técnicos',
        'cargos': 'Cargos',
        'entidades': 'Entidades',
        'config': 'Configurações',
        'glpi': 'Sincronização GLPI'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            sections.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });
            
            if (pageTitle && pageTitles[target]) {
                pageTitle.textContent = pageTitles[target];
            }

            if (target === 'users') loadUsers();
            if (target === 'cargos') loadCargos();
            if (target === 'entidades') loadEntidades();
            if (target === 'config') loadGlpiConfig();
            if (target === 'glpi') loadGlpiData();
            if (target === 'dash') loadDashboardData();
        });
    });
}

// ==================== DASHBOARD ====================

async function loadDashboardData() {
    try {
        const [u, c, comp] = await Promise.all([
            fetch(`${API_BASE_URL}/users`).then(res => res.json()),
            fetch(`${API_BASE_URL}/cargos`).then(res => res.json()),
            fetch(`${API_BASE_URL}/competencias`).then(res => res.json())
        ]);
        document.getElementById('count-users').innerText = u.length || 0;
        document.getElementById('count-cargos').innerText = c.length || 0;
        document.getElementById('count-comp').innerText = comp.length || 0;
    } catch (err) { 
        console.error("Erro dashboard:", err); 
    }
}

// ==================== ENTIDADES ====================

async function loadEntidades() {
    const tbody = document.getElementById('table-entidades-body');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4" class="text-center">Carregando entidades do GLPI...</td></tr>';
    
    try {
        const [resGlpi, resLocal] = await Promise.all([
            fetch(`${API_BASE_URL}/glpi/entidades`),
            fetch(`${API_BASE_URL}/entidades-config`)
        ]);

        const entidadesGlpi = await resGlpi.json();
        const entidadesLocal = await resLocal.json();

        tbody.innerHTML = entidadesGlpi.map(ent => {
            const configLocal = entidadesLocal.find(l => l._id === ent.id);
            const prioridade = configLocal ? configLocal.prioridade : 'Não def.';
            const badgeClass = configLocal ? `priority-badge-${configLocal.prioridade}` : 'priority-badge-none';

            return `
                <tr>
                    <td>${ent.id}</td>
                    <td><strong>${ent.nome}</strong></td>
                    <td class="text-center">
                        <span class="badge-priority ${badgeClass}">${prioridade}</span>
                    </td>
                    <td class="text-center">
                        <button onclick='openPriorityModal(${JSON.stringify(ent)}, ${JSON.stringify(configLocal || null)})' class="btn-action edit">
                            <i class="bi bi-gear-fill"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) { 
        tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar entidades.</td></tr>'; 
    }
}

window.openPriorityModal = (ent, config) => {
    document.getElementById('pri-entidade-id').value = ent.id;
    document.getElementById('pri-entidade-nome').value = ent.nome;
    
    const inputValor = document.getElementById('pri-valor');
    const labelValor = document.getElementById('label-pri-valor');
    const textMatriz = document.getElementById('pri-matriz-config');

    if (config) {
        inputValor.value = config.prioridade;
        labelValor.innerText = config.prioridade;
        textMatriz.value = config.matriz_config || '';
    } else {
        inputValor.value = 3;
        labelValor.innerText = 3;
        textMatriz.value = '';
    }

    document.getElementById('modal-prioridade').style.display = 'flex';
};

// Listener para o Slider de prioridade
const priValor = document.getElementById('pri-valor');
if (priValor) {
    priValor.addEventListener('input', (e) => {
        document.getElementById('label-pri-valor').innerText = e.target.value;
    });
}

// Submit do formulário de prioridade
const formPrioridade = document.getElementById('form-prioridade');
if (formPrioridade) {
    formPrioridade.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            _id: Number(document.getElementById('pri-entidade-id').value),
            nome: document.getElementById('pri-entidade-nome').value,
            prioridade: Number(document.getElementById('pri-valor').value),
            matriz_config: document.getElementById('pri-matriz-config').value
        };

        const res = await fetch(`${API_BASE_URL}/entidades-config`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal('modal-prioridade');
            loadEntidades();
        }
    };
}

// ==================== USUÁRIOS ====================

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const users = await response.json();
        const tbody = document.getElementById('table-users-body');
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td><strong>${user.nome}</strong></td>
                <td><span class="badge-glpi">${user.userNameGlpi}</span></td>
                <td>${user.cargo ? user.cargo.nome : '<span class="text-danger">Sem Cargo</span>'}</td>
                <td>${user.telefone || '-'}</td>
                <td class="text-center">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button onclick="openEditUserModal('${user._id}')" class="btn-action edit" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="deleteUser('${user._id}')" class="btn-action delete" title="Excluir">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) { 
        console.error(err); 
    }
}

window.openEditUserModal = async (id) => {
    try {
        const [resUser, resCargos] = await Promise.all([
            fetch(`${API_BASE_URL}/users/${id}`),
            fetch(`${API_BASE_URL}/cargos`)
        ]);
        
        const user = await resUser.json();
        const cargos = await resCargos.json();

        document.getElementById('edit-user-id').value = user._id;
        document.getElementById('edit-user-nome').value = user.nome;
        document.getElementById('edit-user-telefone').value = user.telefone || '';

        const select = document.getElementById('edit-user-cargo-select');
        select.innerHTML = '<option value="">Selecione um Cargo</option>' + 
                          cargos.map(c => `<option value="${c._id}" ${user.cargo && user.cargo._id === c._id ? 'selected' : ''}>${c.nome}</option>`).join('');

        document.getElementById('modal-edit-user').style.display = 'flex';
    } catch (err) { 
        alert("Erro ao carregar dados do usuário."); 
    }
};

const formEditUser = document.getElementById('form-edit-user');
if (formEditUser) {
    formEditUser.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const payload = {
            nome: document.getElementById('edit-user-nome').value,
            telefone: document.getElementById('edit-user-telefone').value,
            cargo: document.getElementById('edit-user-cargo-select').value
        };

        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal('modal-edit-user');
            loadUsers();
            loadDashboardData();
        }
    };
}

async function deleteUser(id) {
    if (confirm("Tem certeza que deseja excluir este técnico do banco local?")) {
        await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
        loadUsers();
        loadDashboardData();
    }
}

// ==================== CARGOS ====================

async function loadCargos() {
    try {
        const response = await fetch(`${API_BASE_URL}/cargos`);
        const cargos = await response.json();
        const container = document.getElementById('cargos-container');
        container.innerHTML = cargos.map(cargo => `
            <div class="card-cargo">
                <div class="card-header">
                    <h3>${cargo.nome}</h3>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="openEditCargoModal('${cargo._id}')" class="btn-action edit">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="deleteCargo('${cargo._id}')" class="delete-sm">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                <p>${cargo.descricao || 'Sem descrição definida.'}</p>
                <div class="comp-list">
                    ${cargo.competencias.map(c => `<span>${c.name}</span>`).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) { 
        console.error(err); 
    }
}

const btnAddCargo = document.getElementById('btn-add-cargo');
if (btnAddCargo) {
    btnAddCargo.onclick = async () => {
        const res = await fetch(`${API_BASE_URL}/competencias`);
        const comps = await res.json();
        const container = document.getElementById('lista-competencias-select');
        container.innerHTML = comps.map(c => `
            <label><input type="checkbox" name="comp" value="${c._id}"> ${c.name}</label>
        `).join('');
        document.getElementById('modal-cargo').style.display = 'flex';
    };
}

const formCargo = document.getElementById('form-cargo');
if (formCargo) {
    formCargo.onsubmit = async (e) => {
        e.preventDefault();
        const selected = Array.from(document.querySelectorAll('input[name="comp"]:checked')).map(cb => Number(cb.value));
        const data = {
            nome: document.getElementById('cargo-nome').value,
            descricao: document.getElementById('cargo-desc').value,
            competencias: selected
        };
        await fetch(`${API_BASE_URL}/cargos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        closeModal('modal-cargo');
        loadCargos();
        loadDashboardData();
    };
}

window.openEditCargoModal = async (id) => {
    try {
        const [resCargo, resComps] = await Promise.all([
            fetch(`${API_BASE_URL}/cargos/${id}`),
            fetch(`${API_BASE_URL}/competencias`)
        ]);
        const cargo = await resCargo.json();
        const todasComps = await resComps.json();

        document.getElementById('edit-cargo-id').value = cargo._id;
        document.getElementById('edit-cargo-nome').value = cargo.nome;
        document.getElementById('edit-cargo-desc').value = cargo.descricao || '';

        const idsPossuidos = cargo.competencias.map(c => c._id);
        const container = document.getElementById('edit-lista-competencias');
        container.innerHTML = todasComps.map(c => `
            <label>
                <input type="checkbox" name="edit-comp" value="${c._id}" 
                ${idsPossuidos.includes(c._id) ? 'checked' : ''}> ${c.name}
            </label>
        `).join('');

        document.getElementById('modal-edit-cargo').style.display = 'flex';
    } catch (err) { 
        alert("Erro ao carregar dados do cargo."); 
    }
};

const formEditCargo = document.getElementById('form-edit-cargo');
if (formEditCargo) {
    formEditCargo.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-cargo-id').value;
        const selected = Array.from(document.querySelectorAll('input[name="edit-comp"]:checked')).map(cb => Number(cb.value));
        
        const payload = {
            nome: document.getElementById('edit-cargo-nome').value,
            descricao: document.getElementById('edit-cargo-desc').value,
            competencias: selected
        };

        const res = await fetch(`${API_BASE_URL}/cargos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal('modal-edit-cargo');
            loadCargos();
            loadUsers(); 
            loadDashboardData();
        }
    };
}

async function deleteCargo(id) {
    if (confirm("Excluir este cargo? Técnicos vinculados ficarão sem cargo.")) {
        await fetch(`${API_BASE_URL}/cargos/${id}`, { method: 'DELETE' });
        loadCargos();
        loadDashboardData();
    }
}

// ==================== GLPI ====================

async function loadGlpiData() {
    const tbody = document.getElementById('table-glpi-body');
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4" class="text-center">Consultando GLPI...</td></tr>';
    try {
        const res = await fetch(`${API_BASE_URL}/glpi/tecnicos`);
        const tecs = await res.json();
        tbody.innerHTML = tecs.map(t => `
            <tr>
                <td>${t.nome} ${t.sobrenome}</td>
                <td>${t.email || '-'}</td>
                <td><small>${t.entidade}</small></td>
                <td class="text-center">
                    <button class="btn-import-glpi" onclick='openImportModal(${JSON.stringify(t)})'>
                        <i class="bi bi-plus-circle"></i> Importar
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) { 
        tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar dados do GLPI.</td></tr>'; 
    }
}

window.openImportModal = async (tec) => {
    document.getElementById('user-nome').value = tec.nome + " " + tec.sobrenome;
    document.getElementById('user-id').value = tec.id;
    
    const fieldEntidade = document.getElementById('user-entidade');
    if (fieldEntidade) {
        fieldEntidade.value = tec.entidade || '';
    }
    
    const res = await fetch(`${API_BASE_URL}/cargos`);
    const cargos = await res.json();
    const select = document.getElementById('user-cargo-select');
    select.innerHTML = '<option value="">Selecione um Cargo</option>' + 
                      cargos.map(c => `<option value="${c._id}">${c.nome}</option>`).join('');
    
    document.getElementById('form-user').dataset.login = tec.login;
    document.getElementById('modal-user').style.display = 'flex';
};

const formUser = document.getElementById('form-user');
if (formUser) {
    formUser.onsubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            _id: document.getElementById('user-id').value,
            nome: document.getElementById('user-nome').value,
            entidade: document.getElementById('user-entidade').value, 
            userNameGlpi: e.target.dataset.login,
            cargo: document.getElementById('user-cargo-select').value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if(res.ok) {
                closeModal('modal-user');
                loadUsers();
                loadDashboardData();
            } else {
                const errorData = await res.json();
                alert("Erro ao importar: " + (errorData.message || "Erro desconhecido"));
            }
        } catch (err) {
            console.error("Erro no POST /users:", err);
            alert("Erro de conexão com o servidor.");
        }
    };
}

const btnSyncCompetencias = document.getElementById('sync-competencias');
if (btnSyncCompetencias) {
    btnSyncCompetencias.onclick = async () => {
        btnSyncCompetencias.disabled = true;
        btnSyncCompetencias.innerHTML = '<i class="bi bi-hourglass-split"></i> <span>Sincronizando...</span>';
        try {
            await fetch(`${API_BASE_URL}/competencias/sync`);
            alert("Competências sincronizadas com sucesso!");
            document.getElementById('last-sync').innerText = new Date().toLocaleDateString();
        } finally {
            btnSyncCompetencias.disabled = false;
            btnSyncCompetencias.innerHTML = '<i class="bi bi-arrow-repeat"></i> <span>Sincronizar</span>';
        }
    };
}

// ==================== UTILITÁRIOS ====================

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}