// src/services/glpiAuthService.js
const axios = require('axios');
const { Config } = require('../models/config');

const getSessionToken = async () => {
  try {
    // Buscar configurações do banco
    const config = await Config.findOne({ tipo: 'glpi', ativo: true });
    
    if (!config) {
      throw new Error('Configurações GLPI não encontradas. Configure o sistema primeiro.');
    }

    const url = `${config.glpi_url}/initSession`;
    const headers = {
      'Content-Type': 'application/json',
      'App-Token': config.glpi_app_token,
    };
    const body = {
      login: config.glpi_user_login,
      password: config.glpi_user_password,
    };

    const response = await axios.post(url, body, { headers });

    const sessionToken = response.data.session_token;

    if (!sessionToken) {
      throw new Error('O Session-Token não foi encontrado na resposta da API.');
    }

    console.log('Session-Token obtido com sucesso.');
    return sessionToken;
  } catch (error) {
    console.error('Erro ao obter o Session-Token:', error.response?.data || error.message);
    throw new Error('Falha na autenticação com a API do GLPI.');
  }
};

// Função auxiliar para obter configurações
const getGlpiConfig = async () => {
  const config = await Config.findOne({ tipo: 'glpi', ativo: true });
  if (!config) {
    throw new Error('Configurações GLPI não encontradas');
  }
  return config;
};

module.exports = { getSessionToken, getGlpiConfig };