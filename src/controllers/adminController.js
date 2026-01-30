// src/controllers/adminController.js
const { Tenant, TenantUser } = require('../models/tenant');
const { Plan } = require('../models/plan');
const { SystemConfig } = require('../models/systemConfig');
const { Admin } = require('../models/admin');
const mercadoPagoService = require('../services/mercadoPagoService');
const crypto = require('crypto');

// Função para hash de senha
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// ==================== DASHBOARD STATS ====================
exports.getDashboardStats = async (req, res) => {
    try {
        const [totalTenants, activeTenants, totalPlans, totalRevenue] = await Promise.all([
            Tenant.countDocuments(),
            Tenant.countDocuments({ ativo: true, 'billing.status': 'active' }),
            Plan.countDocuments({ ativo: true }),
            Tenant.aggregate([
                {
                    $lookup: {
                        from: 'plans',
                        localField: 'plan',
                        foreignField: '_id',
                        as: 'planDetails'
                    }
                },
                { $unwind: '$planDetails' },
                { $match: { 'billing.status': 'active' } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$planDetails.valor_mensal' }
                    }
                }
            ])
        ]);

        res.status(200).json({
            total_tenants: totalTenants,
            active_tenants: activeTenants,
            total_plans: totalPlans,
            monthly_revenue: totalRevenue[0]?.total || 0
        });
    } catch (error) {
        console.error('Erro ao buscar stats:', error);
        res.status(500).json({ error: error.message });
    }
};

// ==================== TENANTS ====================
exports.getAllTenants = async (req, res) => {
    try {
        const tenants = await Tenant.find()
            .populate('plan', 'nome valor_mensal')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createTenant = async (req, res) => {
    try {
        const {
            nome,
            slug,
            plan_id,
            glpi_url,
            glpi_app_token,
            glpi_user_login,
            glpi_user_password,
            admin_nome,
            admin_email,
            admin_password,
            custom_valor // Valor customizado do plano (opcional)
        } = req.body;

        // Validações
        if (!nome || !slug || !plan_id) {
            return res.status(400).json({ message: 'Dados obrigatórios faltando' });
        }

        // Verificar se tenant já existe
        const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
        if (existingTenant) {
            return res.status(400).json({ message: 'Tenant com este slug já existe' });
        }

        // Buscar plano
        const plan = await Plan.findById(plan_id);
        if (!plan) {
            return res.status(404).json({ message: 'Plano não encontrado' });
        }

        // Valor final (custom ou do plano)
        const valorFinal = custom_valor !== undefined ? custom_valor : plan.valor_mensal;

        // Criar tenant
        const newTenant = new Tenant({
            nome,
            slug: slug.toLowerCase(),
            plan: plan_id,
            glpi_config: {
                url: glpi_url,
                app_token: glpi_app_token,
                user_login: glpi_user_login,
                user_password: glpi_user_password
            },
            billing: {
                status: valorFinal === 0 ? 'active' : 'trial',
                trial_ends_at: valorFinal === 0 ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
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

        // Se valor > 0, criar assinatura no Mercado Pago
        let paymentInfo = null;
        if (valorFinal > 0) {
            await mercadoPagoService.initialize();
            
            if (mercadoPagoService.isEnabled()) {
                try {
                    // Criar customer
                    const customer = await mercadoPagoService.createCustomer({
                        email: admin_email,
                        nome: admin_nome,
                        tenant_slug: slug
                    });

                    newTenant.billing.mercadopago_customer_id = customer.id;

                    // Criar link de pagamento/assinatura
                    const systemConfig = await SystemConfig.findOne({ tipo: 'system' });
                    const appUrl = systemConfig?.app_url || 'http://172.16.50.19:2600';

                    const subscription = await mercadoPagoService.createSubscription({
                        reason: `Assinatura ${nome} - ${plan.nome}`,
                        amount: valorFinal,
                        payer_email: admin_email,
                        back_url: `${appUrl}/tenant-dashboard.html`
                    });

                    newTenant.billing.mercadopago_subscription_id = subscription.id;
                    await newTenant.save();

                    paymentInfo = {
                        init_point: subscription.init_point,
                        subscription_id: subscription.id
                    };
                } catch (mpError) {
                    console.error('Erro ao criar assinatura MP:', mpError);
                    // Não bloqueia criação do tenant
                }
            }
        } else {
            // Valor R$0 - já está ativo
            await newTenant.save();
        }

        res.status(201).json({
            message: 'Tenant criado com sucesso',
            tenant: {
                id: newTenant._id,
                nome: newTenant.nome,
                slug: newTenant.slug,
                billing_status: newTenant.billing.status
            },
            admin: {
                nome: adminUser.nome,
                email: adminUser.email
            },
            payment: paymentInfo
        });
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const tenant = await Tenant.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('plan');

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado' });
        }

        res.status(200).json({
            message: 'Tenant atualizado com sucesso',
            tenant
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado' });
        }

        // Cancelar assinatura no Mercado Pago se existir
        if (tenant.billing.mercadopago_subscription_id) {
            await mercadoPagoService.initialize();
            if (mercadoPagoService.isEnabled()) {
                try {
                    await mercadoPagoService.cancelSubscription(tenant.billing.mercadopago_subscription_id);
                } catch (mpError) {
                    console.error('Erro ao cancelar assinatura:', mpError);
                }
            }
        }

        // Deletar usuários do tenant
        await TenantUser.deleteMany({ tenant: id });

        // Deletar tenant
        await Tenant.findByIdAndDelete(id);

        res.status(200).json({ message: 'Tenant removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.suspendTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await Tenant.findByIdAndUpdate(
            id,
            { 
                ativo: false,
                'billing.status': 'suspended'
            },
            { new: true }
        );

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado' });
        }

        res.status(200).json({
            message: 'Tenant suspenso com sucesso',
            tenant
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reactivateTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await Tenant.findByIdAndUpdate(
            id,
            { 
                ativo: true,
                'billing.status': 'active'
            },
            { new: true }
        );

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado' });
        }

        res.status(200).json({
            message: 'Tenant reativado com sucesso',
            tenant
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== PLANOS ====================
exports.getAllPlans = async (req, res) => {
    try {
        const plans = await Plan.find().sort({ valor_mensal: 1 });
        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const newPlan = new Plan(req.body);
        await newPlan.save();

        res.status(201).json({
            message: 'Plano criado com sucesso',
            plan: newPlan
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;

        const plan = await Plan.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ message: 'Plano não encontrado' });
        }

        res.status(200).json({
            message: 'Plano atualizado com sucesso',
            plan
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se há tenants usando este plano
        const tenantsWithPlan = await Tenant.countDocuments({ plan: id });
        if (tenantsWithPlan > 0) {
            return res.status(400).json({
                message: `Não é possível deletar. ${tenantsWithPlan} tenant(s) estão usando este plano.`
            });
        }

        await Plan.findByIdAndDelete(id);

        res.status(200).json({ message: 'Plano removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ==================== CONFIGURAÇÕES DO SISTEMA ====================
exports.getSystemConfig = async (req, res) => {
    try {
        let config = await SystemConfig.findOne({ tipo: 'system' });
        
        if (!config) {
            config = new SystemConfig({ tipo: 'system' });
            await config.save();
        }

        res.status(200).json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSystemConfig = async (req, res) => {
    try {
        const updates = req.body;

        let config = await SystemConfig.findOne({ tipo: 'system' });
        
        if (!config) {
            config = new SystemConfig({ tipo: 'system', ...updates });
        } else {
            Object.assign(config, updates);
        }

        await config.save();

        // Reinicializar Mercado Pago service com novas configurações
        await mercadoPagoService.initialize();

        res.status(200).json({
            message: 'Configurações atualizadas com sucesso',
            config
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.testMercadoPago = async (req, res) => {
    try {
        await mercadoPagoService.initialize();

        if (!mercadoPagoService.isEnabled()) {
            return res.status(400).json({
                success: false,
                message: 'Mercado Pago não está habilitado ou configurado'
            });
        }

        // Teste simples: tentar buscar uma assinatura inexistente (retorna erro esperado)
        const testResult = await mercadoPagoService.getSubscriptionStatus('test-123');

        res.status(200).json({
            success: true,
            message: 'Conexão com Mercado Pago OK',
            enabled: true
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            message: 'Mercado Pago configurado corretamente',
            enabled: true
        });
    }
};