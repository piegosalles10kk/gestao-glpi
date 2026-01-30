const mongoose = require('mongoose');
const crypto = require('crypto');

// Schema para Tenant (Empresa/Cliente)
const TenantSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true,
        unique: true 
    },
    slug: { 
        type: String, 
        required: true,
        unique: true,
        lowercase: true 
    },
    logo: { 
        type: String 
    },
    ativo: { 
        type: Boolean, 
        default: true 
    },
    // Configurações GLPI específicas do tenant
    glpi_config: {
        url: { type: String, required: true },
        app_token: { type: String, required: true },
        user_login: { type: String, required: true },
        user_password: { type: String, required: true }
    },
    // Configurações de automação
    automation_config: {
        status_filter: { 
            type: String, 
            default: '10' // 10 = todos, 1 = novo, etc
        },
        auto_assign_enabled: { 
            type: Boolean, 
            default: true 
        },
        auto_categorize_enabled: { 
            type: Boolean, 
            default: true 
        },
        assign_rules: {
            tempo_urg_prio_5: { type: Number, default: 10 }, // minutos
            tempo_urg_prio_4: { type: Number, default: 30 }
        }
    },
    // Estatísticas do dia (cache)
    daily_stats: {
        data: { type: Date },
        chamados_disponiveis: { type: Number, default: 0 },
        chamados_atribuidos: { type: Number, default: 0 },
        chamados_pendentes: { type: Number, default: 0 },
        chamados_planejados: { type: Number, default: 0 }
    }
}, { 
    versionKey: false, 
    timestamps: true 
});

// Schema para Usuários do Tenant
const TenantUserSchema = new mongoose.Schema({
    tenant: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tenant',
        required: true 
    },
    nome: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true,
        lowercase: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'gestor', 'viewer'],
        default: 'viewer'
    },
    ativo: { 
        type: Boolean, 
        default: true 
    },
    ultimo_acesso: { 
        type: Date 
    }
}, { 
    versionKey: false, 
    timestamps: true 
});

// Índice composto para garantir email único por tenant
TenantUserSchema.index({ tenant: 1, email: 1 }, { unique: true });

// Método para hash de senha
TenantUserSchema.methods.hashPassword = function(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Método para verificar senha
TenantUserSchema.methods.verifyPassword = function(password) {
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    return this.password === hashedPassword;
};

const Tenant = mongoose.model('Tenant', TenantSchema);
const TenantUser = mongoose.model('TenantUser', TenantUserSchema);

module.exports = { Tenant, TenantUser };