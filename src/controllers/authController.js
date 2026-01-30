// src/controllers/authController.js
const { Admin } = require('../models/admin');
const crypto = require('crypto');

// Função para criar hash de senha
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Inicializar admin padrão (executar uma vez)
exports.initializeAdmin = async (req, res) => {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        
        if (!adminExists) {
            const adminPadrao = new Admin({
                username: 'admin',
                password: hashPassword('Bug*0000'),
                nome: 'Administrador',
                role: 'admin'
            });
            
            await adminPadrao.save();
            res.status(201).json({ message: "Admin criado com sucesso!" });
        } else {
            res.status(200).json({ message: "Admin já existe" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: "Username e senha são obrigatórios" });
        }

        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        const hashedPassword = hashPassword(password);
        
        if (admin.password !== hashedPassword) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Criar sessão (armazenar no localStorage do cliente)
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        res.status(200).json({
            message: "Login realizado com sucesso",
            token: sessionToken,
            user: {
                username: admin.username,
                nome: admin.nome,
                role: admin.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Validar sessão (middleware simples)
exports.validateSession = async (req, res) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    // Aqui você pode implementar validação mais robusta com JWT
    res.status(200).json({ valid: true });
};

// Alterar senha
exports.changePassword = async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        const hashedCurrentPassword = hashPassword(currentPassword);
        
        if (admin.password !== hashedCurrentPassword) {
            return res.status(401).json({ message: "Senha atual incorreta" });
        }

        admin.password = hashPassword(newPassword);
        await admin.save();
        
        res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};