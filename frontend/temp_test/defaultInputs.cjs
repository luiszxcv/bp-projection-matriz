// CommonJS copy of defaultInputs for quick runner
const fill12 = (val) => Array(12).fill(val);
const fillProductMonthly = (vals) => ({
  saber: fill12(vals.saber),
  ter: fill12(vals.ter),
  executarNoLoyalty: fill12(vals.executarNoLoyalty),
  executarLoyalty: fill12(vals.executarLoyalty),
  potencializar: fill12(vals.potencializar),
});

const defaultTierMetrics = {
  enterprise: {
    mqlDistribution: fill12(0.046),
    mqlToSqlRate: fill12(0.2),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.3),
    activationRate: fill12(0.88),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.6,
      ter: 0.1,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.2,
      potencializar: 0.1,
    }),
    productTickets: {
      saber: [
        30000, 30000, 30000, 50000, 50000, 50000, 100000, 100000, 100000,
        150000, 150000, 150000,
      ],
      ter: fill12(31600),
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(145000),
      potencializar: fill12(0),
    },
  },
  large: {
    mqlDistribution: fill12(0.0511),
    mqlToSqlRate: fill12(0.25),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.3),
    activationRate: fill12(0.84),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.6,
      ter: 0.1,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.2,
      potencializar: 0.1,
    }),
    productTickets: {
      saber: [
        25000, 25000, 25000, 40000, 40000, 40000, 80000, 80000, 80000, 120000,
        120000, 120000,
      ],
      ter: fill12(18000),
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(99000),
      potencializar: fill12(0),
    },
  },
  medium: {
    mqlDistribution: fill12(0.2023),
    mqlToSqlRate: fill12(0.3),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.3),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.6,
      ter: 0.1,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.3,
      potencializar: 0.0,
    }),
    productTickets: {
      saber: [
        20000, 20000, 20000, 40000, 40000, 40000, 80000, 80000, 80000, 100000,
        100000, 100000,
      ],
      ter: fill12(15000),
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(49000),
      potencializar: fill12(0),
    },
  },
  small: {
    mqlDistribution: fill12(0.476),
    mqlToSqlRate: fill12(0.3),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.3),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.8,
      ter: 0.2,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.0,
      potencializar: 0.0,
    }),
    productTickets: {
      saber: [
        20000, 20000, 20000, 30000, 30000, 30000, 40000, 40000, 40000, 50000,
        50000, 50000,
      ],
      ter: fill12(11500),
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(0),
      potencializar: fill12(0),
    },
  },
  tiny: {
    mqlDistribution: fill12(0.2246),
    mqlToSqlRate: fill12(0.3),
    sqlToSalRate: fill12(0.86),
    salToWonRate: fill12(0.3),
    activationRate: fill12(0.93),
    revenueActivationRate: fill12(0.93),
    productDistribution: fillProductMonthly({
      saber: 0.8,
      ter: 0.2,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.0,
      potencializar: 0.0,
    }),
    productTickets: {
      saber: [
        15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000, 40000,
        40000, 40000,
      ],
      ter: fill12(7500),
      executarNoLoyalty: fill12(0),
      executarLoyalty: fill12(0),
      potencializar: fill12(0),
    },
  },
};

const defaultInputs = {
  name: "Nova Simulação",
  topline: {
    investmentMonthly: [
      4838976, 4838976, 5080925, 5589017, 6147919, 6455315, 6778081, 6778081,
      6778081, 6100273, 5422464, 4744656,
    ],
    cplMonthly: [350, 359, 368, 386, 405, 426, 436, 436, 436, 445, 454, 463],
    leadToMqlRate: fill12(0.8),
  },
  tierMetrics: defaultTierMetrics,
  conversionRates: {
    saberConversionDays: 60,
    loyaltyDuration: 7,
    loyaltyRenewalRate: 0.2,
    loyaltyMaxRenewals: 2,
    noLoyaltyDuration: 2,
    noLoyaltyRenewalRate: 0.85,
    noLoyaltyMaxRenewals: 4,
  },
  legacyBase: {
    enterprise: { revenue: 333122.86, clients: 13 },
    large: { revenue: 356152.88, clients: 23 },
    medium: { revenue: 864394.52, clients: 99 },
    small: { revenue: 332742.16, clients: 53 },
    tiny: { revenue: 213587.58, clients: 43 },
    churnRate: fill12(0.07),
    expansionRate: fill12(0.04),
  },
  expansionDistribution: {
    largeEnterprise: {
      saber: 0.05,
      ter: 0.25,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.7,
      potencializar: 0.0,
    },
    medium: {
      saber: 0.05,
      ter: 0.4,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.55,
      potencializar: 0.0,
    },
    smallTiny: {
      saber: 0.2,
      ter: 0.8,
      executarNoLoyalty: 0.0,
      executarLoyalty: 0.0,
      potencializar: 0.0,
    },
  },
  capacityPlan: {
    initialHCSaber: 4,
    initialHCExecutar: 169,
    availabilityFactor: 0.95,
    saberSquad: { headcount: 9, productiveHoursPerPerson: 144, roleHours: {} },
    executarSquad: {
      headcount: 11,
      productiveHoursPerPerson: 144,
      roleHours: {},
    },
  },
  salesConfig: {
    comissaoActivationRate: 0.05,
    comissaoExpansionRate: 0.05,
    closerProductivity: 10,
    closerSalary: 5000,
    sdrProductivity: 80,
    sdrSalary: 3250,
    farmerProductivity: 150,
    farmerSalary: 7000,
    folhaGestaoComercial: 32500,
    bonusCampanhasActivation: 8000,
    estruturaSuporte: [
      3500, 3500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500,
    ],
    despesasVisitasActivation: 5000,
    bonusCampanhasExpansion: 1500,
    comissaoMonetizacaoOpsRate: 0.05,
    despesasVisitasExpansion: 2000,
    currentSDR: 1,
    currentClosers: 2,
  },
  wtpConfig: {
    enterprise: {
      annualWTP: 5000000,
      shareOfWalletDesired: [
        0.0, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 0.0, 0.3,
      ],
      productDistribution: {
        saber: 0.5,
        ter: 0.4,
        executarNoLoyalty: 0.05,
        executarLoyalty: 0.05,
        potencializar: 0.0,
      },
    },
    large: {
      annualWTP: 3000000,
      shareOfWalletDesired: [
        0.0, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 0.0, 0.3,
      ],
      productDistribution: {
        saber: 0.4,
        ter: 0.4,
        executarNoLoyalty: 0.1,
        executarLoyalty: 0.1,
        potencializar: 0.0,
      },
    },
    medium: {
      annualWTP: 500000,
      shareOfWalletDesired: [
        0.0, 0.32, 0.17, 0.15, 0.1, 0.1, 0.07, 0.05, 0.04, 0.0, 0.0, 0.0,
      ],
      productDistribution: {
        saber: 0.25,
        ter: 0.35,
        executarNoLoyalty: 0.2,
        executarLoyalty: 0.2,
        potencializar: 0.0,
      },
    },
    small: {
      annualWTP: 90000,
      shareOfWalletDesired: [
        0.0, 0.32, 0.17, 0.15, 0.1, 0.1, 0.07, 0.05, 0.04, 0.0, 0.0, 0.0,
      ],
      productDistribution: {
        saber: 0.6,
        ter: 0.4,
        executarNoLoyalty: 0.0,
        executarLoyalty: 0.0,
        potencializar: 0.0,
      },
    },
    tiny: {
      annualWTP: 50000,
      shareOfWalletDesired: [
        0.0, 0.32, 0.17, 0.15, 0.1, 0.1, 0.07, 0.05, 0.04, 0.0, 0.0, 0.0,
      ],
      productDistribution: {
        saber: 0.6,
        ter: 0.4,
        executarNoLoyalty: 0.0,
        executarLoyalty: 0.0,
        potencializar: 0.0,
      },
    },
  },
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

module.exports = { defaultInputs, MONTHS };
