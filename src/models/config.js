// src/models/config.js
const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    tipo: { 
        type: String, 
        required: true, 
        unique: true,
        default: 'glpi' 
    },
    glpi_url: { 
        type: String, 
        required: true 
    },
    glpi_app_token: { 
        type: String, 
        required: true 
    },
    glpi_user_login: { 
        type: String, 
        required: true 
    },
    glpi_user_password: { 
        type: String, 
        required: true 
    },
    ativo: { 
        type: Boolean, 
        default: true 
    }
}, { versionKey: false, timestamps: true });

const Config = mongoose.model('Config', ConfigSchema);

module.exports = { Config };