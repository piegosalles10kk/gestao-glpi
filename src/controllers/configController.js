// src/controllers/configController.js
const { Config } = require('../models/config');

// Salvar ou atualizar configurações GLPI
exports.saveGlpiConfig = async (req, res) => {
    try {
        const { glpi_url, glpi_app_token, glpi_user_login, glpi_user_password } = req.body;

        const config = await Config.findOneAndUpdate(
            { tipo: 'glpi' },
            {
                glpi_url,
                glpi_app_token,
                glpi_user_login,
                glpi_user_password,
                ativo: true
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: "Configurações salvas com sucesso",
            config: {
                glpi_url: config.glpi_url,
                // Não retornar senha completa
                glpi_user_login: config.glpi_user_login
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Buscar configurações GLPI
exports.getGlpiConfig = async (req, res) => {
    try {
        const config = await Config.findOne({ tipo: 'glpi' });
        
        if (!config) {
            return res.status(404).json({ 
                message: "Configurações não encontradas",
                config: null 
            });
        }

        res.status(200).json({
            glpi_url: config.glpi_url,
            glpi_app_token: config.glpi_app_token,
            glpi_user_login: config.glpi_user_login,
            glpi_user_password: config.glpi_user_password,
            ativo: config.ativo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Testar conexão GLPI
exports.testGlpiConnection = async (req, res) => {
    try {
        const { glpi_url, glpi_app_token, glpi_user_login, glpi_user_password } = req.body;
        
        const axios = require('axios');
        
        const response = await axios.post(`${glpi_url}/initSession`, {
            login: glpi_user_login,
            password: glpi_user_password
        }, {
            headers: {
                'App-Token': glpi_app_token,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.session_token) {
            res.status(200).json({ 
                success: true, 
                message: "Conexão com GLPI estabelecida com sucesso!" 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: "Falha na autenticação com GLPI" 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Erro ao conectar com GLPI: " + error.message 
        });
    }
};