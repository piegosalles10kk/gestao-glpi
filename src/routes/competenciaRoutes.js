const express = require('express');
const router = express.Router();
const competenciaController = require('../controllers/competenciaController');

// Endpoint para disparar a sincronização manual com o GLPI
router.get('/sync', competenciaController.syncGLPI);

// Endpoints para listar e gerenciar o que já está no banco
router.get('/', competenciaController.getAllCompetencias);
router.get('/:id', competenciaController.getCompetenciaById);
router.delete('/:id', competenciaController.deleteCompetencia);

module.exports = router;