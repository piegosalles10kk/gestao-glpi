// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Inicializar admin (executar apenas uma vez)
router.post('/init-admin', authController.initializeAdmin);

// Login
router.post('/login', authController.login);

// Validar sessão
router.get('/validate', authController.validateSession);

// Alterar senha
router.put('/change-password', authController.changePassword);

module.exports = router;