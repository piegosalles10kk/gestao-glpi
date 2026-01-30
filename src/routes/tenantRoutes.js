// src/routes/tenantRoutes.js
const express = require('express');
const router = express.Router();
const tenantAuthController = require('../controllers/tenantAuthController');
const ticketController = require('../controllers/ticketController');

// ========== AUTENTICAÇÃO ==========
// Login de usuário do tenant
router.post('/auth/login', tenantAuthController.login);

// Criar novo tenant (apenas super admin)
router.post('/auth/tenant', tenantAuthController.createTenant);

// Criar usuário dentro de um tenant
router.post('/auth/user', tenantAuthController.createTenantUser);

// Alterar senha
router.put('/auth/password', tenantAuthController.changePassword);

// ========== CONFIGURAÇÕES ==========
// Obter configurações do tenant
router.get('/:tenant_id/config', tenantAuthController.getTenantConfig);

// Atualizar configurações do tenant
router.put('/:tenant_id/config', tenantAuthController.updateTenantConfig);

// ========== TICKETS/CHAMADOS ==========
// Buscar chamados
router.get('/:tenant_id/tickets', ticketController.getTickets);

// Atribuir chamado a técnico
router.post('/:tenant_id/tickets/assign', ticketController.assignTicket);

// Atribuir categoria a chamado
router.post('/:tenant_id/tickets/category', ticketController.assignCategory);

// Obter estatísticas do dia
router.get('/:tenant_id/stats', ticketController.getDailyStats);

// Executar atribuição automática
router.post('/:tenant_id/tickets/auto-assign', ticketController.autoAssignTickets);

module.exports = router;