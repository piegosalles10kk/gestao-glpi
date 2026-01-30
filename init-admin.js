// init-admin.js
const axios = require('axios');

const API_URL = 'http://172.16.50.19:2500/api';

async function initAdmin() {
    try {
        const response = await axios.post(`${API_URL}/auth/init-admin`);
        console.log('✅', response.data.message);
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
    }
}

initAdmin();