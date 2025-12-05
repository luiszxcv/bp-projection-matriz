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
      ter: 31600,
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
    productTickets: fillProductMonthly({
      saber: 30000,
      ter: 18000,
      executarNoLoyalty: 22000,
      executarLoyalty: 99000,
      potencializar: 0,
    }),
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
    productTickets: fillProductMonthly({
      saber: 30000,
      ter: 15000,
      executarNoLoyalty: 14000,
      executarLoyalty: 49000,
      potencializar: 0,
    }),
  },
  small: {
    mqlDistribution: fill12(0.4760),
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
    productTickets: fillProductMonthly({
      saber: 30000,
      ter: 11500,
      executarNoLoyalty: 0,
      executarLoyalty: 0,
      potencializar: 0,
    }),
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
    productTickets: fillProductMonthly({
      saber: 30000,
      ter: 7500,
      executarNoLoyalty: 0,
      executarLoyalty: 0,
      potencializar: 0,
    }),
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
    loyaltyRenewalRate: 0.30,
    loyaltyMaxRenewals: 2,
    noLoyaltyDuration: 2,
    noLoyaltyRenewalRate: 0.80,
    noLoyaltyMaxRenewals: 5,
    expansionRate: 0.05,
  },
  legacyBase: {
    enterprise: { revenue: 329176.85, clients: 13 },
    large: { revenue: 351936, clients: 23 },
    medium: { revenue: 854159.25, clients: 98 },
    small: { revenue: 242719.38, clients: 40 },
    tiny: { revenue: 211102.04, clients: 42 },
    churnRate: 0.07,
    expansionRate: 0.05,
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
      clientsPerSquad: 20,
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
