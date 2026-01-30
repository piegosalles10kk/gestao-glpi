// src/models/systemConfig.js
const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
    tipo: { 
        type: String, 
        required: true, 
        unique: true,
        default: 'system' 
    },
    // Mercado Pago
    mercadopago: {
        enabled: { 
            type: Boolean, 
            default: false 
        },
        access_token: { 
            type: String 
        },
        public_key: { 
            type: String 
        },
        webhook_url: { 
            type: String 
        }
    },
    // Outras configurações do sistema
    app_name: { 
        type: String, 
        default: 'MCP Service Desk' 
    },
    app_url: { 
        type: String, 
        default: 'http://172.16.50.19:2600' 
    },
    ativo: { 
        type: Boolean, 
        default: true 
    }
}, { 
    versionKey: false, 
    timestamps: true 
});

const SystemConfig = mongoose.model('SystemConfig', SystemConfigSchema);

module.exports = { SystemConfig };