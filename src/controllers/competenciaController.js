const { Competencia } = require('../models/user');
const { getSessionToken } = require('../services/glpiAuthService');
const axios = require('axios');

// 1. SINCRONIZAÇÃO DINÂMICA COM GLPI
exports.syncGLPI = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const glpiUrl = 'https://chamados.bugbusters.me/apirest.php/ITILCategory?range=0-999&is_recursive=true';
        
        const response = await axios.get(glpiUrl, {
            headers: {
                'App-Token': 'rNkCgKqtRIfBmY2mVi3zXOhPSXvkYPGSDh4sIuPe',
                'Session-Token': sessionToken
            }
        });

        const categorias = response.data;

        const bulkOps = categorias.map(item => {
            // Quebra a string "Service Desk > Antivirus > Falha/Erro"
            const partes = item.completename.split(' > ');
            let nomeFormatado;

            if (partes.length >= 2) {
                // Formato: "Pai Filho" -> Ex: "Service Desk Antivirus"
                nomeFormatado = `${partes[0]} ${partes[1]}`;
            } else {
                nomeFormatado = partes[0];
            }

            return {
                updateOne: {
                    filter: { _id: item.id },
                    update: { 
                        $set: {
                            name: nomeFormatado, 
                            completename: item.completename,
                            level: item.level,
                            itilcategories_id: item.itilcategories_id
                        }
                    },
                    upsert: true 
                }
            };
        });

        await Competencia.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Sincronização concluída!",
            total_processado: categorias.length
        });

    } catch (error) {
        res.status(500).json({ 
            message: "Erro na sincronização", 
            error: error.response?.data || error.message 
        });
    }
};

exports.getAllCompetencias = async (req, res) => {
    try {
        // Primeiro, buscamos todos para processar a lógica de níveis
        const todas = await Competencia.find().lean();

        // Filtramos manualmente para garantir que funcione mesmo sem o campo 'level'
        const filtradas = todas.filter(item => {
            const partes = item.completename.split(' > ');
            // Mantemos apenas itens que tenham 1 ou 2 níveis
            return partes.length === 1 || partes.length === 2;
        });

        // Usamos um Map para garantir que o "name" seja único
        const uniqueMap = new Map();

        filtradas.forEach(item => {
            const partes = item.completename.split(' > ');
            let nomeFormatado = partes.length >= 2 
                ? `${partes[0]} ${partes[1]}` 
                : partes[0];

            // Se o nome já existir, ele não sobrescreve, mantendo apenas o primeiro encontrado
            if (!uniqueMap.has(nomeFormatado)) {
                uniqueMap.set(nomeFormatado, {
                    _id: item._id,
                    name: nomeFormatado,
                    completename: item.completename
                });
            }
        });

        // Converte o Map de volta para Array e ordena
        const resultado = Array.from(uniqueMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        res.status(200).json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. BUSCA POR ID
exports.getCompetenciaById = async (req, res) => {
    try {
        const comp = await Competencia.findById(req.params.id);
        if (!comp) return res.status(404).json({ message: "Competência não encontrada" });
        res.status(200).json(comp);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE
exports.deleteCompetencia = async (req, res) => {
    try {
        await Competencia.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Removida com sucesso" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};