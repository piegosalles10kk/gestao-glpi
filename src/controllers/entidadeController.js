const { Entidade } = require('../models/user');

// Criar ou Atualizar Entidade (Salvar Prioridade)
exports.saveEntidadePrioridade = async (req, res) => {
    try {
        const { _id, nome, prioridade, matriz_config } = req.body;

        // O id vem do GLPI, usamos ele como _id
        const entidade = await Entidade.findOneAndUpdate(
            { _id },
            { nome, prioridade, matriz_config },
            { new: true, upsert: true }
        );

        res.status(200).json(entidade);
    } catch (error) {
        res.status(500).json({ message: "Erro ao salvar prioridade", error: error.message });
    }
};

// Listar todas as entidades configuradas no banco local
exports.getAllEntidadesConfiguradas = async (req, res) => {
    try {
        const entidades = await Entidade.find().sort({ nome: 1 });
        res.status(200).json(entidades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Buscar uma entidade específica pelo ID do GLPI
exports.getEntidadeById = async (req, res) => {
    try {
        const entidade = await Entidade.findById(req.params.id);
        if (!entidade) return res.status(404).json({ message: "Entidade não configurada localmente" });
        res.status(200).json(entidade);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remover configuração de prioridade de uma entidade
exports.deleteEntidadeConfig = async (req, res) => {
    try {
        await Entidade.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Configurações da entidade removidas com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};