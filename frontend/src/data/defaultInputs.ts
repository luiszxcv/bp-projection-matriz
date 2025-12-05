import { SimulationInputs, Tier, TierMetrics, ProductMonthlyArrays } from '@/types/simulation';

// Helper to create array of 12 with same value
const fill12 = (val: number): number[] => Array(12).fill(val);

// Helper to create ProductMonthlyArrays with same value for each product
const fillProductMonthly = (vals: { saber: number; ter: number; executarNoLoyalty: number; executarLoyalty: number; potencializar: number }): ProductMonthlyArrays => ({
  saber: fill12(vals.saber),
  ter: fill12(vals.ter),
  executarNoLoyalty: fill12(vals.executarNoLoyalty),
  executarLoyalty: fill12(vals.executarLoyalty),
  potencializar: fill12(vals.potencializar),
});

const defaultTierMetrics: Record<Tier, TierMetrics> = {
  enterprise: {
    mqlDistribution: fill12(0.0460),
    mqlToSqlRate: fill12(0.25),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.25),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.30,
      ter: 0.20,
      executarNoLoyalty: 0.20,
      executarLoyalty: 0.20,
      potencializar: 0.10,
    }),
    productTickets: fillProductMonthly({
      saber: 50000,
      // Enterprise Ter ticket ramps by quarter: 15k, 20k, 30k, 35k
      ter: [15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000, 35000, 35000, 35000],
      executarNoLoyalty: 29000,
      executarLoyalty: 145000,
      potencializar: 0,
    }),
  },
  large: {
    mqlDistribution: fill12(0.0511),
    mqlToSqlRate: fill12(0.30),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.25),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.30,
      ter: 0.00,
      executarNoLoyalty: 0.30,
      executarLoyalty: 0.30,
      potencializar: 0.10,
    }),
    productTickets: {
      // Large Saber: Q1=25k, Q2=40k, Q3=80k, Q4=120k
      saber: [25000, 25000, 25000, 40000, 40000, 40000, 80000, 80000, 80000, 120000, 120000, 120000],
      ter: fill12(18000),
      // Large Executar (ticket MENSAL): Q1=11k, Q2=15k, Q3=20k, Q4=20k
      executarNoLoyalty: [11000, 11000, 11000, 15000, 15000, 15000, 20000, 20000, 20000, 20000, 20000, 20000],
      executarLoyalty: [11000, 11000, 11000, 15000, 15000, 15000, 20000, 20000, 20000, 20000, 20000, 20000],
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
      executarNoLoyalty: 0.15,
      executarLoyalty: 0.15,
      potencializar: 0.00,
    }),
    productTickets: {
      // Medium Saber: Q1=20k, Q2=40k, Q3=80k, Q4=100k
      saber: [20000, 20000, 20000, 40000, 40000, 40000, 80000, 80000, 80000, 100000, 100000, 100000],
      ter: fill12(15000),
      // Medium Executar (ticket MENSAL): Q1=7k, Q2=8k, Q3=9k, Q4=10k
      executarNoLoyalty: [7000, 7000, 7000, 8000, 8000, 8000, 9000, 9000, 9000, 10000, 10000, 10000],
      executarLoyalty: [7000, 7000, 7000, 8000, 8000, 8000, 9000, 9000, 9000, 10000, 10000, 10000],
      potencializar: fill12(0),
    },
  },
  small: {
    mqlDistribution: fill12(0.4760),
    mqlToSqlRate: fill12(0.35),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.30),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: {
      // Small: Saber + Ter nos 12 meses; Executar só Jan-Jun (aquisição direta)
      saber: [0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
      ter: [0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      executarNoLoyalty: fill12(0.00),
      executarLoyalty: fill12(0.00),
      potencializar: fill12(0.00),
    },
    productTickets: {
      // Small Saber: Q1=20k, Q2=30k, Q3=30k, Q4=40k
      saber: [20000, 20000, 20000, 30000, 30000, 30000, 30000, 30000, 30000, 40000, 40000, 40000],
      ter: fill12(11500),
      // Small Executar (ticket MENSAL): R$7k o ano todo (conversões Saber→Executar)
      executarNoLoyalty: fill12(7000),
      executarLoyalty: fill12(7000),
      potencializar: fill12(0),
    },
  },
  tiny: {
    mqlDistribution: fill12(0.2246),
    mqlToSqlRate: fill12(0.35),
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
      // Tiny Saber: Q1=13k, Q2=15k, Q3=20k, Q4=30k
      saber: [13000, 13000, 13000, 15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000],
      ter: fill12(7500),
      // Tiny Executar (ticket MENSAL): sempre 0
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(0),
      potencializar: fill12(0),
    },
  },
};

export const defaultInputs: SimulationInputs = {
  name: 'Nova Simulação',
  topline: {
    investmentMonthly: [
      400000,
      600000,
      900000,
      1000000,
      1000000,
      1100000,
      1000000,
      1000000,
      1000000,
      900000,
      800000,
      600000,
    ],
    cplMonthly: fill12(900),
  },
  tierMetrics: defaultTierMetrics,
  conversionRates: {
    saberToExecutar: 0.40,
    executarLoyaltyRatio: 0.40,
    saberConversionDays: 60,
    loyaltyDuration: 7,
    loyaltyRenewalRate: 0.20,
    loyaltyMaxRenewals: 2,
    noLoyaltyDuration: 2,
    noLoyaltyRenewalRate: 0.85,
    noLoyaltyMaxRenewals: 5,
    expansionRate: 0.04,
  },
  legacyBase: {
    enterprise: { revenue: 329176.85, clients: 13 },
    large: { revenue: 351936, clients: 23 },
    medium: { revenue: 854159.25, clients: 98 },
    small: { revenue: 242719.38, clients: 40 },
    tiny: { revenue: 211102.04, clients: 42 },
    churnRate: 0.07,
    expansionRate: 0.04,
  },
  expansionDistribution: {
    largeEnterprise: {
      saber: 0.05,
      ter: 0.25,
      executarNoLoyalty: 0.70,
      executarLoyalty: 0.00,
      potencializar: 0.00,
    },
    medium: {
      saber: 0.05,
      ter: 0.40,
      executarNoLoyalty: 0.55,
      executarLoyalty: 0.00,
      potencializar: 0.00,
    },
    smallTiny: {
      saber: 0.20,
      ter: 0.80,
      executarNoLoyalty: 0.00,
      executarLoyalty: 0.00,
      potencializar: 0.00,
    },
  },
  capacityPlan: {
    saberSquad: {
      headcount: 9,
      capacityUC: 25,
      tierWeights: {
        enterprise: 3.0,
        large: 2.5,
        medium: 2.0,
        small: 1.5,
        tiny: 1.0,
      },
    },
    executarSquad: {
      headcount: 15,
      clientsPerSquad: 20, // Mantido para compatibilidade
      capacityUC: 20,      // UC por squad Executar
      tierWeights: {
        enterprise: 2.5,
        large: 2.0,
        medium: 1.5,
        small: 1.0,
        tiny: 0.5,
      },
    },
  },
};

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const TIER_LABELS: Record<Tier, string> = {
  enterprise: 'Enterprise',
  large: 'Large',
  medium: 'Medium',
  small: 'Small',
  tiny: 'Tiny',
};

export const PRODUCT_LABELS: Record<string, string> = {
  saber: 'Saber',
  ter: 'Ter',
  executarNoLoyalty: 'Executar (No Loyalty)',
  executarLoyalty: 'Executar (Loyalty)',
  potencializar: 'Potencializar',
};
