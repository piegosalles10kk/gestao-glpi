// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// Tenants
router.get('/tenants', adminController.getAllTenants);
router.post('/tenants', adminController.createTenant);
router.put('/tenants/:id', adminController.updateTenant);
router.delete('/tenants/:id', adminController.deleteTenant);
router.put('/tenants/:id/suspend', adminController.suspendTenant);
router.put('/tenants/:id/reactivate', adminController.reactivateTenant);

// Planos
router.get('/plans', adminController.getAllPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans/:id', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// Configurações do Sistema
router.get('/system-config', adminController.getSystemConfig);
router.put('/system-config', adminController.updateSystemConfig);
router.post('/test-mercadopago', adminController.testMercadoPago);

module.exports = router;