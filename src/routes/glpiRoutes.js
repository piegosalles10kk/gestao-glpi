const express = require('express');
const router = express.Router();
const glpiController = require('../controllers/glpiController');

// Rota para listar apenas os técnicos (Proxy Search User)
router.get('/tecnicos', glpiController.getGlpiTechnicians);

// Rota para listar as categorias ITIL (Proxy ITILCategory)
router.get('/categorias', glpiController.getGlpiCategories);

// Rota para listar as entidades direto do GLPI (Proxy Entity)
router.get('/entidades', glpiController.getGlpiEntities);

module.exports = router;