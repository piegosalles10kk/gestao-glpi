// app.js
require('dotenv').config();
const express = require('express');
const path = require('path'); 
const cors = require('cors');
const connectDB = require('./src/config/dbConnect');

// Import das Rotas
const userRoutes = require('./src/routes/userRoutes');
const competenciaRoutes = require('./src/routes/competenciaRoutes');
const glpiRoutes = require('./src/routes/glpiRoutes');
const cargoRoutes = require('./src/routes/cargoRoutes');
const entidadeRoutes = require('./src/routes/entidadeRoutes');
const authRoutes = require('./src/routes/authRoutes');
const configRoutes = require('./src/routes/configRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');

const app = express();

// 1. Conectar ao Banco de Dados
connectDB();

// 2. Middlewares Globais
app.use(cors());
app.use(express.json());

// 3. Servir Arquivos Estáticos (Dashboard)
app.use(express.static(path.join(__dirname, 'view')));

// 4. Middlewares de Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/users', userRoutes);
app.use('/api/competencias', competenciaRoutes);
app.use('/api/glpi', glpiRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/entidades-config', entidadeRoutes);
app.use('/api/tenant', tenantRoutes);

// 5. Rota de Fallback
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: "Rota de API não encontrada" });
    }
    res.sendFile(path.join(__dirname, 'view', 'tenant-login.html'));
});

// 6. Inicialização do Servidor
const PORT = process.env.PORT || 2600;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando com sucesso!`);
    console.log(`🔗 Link: http://172.16.50.19:${PORT}`);
    console.log(`📊 Multi-Tenant Dashboard disponível`);
});