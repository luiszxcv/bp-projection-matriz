"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_LABELS = exports.TIER_LABELS = exports.MONTHS = exports.defaultInputs = void 0;
// Helper to create array of 12 with same value
const fill12 = (val) => Array(12).fill(val);
// Helper to create ProductMonthlyArrays with same value for each product
const fillProductMonthly = (vals) => ({
    saber: fill12(vals.saber),
    ter: fill12(vals.ter),
    executarNoLoyalty: fill12(vals.executarNoLoyalty),
    executarLoyalty: fill12(vals.executarLoyalty),
    potencializar: fill12(vals.potencializar),
});
const defaultTierMetrics = {
    enterprise: {
        mqlDistribution: fill12(0.0460),
        mqlToSqlRate: fill12(0.20),
        sqlToSalRate: fill12(0.86),
        salToWonRate: fill12(0.30),
        activationRate: fill12(0.88),
        revenueActivationRate: fill12(0.93),
        productDistribution: fillProductMonthly({
            saber: 0.60,
            ter: 0.10,
            executarNoLoyalty: 0.00,
            executarLoyalty: 0.20,
            potencializar: 0.10,
        }),
        productTickets: {
            // Enterprise Saber: Q1=30k, Q2=50k, Q3=100k, Q4=150k
            saber: [30000, 30000, 30000, 50000, 50000, 50000, 100000, 100000, 100000, 150000, 150000, 150000],
            ter: fill12(31600),
            // Enterprise Executar No Loyalty: 0 (não vendem mais direto)
            executarNoLoyalty: fill12(0),
            // Enterprise Executar Loyalty: R$ 145k (valor anualizado do contrato)
            executarLoyalty: fill12(145000),
            potencializar: fill12(0),
        },
    },
    large: {
        mqlDistribution: fill12(0.0511),
        mqlToSqlRate: fill12(0.25),
        sqlToSalRate: fill12(0.86),
        salToWonRate: fill12(0.30),
        activationRate: fill12(0.84),
        revenueActivationRate: fill12(0.93),
        productDistribution: fillProductMonthly({
            saber: 0.60,
            ter: 0.10,
            executarNoLoyalty: 0.00,
            executarLoyalty: 0.20,
            potencializar: 0.10,
        }),
        productTickets: {
            // Large Saber: Q1=25k, Q2=40k, Q3=80k, Q4=120k
            saber: [25000, 25000, 25000, 40000, 40000, 40000, 80000, 80000, 80000, 120000, 120000, 120000],
            ter: fill12(18000),
            // Large Executar No Loyalty: 0 (não vendem mais direto)
            executarNoLoyalty: fill12(0),
            // Large Executar Loyalty: R$ 99k
            executarLoyalty: fill12(99000),
            potencializar: fill12(0),
        },
    },
    medium: {
        mqlDistribution: fill12(0.2023),
        mqlToSqlRate: fill12(0.30),
        sqlToSalRate: fill12(0.86),
        salToWonRate: fill12(0.30),
        activationRate: fill12(0.93),
        revenueActivationRate: fill12(0.93),
        productDistribution: fillProductMonthly({
            saber: 0.60,
            ter: 0.10,
            executarNoLoyalty: 0.00,
            executarLoyalty: 0.30,
            potencializar: 0.00,
        }),
        productTickets: {
            // Medium Saber: Q1=20k, Q2=40k, Q3=80k, Q4=100k
            saber: [20000, 20000, 20000, 40000, 40000, 40000, 80000, 80000, 80000, 100000, 100000, 100000],
            ter: fill12(15000),
            // Medium Executar No Loyalty: 0
            executarNoLoyalty: fill12(0),
            // Medium Executar Loyalty: R$ 49k
            executarLoyalty: fill12(49000),
            potencializar: fill12(0),
        },
    },
    small: {
        mqlDistribution: fill12(0.4760),
        mqlToSqlRate: fill12(0.30),
        sqlToSalRate: fill12(0.86),
        salToWonRate: fill12(0.30),
        activationRate: fill12(0.93),
        revenueActivationRate: fill12(0.93),
        productDistribution: fillProductMonthly({
            saber: 0.80,
            ter: 0.20,
            executarNoLoyalty: 0.00,
            executarLoyalty: 0.00,
            potencializar: 0.00,
        }),
        productTickets: {
            // Small Saber: Q1=20k, Q2=30k, Q3=40k, Q4=50k
            saber: [20000, 20000, 20000, 30000, 30000, 30000, 40000, 40000, 40000, 50000, 50000, 50000],
            ter: fill12(11500),
            executarNoLoyalty: fill12(0),
            executarLoyalty: fill12(0),
            potencializar: fill12(0),
        },
    },
    tiny: {
        mqlDistribution: fill12(0.2246),
        mqlToSqlRate: fill12(0.30),
        sqlToSalRate: fill12(0.86),
        salToWonRate: fill12(0.30),
        activationRate: fill12(0.93),
        revenueActivationRate: fill12(0.93),
        productDistribution: fillProductMonthly({
            saber: 0.80,
            ter: 0.20,
            executarNoLoyalty: 0.00,
            executarLoyalty: 0.00,
            potencializar: 0.00,
        }),
        productTickets: {
            // Tiny Saber: Q1=15k, Q2=20k, Q3=30k, Q4=40k
            saber: [15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000, 40000, 40000, 40000],
            ter: fill12(7500),
            executarNoLoyalty: fill12(0),
            executarLoyalty: fill12(0),
            potencializar: fill12(0),
        },
    },
};
exports.defaultInputs = {
    name: 'Nova Simulação',
    topline: {
        // Budget mensal de mídia (valores do BP 2026)
        investmentMonthly: [
            4838976, // Jan
            4838976, // Fev
            5080925, // Mar
            5589017, // Abr
            6147919, // Mai
            6455315, // Jun
            6778081, // Jul
            6778081, // Ago
            6778081, // Set
            6100273, // Out
            5422464, // Nov
            4744656, // Dez
        ],
    // ... rest omitted for brevity
};
exports.MONTHS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
exports.TIER_LABELS = {
    enterprise: 'Enterprise',
    large: 'Large',
    medium: 'Medium',
    small: 'Small',
    tiny: 'Tiny',
};
exports.PRODUCT_LABELS = {
    saber: 'Saber',
    ter: 'Ter',
    executarNoLoyalty: 'Executar (No Loyalty)',
    executarLoyalty: 'Executar (Loyalty)',
    potencializar: 'Potencializar',
};
