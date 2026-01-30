// src/models/plan.js
const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true 
    },
    descricao: { 
        type: String 
    },
    valor_mensal: { 
        type: Number, 
        required: true,
        default: 0 
    },
    features: {
        max_usuarios: { type: Number, default: 5 },
        max_tecnicos: { type: Number, default: 10 },
        automacao_enabled: { type: Boolean, default: true },
        ia_categorization: { type: Boolean, default: false },
        custom_branding: { type: Boolean, default: false },
        api_access: { type: Boolean, default: false },
        priority_support: { type: Boolean, default: false }
    },
    ativo: { 
        type: Boolean, 
        default: true 
    },
    // Mercado Pago
    mercadopago_plan_id: { 
        type: String 
    }
}, { 
    versionKey: false, 
    timestamps: true 
});

const Plan = mongoose.model('Plan', PlanSchema);

module.exports = { Plan };