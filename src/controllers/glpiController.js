const { getSessionToken } = require('../services/glpiAuthService');
const axios = require('axios');

// Configurações fixas
const GLPI_APP_TOKEN = 'rNkCgKqtRIfBmY2mVi3zXOhPSXvkYPGSDh4sIuPe';

/**
 * Consulta apenas usuários com perfil técnico (Proxy)
 */
exports.getGlpiTechnicians = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const baseUrl = `https://chamados.bugbusters.me/apirest.php/search/User`;
        
        const params = new URLSearchParams({
            'criteria[0][field]': '20',      
            'criteria[0][searchtype]': 'equals',
            'criteria[0][value]': '6',       
            'forcedisplay[0]': '1',          
            'forcedisplay[1]': '2',          
            'forcedisplay[2]': '9',          
            'forcedisplay[3]': '34',         
            'forcedisplay[4]': '5',          
            'forcedisplay[5]': '80',         
            'range': '0-500',                
            'rawdata': 'true'
        });

        const response = await axios.get(`${baseUrl}?${params.toString()}`, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        const rawData = response.data.data || [];

        const technicians = rawData.map(u => ({
            id: u["2"],
            login: u["1"],
            nome: u["9"],
            sobrenome: u["34"],
            email: u["5"],
            entidade: u["80"],
            is_technician: true
        }));

        res.status(200).json(technicians);

    } catch (error) {
        console.error('Erro na consulta de técnicos:', error.message);
        res.status(500).json({ 
            message: "Erro ao consultar usuários técnicos no GLPI", 
            error: error.response?.data || error.message 
        });
    }
};

/**
 * Consulta categorias ITIL (Competências) em tempo real (Proxy)
 */
exports.getGlpiCategories = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();
        const url = `https://chamados.bugbusters.me/apirest.php/ITILCategory?range=0-999&is_recursive=true`;

        const response = await axios.get(url, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        res.status(200).json(response.data);

    } catch (error) {
        res.status(500).json({ 
            message: "Erro ao consultar categorias no GLPI", 
            error: error.message 
        });
    }
};

/**
 * Consulta Entidades do GLPI em tempo real (Proxy)
 */
exports.getGlpiEntities = async (req, res) => {
    try {
        const sessionToken = await getSessionToken();

        // URL fornecida para busca de Entidades
        const url = `https://chamados.bugbusters.me/apirest.php/Entity?range=0-999`;

        const response = await axios.get(url, {
            headers: {
                'App-Token': GLPI_APP_TOKEN,
                'Session-Token': sessionToken
            }
        });

        // Mapeia para manter o padrão amigável caso deseje
        const entities = response.data.map(ent => ({
            id: ent.id,
            nome: ent.completename || ent.name,
            level: ent.level
        }));

        res.status(200).json(entities);

    } catch (error) {
        console.error('Erro ao consultar entidades:', error.message);
        res.status(500).json({ 
            message: "Erro ao consultar entidades no GLPI", 
            error: error.message 
        });
    }
};