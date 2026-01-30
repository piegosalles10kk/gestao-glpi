
// src/controllers/ticketController.js
const { Tenant } = require('../models/tenant');
const { User, Competencia } = require('../models/user');
const axios = require('axios');

// Função auxiliar para autenticação GLPI
async function getGlpiSession(glpiConfig) {
    const response = await axios.post(`${glpiConfig.url}/initSession`, {
        login: glpiConfig.user_login,
        password: glpiConfig.user_password
    }, {
        headers: {
            'App-Token': glpiConfig.app_token,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data.session_token;
}

// Buscar chamados do GLPI com filtros
exports.getTickets = async (req, res) => {
    try {
        const { tenant_id } = req.params;
        const { status } = req.query; // 1=novo, 2=atribuído, 3=planejado, 4=pendente

        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        const sessionToken = await getGlpiSession(tenant.glpi_config);
        
        // Construir URL de busca
        const statusFilter = status || tenant.automation_config.status_filter || '10';
        const statusArray = statusFilter === '10' ? [1, 2, 3, 4] : statusFilter.split(',');
        
        let allTickets = [];
        
        for (const st of statusArray) {
            const url = `${tenant.glpi_config.url}/search/Ticket?range=0-9999&withindexes=true&giveItems=true` +
                `&forcedisplay[0]=1&forcedisplay[1]=2&forcedisplay[2]=7&forcedisplay[3]=15` +
                `&forcedisplay[4]=80&forcedisplay[5]=5&forcedisplay[6]=3&forcedisplay[7]=21` +
                `&criteria[0][field]=23&criteria[0][searchtype]=equals&criteria[0][value]=0` +
                `&criteria[1][link]=AND&criteria[1][field]=12&criteria[1][searchtype]=equals&criteria[1][value]=${st}`;

            const response = await axios.get(url, {
                headers: {
                    'App-Token': tenant.glpi_config.app_token,
                    'Session-Token': sessionToken
                }
            });

            if (response.data && response.data.data) {
                allTickets.push(response.data);
            }
        }

        // Processar e formatar tickets
        const formattedTickets = processTickets(allTickets);
        
        res.status(200).json({
            total: formattedTickets.length,
            tickets: formattedTickets
        });
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        res.status(500).json({ error: error.message });
    }
};

// Processar dados dos tickets (similar ao código N8N)
function processTickets(allTicketsData) {
    let processedTickets = [];

    const superClean = (html) => {
        if (!html || typeof html !== 'string') return "";
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&#\d+;/g, (match) => String.fromCharCode(match.match(/\d+/)[0]))
            .replace(/\s+/g, ' ')
            .trim();
    };

    const extractUserInfo = (html) => {
        if (!html) return { nome: '', email: '', telefone: '' };
        const nomeMatch = html.match(/^([^<]+)/);
        const emailMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const telMatch = html.match(/tel:([^"'>\s]+)/);
        return {
            nome: nomeMatch ? nomeMatch[1].trim() : '',
            email: emailMatch ? emailMatch[1] : '',
            telefone: telMatch ? telMatch[1] : ''
        };
    };

    for (const ticketData of allTicketsData) {
        if (ticketData.data) {
            const ticketsHtml = ticketData.data_html || {};
            
            Object.keys(ticketData.data).forEach(ticketId => {
                if (!isNaN(ticketId)) {
                    const ticket = ticketData.data[ticketId];
                    const ticketHtml = ticketsHtml[ticketId] || {};
                    
                    const catRaw = superClean(ticketHtml[7] || ticket[7] || "Sem Categoria");
                    const reqInfo = extractUserInfo(ticketHtml[4] || "");
                    const tecInfo = extractUserInfo(ticketHtml[5] || "");

                    processedTickets.push({
                        id: ticket[2],
                        requerente_nome: reqInfo.nome,
                        requerente_email: reqInfo.email,
                        requerente_tel: reqInfo.telefone,
                        titulo: superClean(ticket[1]),
                        categoria: catRaw,
                        urgencia: ticket[3] || 0,
                        descricao_inicial: superClean(ticketHtml[21] || ticket[21] || ""),
                        status: ticket[12],
                        status_name: superClean(ticketHtml[12] || `Status ${ticket[12]}`),
                        data_abertura: ticket[15],
                        entidade: ticket[80],
                        tecnico_atribuido: tecInfo.nome || "Não atribuído"
                    });
                }
            });
        }
    }

    return processedTickets;
}

// Atribuir chamado a um técnico
exports.assignTicket = async (req, res) => {
    try {
        const { tenant_id } = req.params;
        const { ticket_id, user_id } = req.body;

        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        const sessionToken = await getGlpiSession(tenant.glpi_config);

        // Atribuir técnico ao chamado
        const response = await axios.post(
            `${tenant.glpi_config.url}/Ticket/${ticket_id}/Ticket_User/`,
            {
                input: {
                    tickets_id: ticket_id,
                    users_id: user_id,
                    type: 2 // Tipo 2 = Assigned to
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'App-Token': tenant.glpi_config.app_token,
                    'Session-Token': sessionToken,
                    'Set-ID-Entity': '0',
                    'Is-Recursive': 'true'
                }
            }
        );

        res.status(200).json({
            message: "Chamado atribuído com sucesso",
            result: response.data
        });
    } catch (error) {
        console.error('Erro ao atribuir chamado:', error);
        res.status(500).json({ error: error.message });
    }
};

// Atribuir categoria a um chamado
exports.assignCategory = async (req, res) => {
    try {
        const { tenant_id } = req.params;
        const { ticket_id, category_id } = req.body;

        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        const sessionToken = await getGlpiSession(tenant.glpi_config);

        // Atribuir categoria ao chamado
        const response = await axios.put(
            `${tenant.glpi_config.url}/Ticket/${ticket_id}`,
            {
                input: {
                    id: ticket_id,
                    itilcategories_id: category_id
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'App-Token': tenant.glpi_config.app_token,
                    'Session-Token': sessionToken,
                    'Set-ID-Entity': '0',
                    'Is-Recursive': 'true'
                }
            }
        );

        res.status(200).json({
            message: "Categoria atribuída com sucesso",
            result: response.data
        });
    } catch (error) {
        console.error('Erro ao atribuir categoria:', error);
        res.status(500).json({ error: error.message });
    }
};

// Obter estatísticas do dia
exports.getDailyStats = async (req, res) => {
    try {
        const { tenant_id } = req.params;

        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        // Buscar todos os chamados
        const sessionToken = await getGlpiSession(tenant.glpi_config);
        
        const statusArray = [1, 2, 3, 4]; // novo, atribuído, planejado, pendente
        let allTickets = [];
        
        for (const st of statusArray) {
            const url = `${tenant.glpi_config.url}/search/Ticket?range=0-9999&withindexes=true&giveItems=true` +
                `&forcedisplay[0]=2&forcedisplay[1]=12&forcedisplay[2]=5` +
                `&criteria[0][field]=23&criteria[0][searchtype]=equals&criteria[0][value]=0` +
                `&criteria[1][link]=AND&criteria[1][field]=12&criteria[1][searchtype]=equals&criteria[1][value]=${st}`;

            const response = await axios.get(url, {
                headers: {
                    'App-Token': tenant.glpi_config.app_token,
                    'Session-Token': sessionToken
                }
            });

            if (response.data && response.data.data) {
                allTickets = allTickets.concat(Object.values(response.data.data).filter(t => !isNaN(t[2])));
            }
        }

        // Calcular estatísticas
        const stats = {
            chamados_disponiveis: allTickets.filter(t => t[12] === 1).length, // Status 1 = Novo
            chamados_atribuidos: allTickets.filter(t => t[12] === 2).length,  // Status 2 = Atribuído
            chamados_planejados: allTickets.filter(t => t[12] === 3).length,  // Status 3 = Planejado
            chamados_pendentes: allTickets.filter(t => t[12] === 4).length,   // Status 4 = Pendente
            total: allTickets.length
        };

        // Atualizar cache no tenant
        tenant.daily_stats = {
            data: new Date(),
            ...stats
        };
        await tenant.save();

        res.status(200).json(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: error.message });
    }
};

// Executar atribuição automática (baseado na lógica do N8N)
exports.autoAssignTickets = async (req, res) => {
    try {
        const { tenant_id } = req.params;

        const tenant = await Tenant.findById(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: "Tenant não encontrado" });
        }

        if (!tenant.automation_config.auto_assign_enabled) {
            return res.status(400).json({ message: "Atribuição automática desabilitada" });
        }

        // Buscar chamados novos
        const sessionToken = await getGlpiSession(tenant.glpi_config);
        
        // Buscar técnicos e suas competências
        const tecnicos = await User.find()
            .populate({
                path: 'cargo',
                populate: { path: 'competencias' }
            });

        // Buscar matriz de prioridade
        const { Entidade } = require('../models/user');
        const matrizPrioridade = await Entidade.find();

        // Implementar lógica de atribuição (simplificada)
        const atribuidos = [];
        
        // ... (implementar lógica completa do N8N aqui)

        res.status(200).json({
            message: "Atribuição automática executada",
            total_atribuidos: atribuidos.length,
            atribuidos
        });
    } catch (error) {
        console.error('Erro na atribuição automática:', error);
        res.status(500).json({ error: error.message });
    }
};