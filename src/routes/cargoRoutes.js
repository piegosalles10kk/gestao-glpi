const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');

// Endpoints do CRUD de Cargos
router.post('/', cargoController.createCargo);           // Criar Cargo
router.get('/', cargoController.getAllCargos);            // Listar todos
router.get('/:id', cargoController.getCargoById);         // Buscar um
router.put('/:id', cargoController.updateCargo);          // Atualizar (Adicionar/Remover competências)
router.delete('/:id', cargoController.deleteCargo);       // Deletar

module.exports = router;