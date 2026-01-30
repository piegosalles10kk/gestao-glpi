// src/controllers/tenantAuthController.js
const { Tenant, TenantUser } = require('../models/tenant');
const crypto = require('crypto');

// Função para criar hash de senha
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Função para gerar token de sessão
const generateSessionToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Login de Tenant
exports.login = async (req, res) => {
    try {
        const { email, password, tenant_slug } = req.body;
        
        if (!email || !password || !tenant_slug) {
            return res.status(400).json({ 
                message: "Email, senha e identificador da empresa são obrigatórios" 
            });
        }

        // Buscar tenant
        const tenant = await Tenant.findOne({ slug: tenant_slug, ativo: true });
        if (!tenant) {
            return res.status(401).json({ message: "Empresa não encontrada ou inativa" });
        }

        // Buscar usuário do tenant
        const user = await TenantUser.findOne({ 
            tenant: tenant._id, 
            email: email.toLowerCase(),
            ativo: true 
        });
        
        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Verificar senha
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Atualizar último acesso
        user.ultimo_acesso = new Date();
        await user.save();

        // Criar sessão
        const sessionToken = generateSessionToken();
        
        res.status(200).json({
            message: "Login realizado com sucesso",
            token: sessionToken,
            user: {
                id: user._id,
                nome: user.nome,
                email: user.email,
                role: user.role
            },
            tenant: {
                id: tenant._id,
                nome: tenant.nome,
                slug: tenant.slug,
                logo: tenant.logo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: error.message });
    }
};

// Criar novo tenant (apenas para super admin)
exports.createTenant = async (req, res) => {
    try {
        const { 
            nome, 
            slug, 
            glpi_url, 
            glpi_app_token, 
            glpi_user_login, 
            glpi_user_password,
            admin_nome,
            admin_email,
            admin_password
        } = req.body;

        // Verificar se tenant já existe
        const existingTenant = await Tenant.findOne({ slug });
        if (existingTenant) {
            return res.status(400).json({ message: "Empresa com este identificador já existe" });
        }

        // Criar tenant
        const newTenant = new Tenant({
            nome,
            slug: slug.toLowerCase(),
            glpi_config: {
                url: glpi_url,
                app_token: glpi_app_token,
                user_login: glpi_user_login,
                user_password: glpi_user_password
            }
        });

        await newTenant.save();

        // Criar usuário admin do tenant
        const adminUser = new TenantUser({
            tenant: newTenant._id,
            nome: admin_nome,
            email: admin_email.toLowerCase(),
            password: hashPassword(admin_password),
            role: 'admin'
        });

        await adminUser.save();

        res.status(201).json({
            message: "Tenant criado com sucesso",
            tenant: {
                id: newTenant._id,
                nome: newTenant.nome,
                slug: newTenant.slug
            },
            admin: {
                nome: adminUser.nome,
                email: adminUser.email
            }
        });
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        res.status(500).json({ error: error.message });
    }
};

// Criar usuário dentro de um tenant
exports.createTenantUser = async (req, res) => {
    try {
        const { tenant_id, nome, email, password, role } = req.body;

        // Verificar se tenant existe
        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        // Criar usuário
        const newUser = new TenantUser({
            tenant: tenant_id,
            nome,
            email: email.toLowerCase(),
            password: hashPassword(password),
            role: role || 'viewer'
        });

        await newUser.save();

        res.status(201).json({
            message: "Usuário criado com sucesso",
            user: {
                id: newUser._id,
                nome: newUser.nome,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: "Este email já está cadastrado nesta empresa" 
            });
        }
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: error.message });
    }
};

// Alterar senha do usuário
exports.changePassword = async (req, res) => {
    try {
        const { user_id, current_password, new_password } = req.body;
        
        const user = await TenantUser.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        // Verificar senha atual
        const hashedCurrentPassword = hashPassword(current_password);
        if (user.password !== hashedCurrentPassword) {
            return res.status(401).json({ message: "Senha atual incorreta" });
        }

        // Atualizar senha
        user.password = hashPassword(new_password);
        await user.save();
        
        res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obter configurações do tenant
exports.getTenantConfig = async (req, res) => {
    try {
        const { tenant_id } = req.params;
        
        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        res.status(200).json({
            tenant: {
                id: tenant._id,
                nome: tenant.nome,
                slug: tenant.slug,
                logo: tenant.logo,
                glpi_config: {
                    url: tenant.glpi_config.url,
                    app_token: tenant.glpi_config.app_token,
                    user_login: tenant.glpi_config.user_login
                    // Não retornar senha
                },
                automation_config: tenant.automation_config,
                daily_stats: tenant.daily_stats
            }
        });
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: error.message });
    }
};

// Atualizar configurações do tenant
exports.updateTenantConfig = async (req, res) => {
    try {
        const { tenant_id } = req.params;
        const updates = req.body;

        const tenant = await Tenant.findByIdAndUpdate(
            tenant_id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        res.status(200).json({
            message: "Configurações atualizadas com sucesso",
            tenant: {
                id: tenant._id,
                nome: tenant.nome,
                automation_config: tenant.automation_config
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: error.message });
    }
};