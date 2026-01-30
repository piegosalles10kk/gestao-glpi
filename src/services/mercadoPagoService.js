// src/services/mercadoPagoService.js
const axios = require('axios');
const { SystemConfig } = require('../models/systemConfig');

class MercadoPagoService {
    constructor() {
        this.accessToken = null;
        this.publicKey = null;
        this.enabled = false;
    }

    async initialize() {
        try {
            const config = await SystemConfig.findOne({ tipo: 'system' });
            if (config && config.mercadopago.enabled) {
                this.accessToken = config.mercadopago.access_token;
                this.publicKey = config.mercadopago.public_key;
                this.enabled = true;
            }
        } catch (error) {
            console.error('Erro ao inicializar Mercado Pago:', error);
        }
    }

    isEnabled() {
        return this.enabled && this.accessToken;
    }

    async createCustomer(customerData) {
        if (!this.isEnabled()) {
            throw new Error('Mercado Pago não configurado');
        }

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/v1/customers',
                {
                    email: customerData.email,
                    first_name: customerData.nome,
                    description: `Cliente ${customerData.tenant_slug}`
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao criar customer:', error.response?.data || error.message);
            throw new Error('Falha ao criar cliente no Mercado Pago');
        }
    }

    async createSubscription(subscriptionData) {
        if (!this.isEnabled()) {
            throw new Error('Mercado Pago não configurado');
        }

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/preapproval',
                {
                    reason: subscriptionData.reason,
                    auto_recurring: {
                        frequency: 1,
                        frequency_type: 'months',
                        transaction_amount: subscriptionData.amount,
                        currency_id: 'BRL'
                    },
                    back_url: subscriptionData.back_url,
                    payer_email: subscriptionData.payer_email,
                    status: 'pending'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao criar assinatura:', error.response?.data || error.message);
            throw new Error('Falha ao criar assinatura no Mercado Pago');
        }
    }

    async getSubscriptionStatus(subscriptionId) {
        if (!this.isEnabled()) {
            return null;
        }

        try {
            const response = await axios.get(
                `https://api.mercadopago.com/preapproval/${subscriptionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao buscar status da assinatura:', error.response?.data || error.message);
            return null;
        }
    }

    async cancelSubscription(subscriptionId) {
        if (!this.isEnabled()) {
            throw new Error('Mercado Pago não configurado');
        }

        try {
            const response = await axios.put(
                `https://api.mercadopago.com/preapproval/${subscriptionId}`,
                { status: 'cancelled' },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao cancelar assinatura:', error.response?.data || error.message);
            throw new Error('Falha ao cancelar assinatura no Mercado Pago');
        }
    }

    async createPaymentLink(paymentData) {
        if (!this.isEnabled()) {
            throw new Error('Mercado Pago não configurado');
        }

        try {
            const response = await axios.post(
                'https://api.mercadopago.com/checkout/preferences',
                {
                    items: [{
                        title: paymentData.title,
                        quantity: 1,
                        unit_price: paymentData.amount
                    }],
                    payer: {
                        email: paymentData.payer_email
                    },
                    back_urls: {
                        success: paymentData.success_url,
                        failure: paymentData.failure_url,
                        pending: paymentData.pending_url
                    },
                    auto_return: 'approved',
                    external_reference: paymentData.external_reference
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao criar link de pagamento:', error.response?.data || error.message);
            throw new Error('Falha ao criar link de pagamento');
        }
    }
}

// Singleton instance
const mercadoPagoService = new MercadoPagoService();

module.exports = mercadoPagoService;