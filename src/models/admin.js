// src/models/admin.js
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    nome: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: 'admin' 
    }
}, { versionKey: false, timestamps: true });

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = { Admin };