const express = require('express');
const router = express.Router();
const entidadeController = require('../controllers/entidadeController');

// Rota para salvar ou atualizar a prioridade (POST ou PUT)
router.post('/', entidadeController.saveEntidadePrioridade);

// Rota para listar o que já está salvo no banco
router.get('/', entidadeController.getAllEntidadesConfiguradas);

// Buscar detalhes de uma
router.get('/:id', entidadeController.getEntidadeById);

// Deletar configuração
router.delete('/:id', entidadeController.deleteEntidadeConfig);

module.exports = router;