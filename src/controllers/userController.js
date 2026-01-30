const { User, Cargo } = require('../models/user');

// CREATE - Criar usuário vinculado a um Cargo Interno
exports.createUser = async (req, res) => {
    try {
        console.log("Criando usuário com dados:", req.body);
        
        const novoUsuario = new User({
            _id: req.body._id, // ID do GLPI
            nome: req.body.nome,
            userNameGlpi: req.body.userNameGlpi,
            entidade: req.body.entidade,
            cargo: req.body.cargo
        });

        await novoUsuario.save();
        res.status(201).json(novoUsuario);
    } catch (error) {
        // Se o erro for 11000 aqui, será por causa do _id (usuário já cadastrado)
        console.error("Erro ao criar usuário:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// READ - Listar todos os usuários com a "Árvore" completa de Cargo e Competências
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .populate({
                path: 'cargo',
                populate: { 
                    path: 'competencias',
                    select: 'name completename' // Detalhes que vêm do GLPI
                }
            })
            .sort({ nome: 1 });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar usuários", error: error.message });
    }
};

// READ - Buscar um usuário específico
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate({
                path: 'cargo',
                populate: { path: 'competencias' }
            });

        if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// UPDATE - Alterar cargo ou dados do usuário
exports.updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate({
            path: 'cargo',
            populate: { path: 'competencias' }
        });
        
        if (!updatedUser) return res.status(404).json({ message: "Usuário não encontrado" });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: "Erro ao atualizar", error: error.message });
    }
};

// DELETE - Remover usuário do sistema local
exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: "Usuário não encontrado" });
        res.status(200).json({ message: "Usuário removido com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};