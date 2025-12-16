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

export const defaultInputs: SimulationInputs = {
  name: 'Nova Simulação',
  topline: {
    // Budget mensal de mídia (valores do BP 2026)
    investmentMonthly: [
      4838976,   // Jan
      4838976,   // Fev
      5080925,   // Mar
      5589017,   // Abr
      6147919,   // Mai
      6455315,   // Jun
      6778081,   // Jul
      6778081,   // Ago
      6778081,   // Set
      6100273,   // Out
      5422464,   // Nov
      4744656,   // Dez
    ],
    // CPL mensal (valores crescentes ao longo do ano)
    cplMonthly: [350, 359, 368, 386, 405, 426, 436, 436, 436, 445, 454, 463],
    // Taxa Lead → MQL (nova etapa do funnel)
    leadToMqlRate: fill12(0.80),

  },
  tierMetrics: defaultTierMetrics,
  conversionRates: {
    saberConversionDays: 60,
    loyaltyDuration: {
      enterprise: 10,
      large: 10,
      medium: 7,
      small: 7,
      tiny: 7,
    },
    loyaltyRenewalRate: 0.20,
    loyaltyMaxRenewals: 2,
    noLoyaltyDuration: 2,
    noLoyaltyRenewalRate: 0.85,
    noLoyaltyMaxRenewals: 4,
  },
  legacyBase: {
    // Ajuste para que a Receita Base Legada mensal totalize aproximadamente R$ 2.100.000
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
      executarNoLoyalty: 0.00,
      executarLoyalty: 0.70,
      potencializar: 0.00,
    },
    medium: {
      saber: 0.05,
      ter: 0.40,
      executarNoLoyalty: 0.00,
      executarLoyalty: 0.55,
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
    initialHCSaber: 4,      // HC inicial Saber: 4 pessoas já existentes
    initialHCExecutar: 169, // HC inicial Executar: 169 pessoas já existentes (aprox. realidade)
    // Fator de disponibilidade usado para converter horas produtivas em capacidade efetiva
    availabilityFactor: 0.95,
    saberSquad: {
      headcount: 9,
      productiveHoursPerPerson: 144, // Horas produtivas por pessoa por mês
      roleHours: {
        // Baseado na tabela "Lógica de horas squad saber" do capacity-plan-hours.md
        // Totais por cliente: Tiny≈40h, Small≈64h, Medium≈103h, Large≈126h, Enterprise≈150h (estimado)
        'Coordenador': {
          tiny: 4,      // Proporcional: ~62% de Small
          small: 7,     // 5h rotina + 2h execução
          medium: 16,   // 10h rotina + 6h execução
          large: 25,    // 10h rotina + 15h execução
          enterprise: 30, // Escalado proporcionalmente
        },
        'Account Jr.': {
          tiny: 9,      // Proporcional: ~60% de Small
          small: 15,    // 10h rotina + 5h execução
          medium: 15,   // 10h rotina + 5h execução
          large: 0,     // Não atende Large/Enterprise
          enterprise: 0,
        },
        'Gestor de Tráfego Pl': {
          tiny: 7,      // Proporcional
          small: 12,    // 6h rotina + 6h execução
          medium: 14,   // 6h rotina + 8h execução
          large: 20,    // 10h rotina + 10h execução
          enterprise: 24,
        },
        'Copywriter Sr.': {
          tiny: 8,      // Proporcional
          small: 14,    // 6h rotina + 8h execução
          medium: 16,   // 6h rotina + 10h execução
          large: 25,    // 10h rotina + 15h execução
          enterprise: 30,
        },
        'Designer Jr.': {
          tiny: 10,     // Proporcional
          small: 16,    // 6h rotina + 10h execução
          medium: 16,   // 6h rotina + 10h execução
          large: 0,     // Não atende Large/Enterprise
          enterprise: 0,
        },
        'Tech Pl.': {
          tiny: 0,      // Não atende Tiny
          small: 0,
          medium: 10,   // 4h rotina + 6h execução
          large: 16,    // 6h rotina + 10h execução
          enterprise: 20,
        },
        'Sales Enablement Jr.': {
          tiny: 0,      // Não atende Tiny/Small
          small: 0,
          medium: 16,   // 6h rotina + 10h execução
          large: 20,    // 10h rotina + 10h execução
          enterprise: 24,
        },
        'Account Pl.': {
          tiny: 2,      // Adicional para todos os tiers
          small: 0,
          medium: 0,
          large: 20,    // Suporte para Large/Enterprise
          enterprise: 22,
        },
      },
    },
    executarSquad: {
      headcount: 11, // Realidade: 10,6 pessoas/squad (160 pessoas ÷ 15 squads)
      productiveHoursPerPerson: 144, // Horas mensais por pessoa (mesma base do Saber)
      roleHours: {
        // Horas ajustadas para bater realidade: 160 pessoas tocando R$ 2,1M (R$ 13k/pessoa)
        // Total por cliente (ajustado para reduzir squads de 16 → 15):
        'Coordenador': {
          tiny: 8,
          small: 8,
          medium: 10,
          large: 12,
          enterprise: 15,
        },
        'Account': {
          tiny: 14,
          small: 18,
          medium: 21,
          large: 25,
          enterprise: 30,
        },
        'Gestor de Tráfego': {
          tiny: 17,
          small: 21,
          medium: 24,
          large: 28,
          enterprise: 35,
        },
        'Copywriter': {
          tiny: 14,
          small: 18,
          medium: 21,
          large: 25,
          enterprise: 30,
        },
        'Designer': {
          tiny: 17,
          small: 21,
          medium: 23,
          large: 28,
          enterprise: 35,
        },
        'Social': {
          tiny: 4,
          small: 4,
          medium: 6,
          large: 7,
          enterprise: 8,
        },
      },
    },
  },
  salesConfig: {
    // Comissões (%)
    comissaoActivationRate: 0.05,         // 5%
    comissaoExpansionRate: 0.05,          // 5%

    // Remuneração Closers
    closerProductivity: 10,               // 10 WONs/mês/closer
    closerSalary: 5000,                   // R$ 5.000/mês

    // Remuneração SDRs
    sdrProductivity: 80,                  // 80 SQLs/mês/SDR
    sdrSalary: 3250,                      // R$ 3.250/mês

    // Remuneração Farmers
    farmerProductivity: 150,              // 150 clientes/farmer
    farmerSalary: 7000,                   // R$ 7.000/mês

    // Despesas Fixas Mensais
    folhaGestaoComercial: 32500,          // R$ 32.500/mês
    bonusCampanhasActivation: 8000,       // R$ 8.000/mês
    estruturaSuporte: [3500, 3500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500], // Variável por mês
    despesasVisitasActivation: 5000,      // R$ 5.000/mês
    bonusCampanhasExpansion: 1500,        // R$ 1.500/mês
    // Comissão Monetização Ops: percentual sobre expansão (inicial igual a comissaoExpansionRate)
    comissaoMonetizacaoOpsRate: 0.05,
    despesasVisitasExpansion: 2000,       // R$ 2.000/mês
    currentSDR: 1,
    currentClosers: 2,
    outboundSalRate: 0.074,
  },
  // WTP (Willingness to Pay) Configuration - Expansion Line Model
  // IMPORTANTE: Janeiro (índice 0) deve ser 0% para todos os tiers
  // A expansão só começa a partir de Fevereiro
  wtpConfig: {
    enterprise: {
      annualWTP: 5000000,  // R$ 5.000.000 - WTP anual para Enterprise
      // Agenda por idade da safra (go-live incluso): 2%,0%,0%,10%,0%,0%,30%,0%,0%,30%,0%,0%,30%
      shareOfWalletDesired: [0.02, 0, 0, 0.10, 0, 0, 0.30, 0, 0, 0.30, 0, 0, 0.30],
      expansionTickets: {
        saber: 70000,
        ter: 10000,
        executarNoLoyalty: 10000,
        executarLoyalty: 100000,
        potencializar: 0,
      },
      productDistribution: {
        saber: 0.50,
        ter: 0.40,
        executarNoLoyalty: 0.05,
        executarLoyalty: 0.05,
        potencializar: 0.00,
      },
    },
    large: {
      annualWTP: 3000000,  // R$ 3.000.000 - WTP anual para Large
      // 4%,0%,0%,10%,0%,0%,30%,0%,0%,30%,0%,0%,30%
      shareOfWalletDesired: [0.04, 0, 0, 0.10, 0, 0, 0.30, 0, 0, 0.30, 0, 0, 0.30],
      expansionTickets: {
        saber: 25000,
        ter: 10000,
        executarNoLoyalty: 8000,
        executarLoyalty: 72000,
        potencializar: 0,
      },
      productDistribution: {
        saber: 0.40,
        ter: 0.40,
        executarNoLoyalty: 0.10,
        executarLoyalty: 0.10,
        potencializar: 0.00,
      },
    },
    medium: {
      annualWTP: 1000000,       // WTP anual padrão (Fev+)
      annualWTPJan: 500000,     // WTP anual para safra que nasce em Jan
      // Safras nascidas a partir de fev/mar: 6%,0%,32%,17%,15%,10%,10%,7%,5%,4%,0%,0%
      shareOfWalletDesired: [0.06, 0, 0.32, 0.17, 0.15, 0.10, 0.10, 0.07, 0.05, 0.04, 0, 0],
      // Agenda específica para safra nascida em janeiro (idade 0 em jan): 11%,0%,32%,17%,15%,10%,10%,7%,5%,4%,0%,0%,0%
      shareOfWalletDesiredJan: [0.11, 0, 0.32, 0.17, 0.15, 0.10, 0.10, 0.07, 0.05, 0.04, 0, 0, 0],
      expansionTickets: {
        saber: 20000,
        ter: 10000,
        executarNoLoyalty: 6000,
        executarLoyalty: 42000,
        potencializar: 0,
      },
      productDistribution: {
        saber: 0.25,
        ter: 0.35,
        executarNoLoyalty: 0.20,
        executarLoyalty: 0.20,
        potencializar: 0.00,
      },
    },
    small: {
      annualWTP: 90000,  // R$ 90.000 - WTP anual para Small
      // 30%,0%,32%,17%,15%,10%,10%,7%,5%,4%,0%,0%,0%
      shareOfWalletDesired: [0.30, 0, 0.32, 0.17, 0.15, 0.10, 0.10, 0.07, 0.05, 0.04, 0, 0, 0],
      expansionTickets: {
        saber: 8000,
        ter: 10000,
        executarNoLoyalty: 0,
        executarLoyalty: 0,
        potencializar: 0,
      },
      productDistribution: {
        saber: 0.60,
        ter: 0.40,
        executarNoLoyalty: 0.00,
        executarLoyalty: 0.00,
        potencializar: 0.00,
      },
    },
    tiny: {
      annualWTP: 50000,  // R$ 50.000 - WTP anual para Tiny
      // 40%,0%,32%,17%,15%,10%,10%,7%,5%,4%,0%,0%
      shareOfWalletDesired: [0.40, 0, 0.32, 0.17, 0.15, 0.10, 0.10, 0.07, 0.05, 0.04, 0, 0],
      expansionTickets: {
        saber: 8000,
        ter: 6000,
        executarNoLoyalty: 0,
        executarLoyalty: 0,
        potencializar: 0,
      },
      productDistribution: {
        saber: 0.60,
        ter: 0.40,
        executarNoLoyalty: 0.00,
        executarLoyalty: 0.00,
        potencializar: 0.00,
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
