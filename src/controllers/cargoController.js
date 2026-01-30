const { Cargo } = require('../models/user');

// CREATE - Criar um novo cargo interno
exports.createCargo = async (req, res) => {
    try {
        // req.body deve conter: { nome, descricao, competencias: [114, 115...] }
        const novoCargo = new Cargo(req.body);
        const cargoSalvo = await novoCargo.save();
        res.status(201).json(cargoSalvo);
    } catch (error) {
        res.status(400).json({ message: "Erro ao criar cargo", error: error.message });
    }
};

// READ - Listar todos os cargos (com as competências do GLPI detalhadas)
exports.getAllCargos = async (req, res) => {
    try {
        const cargos = await Cargo.find()
            .populate('competencias', 'name completename') // Busca os detalhes na coleção de Competencias
            .sort({ nome: 1 });
        res.status(200).json(cargos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// READ - Buscar um cargo específico
exports.getCargoById = async (req, res) => {
    try {
        const cargo = await Cargo.findById(req.params.id).populate('competencias');
        if (!cargo) return res.status(404).json({ message: "Cargo não encontrado" });
        res.status(200).json(cargo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE - Atualizar nome ou lista de competências
exports.updateCargo = async (req, res) => {
    try {
        const cargoAtualizado = await Cargo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('competencias');

        if (!cargoAtualizado) return res.status(404).json({ message: "Cargo não encontrado" });
        res.status(200).json(cargoAtualizado);
    } catch (error) {
        res.status(400).json({ message: "Erro ao atualizar cargo", error: error.message });
    }
};

// DELETE - Remover cargo
exports.deleteCargo = async (req, res) => {
    try {
        const cargoDeletado = await Cargo.findByIdAndDelete(req.params.id);
        if (!cargoDeletado) return res.status(404).json({ message: "Cargo não encontrado" });
        res.status(200).json({ message: "Cargo removido com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};