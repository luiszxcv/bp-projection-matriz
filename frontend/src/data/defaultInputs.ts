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
    productTickets: {
      saber: fill12(50000),
      ter: fill12(31600),
      // Enterprise Executar No Loyalty (ticket MENSAL): Q1=15k, Q2=20k, Q3=30k, Q4=35k
      executarNoLoyalty: [15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000, 35000, 35000, 35000],
      // Enterprise Executar Loyalty (ticket MENSAL): Q1=15k, Q2=20k, Q3=30k, Q4=35k
      executarLoyalty: [15000, 15000, 15000, 20000, 20000, 20000, 30000, 30000, 30000, 35000, 35000, 35000],
      potencializar: fill12(0),
    },
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
    noLoyaltyMaxRenewals: 4,
    expansionRate: 0.04,
  },
  legacyBase: {
    // Ajuste para que a Receita Base Legada mensal totalize aproximadamente R$ 2.100.000
    enterprise: { revenue: 333122.86, clients: 13 },
    large: { revenue: 356152.88, clients: 23 },
    medium: { revenue: 864394.52, clients: 99 },
    small: { revenue: 332742.16, clients: 53 },
    tiny: { revenue: 213587.58, clients: 43 },
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
    initialHCSaber: 3,      // HC inicial Saber: 3 pessoas já existentes
    initialHCExecutar: 160, // HC inicial Executar: 160 pessoas já existentes (15 squads)
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
    farmerProductivity: 100,              // 100 clientes/farmer
    farmerSalary: 7000,                   // R$ 7.000/mês
    
    // Despesas Fixas Mensais
    folhaGestaoComercial: 32500,          // R$ 32.500/mês
    bonusCampanhasActivation: 8000,       // R$ 8.000/mês
    estruturaSuporte: [3500, 3500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500], // Variável por mês
    despesasVisitasActivation: 5000,      // R$ 5.000/mês
    bonusCampanhasExpansion: 1500,        // R$ 1.500/mês
    comissaoOperacao: 8000,               // R$ 8.000/mês
    despesasVisitasExpansion: 2000,       // R$ 2.000/mês
  },
  dreConfig: {
    // Percentuais de dedução sobre Revenue
    inadimplenciaRate: 0.04,              // 4%
    churnM0FalconsRate: 0.00,             // 0% (quebra aplicada no funil)
    churnRecebimentoOPSRate: 0.02,        // 2%
    
    // Tributos sobre Receita Bruta Recebida
    royaltiesRate: 0.15,                  // 15%
    issRate: 0.02,                        // 2%
    irrfRate: 0.015,                      // 1.5%
    pisRate: 0.0165,                      // 1.65%
    cofinsRate: 0.0365,                   // 3.65%
    
    // CSP (Custo de Serviço Prestado) - Modelo baseado em Squad e Capacidade
    // SQUAD EXECUTAR (9 pessoas, atende 20 clientes)
    // Observação: valores ajustados com rampa trimestral crescente.
    // Rampa: Q1=80% (início), Q2≈86.67%, Q3≈93.33%, Q4=100% (meta Dez/2025).
    // Esses são valores padrão editáveis — as fórmulas não foram alteradas.
    cspExecutarSquadMensal: 73000,        // R$ 73.000/squad/mês
    cspExecutarCapacidadeClientes: 20,    // 20 clientes/squad
    // Rampa: Q1=11200, Q2=12100, Q3=13100, Q4=14000 (meta)
    cspExecutarCoordenador: [11200, 11200, 11200, 12100, 12100, 12100, 13100, 13100, 13100, 14000, 14000, 14000],
    // Rampa: Q1=5200, Q2=5600, Q3=6100, Q4=6500 (meta)
    cspExecutarAccountSr: [5200, 5200, 5200, 5600, 5600, 5600, 6100, 6100, 6100, 6500, 6500, 6500],
    cspExecutarGestorTrafegoSr: [5200, 5200, 5200, 5600, 5600, 5600, 6100, 6100, 6100, 6500, 6500, 6500],
    cspExecutarGestorTrafegoPl: [5200, 5200, 5200, 5600, 5600, 5600, 6100, 6100, 6100, 6500, 6500, 6500],
    // Rampa: Q1=4000, Q2=4300, Q3=4700, Q4=5000 (meta)
    cspExecutarCopywriter: [4000, 4000, 4000, 4300, 4300, 4300, 4700, 4700, 4700, 5000, 5000, 5000],
    // Rampa: Q1=4800, Q2=5200, Q3=5600, Q4=6000 (meta)
    cspExecutarDesignerSr: [4800, 4800, 4800, 5200, 5200, 5200, 5600, 5600, 5600, 6000, 6000, 6000],
    // Rampa: Q1=3600, Q2=3900, Q3=4200, Q4=4500 (meta)
    cspExecutarDesignerPl: [3600, 3600, 3600, 3900, 3900, 3900, 4200, 4200, 4200, 4500, 4500, 4500],
    // Rampa: Q1=4000, Q2=4300, Q3=4700, Q4=5000 (meta)
    cspExecutarSocialMedia: [4000, 4000, 4000, 4300, 4300, 4300, 4700, 4700, 4700, 5000, 5000, 5000],
    
    // SQUAD SABER (9 pessoas, atende 15 clientes)
    // Observação: valores ajustados com rampa trimestral crescente.
    // Rampa: Q1=80% (início), Q2≈86.67%, Q3≈93.33%, Q4=100% (meta Dez/2025).
    // Esses são valores padrão editáveis — as fórmulas não foram alteradas.
    cspSaberSquadMensal: 80238,           // R$ 80.238/squad/mês
    cspSaberCapacidadeClientes: 15,       // 15 clientes/squad
    // Rampa: Q1=16000, Q2=17300, Q3=18700, Q4=20000 (meta)
    cspSaberCoordenador: [16000, 16000, 16000, 17300, 17300, 17300, 18700, 18700, 18700, 20000, 20000, 20000],
    // Rampa: Q1=10000, Q2=10800, Q3=11700, Q4=12500 (meta)
    cspSaberAccountSr: [10000, 10000, 10000, 10800, 10800, 10800, 11700, 11700, 11700, 12500, 12500, 12500],
    // Rampa: Q1=4000, Q2=4300, Q3=4700, Q4=5000 (meta)
    cspSaberAccountJr: [4000, 4000, 4000, 4300, 4300, 4300, 4700, 4700, 4700, 5000, 5000, 5000],
    // Rampa: Q1=8000, Q2=8700, Q3=9300, Q4=10000 (meta)
    cspSaberGestorTrafegoPl: [8000, 8000, 8000, 8700, 8700, 8700, 9300, 9300, 9300, 10000, 10000, 10000],
    // Rampa: Q1=6400, Q2=6900, Q3=7500, Q4=8000 (meta)
    cspSaberCopywriter: [6400, 6400, 6400, 6900, 6900, 6900, 7500, 7500, 7500, 8000, 8000, 8000],
    cspSaberDesignerSr: [6400, 6400, 6400, 6900, 6900, 6900, 7500, 7500, 7500, 8000, 8000, 8000],
    // Rampa: Q1=2200, Q2=2400, Q3=2600, Q4=2738 (meta arredondado)
    cspSaberTech: [2200, 2200, 2200, 2400, 2400, 2400, 2600, 2600, 2600, 2738, 2738, 2738],
    // Rampa: Q1=6400, Q2=6900, Q3=7500, Q4=8000 (meta)
    cspSaberAccountPl: [6400, 6400, 6400, 6900, 6900, 6900, 7500, 7500, 7500, 8000, 8000, 8000],
    // Rampa: Q1=4800, Q2=5200, Q3=5600, Q4=6000 (meta)
    cspSaberSalesEnablement: [4800, 4800, 4800, 5200, 5200, 5200, 5600, 5600, 5600, 6000, 6000, 6000],
    
    // Outros CSP
    cspCssWebProducts: 23000,             // Fixo em R$ 23k/mês
    // Rampa: Q1=60k, Q2=70k, Q3=80k, Q4=90k
    cspGerentes: [60000, 60000, 60000, 70000, 70000, 70000, 80000, 80000, 80000, 90000, 90000, 90000],
    
    // TER usa estrutura similar ao Saber
    cspTerUsaSaberSquad: true,            // Ter usa a mesma estrutura de squad Saber
    
    // Despesas Marketing e Vendas
    folhaGestaoComercial: 32500,          // R$ 32.500/mês
    comissaoMediaPorCliente: 2500,        // R$ 2.500/cliente (média ponderada)
    salarioCloser: 9000,                  // R$ 9.000/closer
    salarioSDR: 4500,                     // R$ 4.500/SDR
    despesasVisitas: 2000,                // R$ 2.000/mês
    
    // Despesas Administrativas (valores fixos mensais)
    despesasTimeAdm: 174400,              // R$ 174.400
    despesasCustosAdm: 9905,              // R$ 9.905
    despesasTech: 36200,                  // R$ 36.200
    despesasUtilities: 123350,            // R$ 123.350
    despesasPessoasInicial: 73500,        // R$ 73.500 (mês 1)
    despesasPessoasIncremento: 1750,      // R$ 1.750/mês (incremento mensal)
    viagensAdmin: 10000,                  // R$ 10.000
    despesasSoftwares: 21672.26,          // R$ 21.672,26
    despesasServicosTerceirizados: 25246.50, // R$ 25.246,50
    
    // Financeiro
    despesasFinanceirasRate: 0.019,       // 1.9% sobre Receita Bruta Recebida
    irpjRate: 0.15,                       // 15% sobre EBIT
    csllRate: 0.09,                       // 9% sobre EBIT
    
    // Fluxo de Caixa
    depreciacao: 8740.71,                 // R$ 8.740,71/mês
    compraAtivoIntangivel: 4985.21,       // R$ 4.985,21/mês
    pagamentoFinanciamento: 11388.93,     // R$ 11.388,93/mês
    distribuicaoDividendos: 150000,       // R$ 150.000/mês
    caixaInicial: 1500000,                // R$ 1.500.000 (capital inicial)
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
