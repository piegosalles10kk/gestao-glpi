// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// Salvar configurações GLPI
router.post('/glpi', configController.saveGlpiConfig);

// Buscar configurações GLPI
router.get('/glpi', configController.getGlpiConfig);

// Testar conexão GLPI
router.post('/glpi/test', configController.testGlpiConnection);

module.exports = router;