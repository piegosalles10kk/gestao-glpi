// view/tenant-login.js
const API_BASE_URL = "http://172.16.50.19:2600/api";

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já está logado
    const token = localStorage.getItem('tenant_token');
    if (token) {
        window.location.href = '/tenant-dashboard.html';
    }

    // Toggle de senha
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = togglePassword.querySelector('i');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    });

    // Submit do formulário
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    
    const tenantSlug = document.getElementById('tenant-slug').value.trim().toLowerCase();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btn-login');
    const errorMessage = document.getElementById('error-message');
    
    // Validações básicas
    if (!tenantSlug || !email || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Desabilitar botão
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="bi bi-hourglass-split"></i> <span>Autenticando...</span>';
    errorMessage.classList.remove('show');
    
    try {
        const response = await fetch(`${API_BASE_URL}/tenant/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email, 
                password,
                tenant_slug: tenantSlug
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Salvar dados da sessão
            localStorage.setItem('tenant_token', data.token);
            localStorage.setItem('tenant_user', JSON.stringify(data.user));
            localStorage.setItem('tenant_info', JSON.stringify(data.tenant));
            
            // Redirecionar para dashboard
            window.location.href = '/tenant-dashboard.html';
        } else {
            showError(data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError('Erro ao conectar com o servidor');
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> <span>Entrar</span>';
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorMessage.classList.add('show');
    
    // Remover erro após 5 segundos
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}