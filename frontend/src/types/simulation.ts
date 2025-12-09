export type Tier = 'enterprise' | 'large' | 'medium' | 'small' | 'tiny';
export type Product = 'saber' | 'ter' | 'executarNoLoyalty' | 'executarLoyalty' | 'potencializar';

export interface TierDistribution {
  enterprise: number;
  large: number;
  medium: number;
  small: number;
  tiny: number;
}

/** Product distribution: each field is a number (used in MonthlyData outputs) */
export interface ProductDistribution {
  saber: number;
  ter: number;
  executarNoLoyalty: number;
  executarLoyalty: number;
  potencializar: number;
}

/** Monthly arrays for product values: [month0..month11] */
export interface ProductMonthlyArrays {
  saber: number[];
  ter: number[];
  executarNoLoyalty: number[];
  executarLoyalty: number[];
  potencializar: number[];
}

/** Tier metrics - all fields are arrays of 12 (one per month) */
export interface TierMetrics {
  mqlDistribution: number[];        // 12 values - % de MQLs distribuídos para este tier
  mqlToSqlRate: number[];           // 12 values
  sqlToSalRate: number[];           // 12 values
  salToWonRate: number[];           // 12 values
  activationRate: number[];         // 12 values
  revenueActivationRate: number[];  // 12 values
  productDistribution: ProductMonthlyArrays;  // each product has 12 values
  productTickets: ProductMonthlyArrays;       // each product has 12 values
}

/** Topline inputs - monthly arrays only, no global duplicates */
export interface ToplineInputs {
  investmentMonthly: number[];  // 12 values
  cplMonthly: number[];         // 12 values
}

export interface ConversionRates {
  saberToExecutar: number;
  executarLoyaltyRatio: number;
  saberConversionDays: number;
  loyaltyDuration: number;
  loyaltyRenewalRate: number;
  loyaltyMaxRenewals: number;
  noLoyaltyDuration: number;
  noLoyaltyRenewalRate: number;
  noLoyaltyMaxRenewals: number;
  expansionRate: number;
}

export interface LegacyBase {
  enterprise: { revenue: number; clients: number };
  large: { revenue: number; clients: number };
  medium: { revenue: number; clients: number };
  small: { revenue: number; clients: number };
  tiny: { revenue: number; clients: number };
  churnRate: number;
  expansionRate: number;
}

export interface ExpansionDistribution {
  largeEnterprise: ProductDistribution;
  medium: ProductDistribution;
  smallTiny: ProductDistribution;
}

// Role-based hours per tier for capacity planning
export interface RoleHoursByTier {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  enterprise: number;
}

export interface SquadRoleHours {
  [roleName: string]: RoleHoursByTier;
}

// Sales Metrics (calculated dynamically)
export interface SalesMetrics {
  // Quantities
  closersRequired: number;
  sdrsRequired: number;
  farmersRequired: number;
  
  // Remuneração
  remuneracaoCloser: number;
  remuneracaoSDR: number;
  remuneracaoFarmer: number;
  
  // Comissões
  comissaoVendasActivation: number;
  comissaoFarmerExpansion: number;
  
  // Despesas Fixas
  folhaGestaoComercial: number;
  bonusCampanhasActivation: number;
  estruturaSuporte: number;
  despesasVisitasActivation: number;
  bonusCampanhasExpansion: number;
  comissaoOperacao: number;
  despesasVisitasExpansion: number;
  
  // Totals
  despesaComercialActivation: number;
  despesaComercialExpansion: number;
  totalDespesasMarketingVendas: number;
}

// Capacity Plan Types
export interface CapacityPlanConfig {
  initialHCSaber: number;               // HC inicial Saber (pessoas já existentes)
  initialHCExecutar: number;            // HC inicial Executar (pessoas já existentes)
  saberSquad: {
    headcount: number;                    // Pessoas por squad Saber
    productiveHoursPerPerson: number;     // Horas produtivas por pessoa por mês (ex: 144h)
    roleHours: SquadRoleHours;            // Horas alocadas por cargo por tier
  };
  executarSquad: {
    headcount: number;                    // Pessoas por squad Executar
    productiveHoursPerPerson: number;     // Horas produtivas por pessoa por mês
    roleHours: SquadRoleHours;            // Horas alocadas por cargo por tier
  };
}

export interface CapacityPlanData {
  // Clientes Saber por tier (apenas novos do mês, projeto pontual - SEM TER)
  clientsSaberByTier: TierDistribution;
  // Total clientes Saber
  totalClientsSaber: number;
  // Clientes Executar por tier (inclui base legada + Executar Loyalty/NoLoyalty + TER)
  clientsExecutarByTier: TierDistribution;
  // Total clientes Executar (inclui Ter)
  totalClientsExecutar: number;
  // Horas totais necessárias para Saber
  totalHoursSaber: number;
  // Horas totais necessárias para Executar
  totalHoursExecutar: number;
  // Squads necessárias
  squadsSaber: number;
  squadsExecutar: number;
  totalSquads: number;
  // Headcount necessário
  hcSaber: number;
  hcExecutar: number;
  totalHC: number;
  // Turnover e contratações
  turnoverRate: number; // Taxa de turnover (default 7%)
  turnoverSaber: number; // Pessoas que saem no mês (Saber)
  turnoverExecutar: number; // Pessoas que saem no mês (Executar)
  totalTurnover: number; // Total de pessoas que saem
  hiresSaber: number; // Contratações necessárias (Saber)
  hiresExecutar: number; // Contratações necessárias (Executar)
  totalHires: number; // Total de contratações
  // Realocação interna (gap) - pessoas liberadas em Executar que podem ser realocadas para Saber
  redeployableFromExecutar: number;
  // Contratações Saber considerando realocação de Executar
  hiresSaberWithRedeployment: number;
  // Total de contratações considerando realocação interna
  totalHiresWithRedeployment: number;
  // Métricas
  revenuePerHC: number;
  hoursUtilizationSaber: number; // % de utilização da capacidade Saber (horas)
  hoursUtilizationExecutar: number; // % de utilização da capacidade Executar (horas)
  // Sales guidance (separate from total HC) - não contam em `totalHC`
  salesSDRRequired?: number;
  salesClosersRequired?: number;
  salesCurrentSDR?: number;
  salesCurrentClosers?: number;
  salesHires?: number; // Contratações sugeridas para time de vendas
}

// Tracking de receita futura para visão DFC
export interface PendingRevenueTracking {
  tier: Tier;
  product: 'executarLoyalty' | 'executarNoLoyalty';
  source: 'acquisition' | 'conversion';           // Aquisição direta ou conversão Saber
  monthlyAmount: number;                          // Valor mensal a receber
  startMonth: number;                             // Mês inicial
  remainingMonths: number;                        // Meses restantes
  totalAmount: number;                            // Valor total
}

// DRE Configuration
export interface DREConfig {
  // Controle de visualização
  usarLinhasGerenciais: boolean;    // Default: true - Se false, oculta e remove do cálculo as linhas gerenciais
  
  // Percentuais de dedução sobre Revenue
  inadimplenciaRate: number;        // Default: 4%
  churnM0FalconsRate: number;       // Default: 3%
  churnRecebimentoOPSRate: number;  // Default: 2%
  
  // Tributos sobre Receita Bruta Recebida
  royaltiesRate: number;            // Default: 15%
  issRate: number;                  // Default: 2%
  irrfRate: number;                 // Default: 1.5%
  pisRate: number;                  // Default: 1.65%
  cofinsRate: number;               // Default: 3.65%
  
  // CSP (Custo de Serviço Prestado) - Modelo baseado em Squad e Capacidade
  // SQUAD EXECUTAR (9 pessoas, atende 20 clientes)
  cspExecutarSquadMensal: number;        // Default: R$ 73.000/squad/mês
  cspExecutarCapacidadeClientes: number; // Default: 20 clientes/squad
  cspExecutarCoordenador: number | number[];        // Default: R$ 14.000 ou array[12]
  cspExecutarAccountSr: number | number[];          // Default: R$ 6.500 (2x) ou array[12]
  cspExecutarGestorTrafegoSr: number | number[];    // Default: R$ 6.500 ou array[12]
  cspExecutarGestorTrafegoPl: number | number[];    // Default: R$ 6.500 ou array[12]
  cspExecutarCopywriter: number | number[];         // Default: R$ 5.000 ou array[12]
  cspExecutarDesignerSr: number | number[];         // Default: R$ 6.000 ou array[12]
  cspExecutarDesignerPl: number | number[];         // Default: R$ 4.500 ou array[12]
  cspExecutarSocialMedia: number | number[];        // Default: R$ 5.000 ou array[12]
  
  // SQUAD SABER (9 pessoas, atende 15 clientes)
  cspSaberSquadMensal: number;           // Default: R$ 80.238/squad/mês
  cspSaberCapacidadeClientes: number;    // Default: 15 clientes/squad
  cspSaberCoordenador: number | number[];           // Default: R$ 20.000 ou array[12]
  cspSaberAccountSr: number | number[];             // Default: R$ 12.500 ou array[12]
  cspSaberAccountJr: number | number[];             // Default: R$ 5.000 ou array[12]
  cspSaberGestorTrafegoPl: number | number[];       // Default: R$ 10.000 ou array[12]
  cspSaberCopywriter: number | number[];            // Default: R$ 8.000 ou array[12]
  cspSaberDesignerSr: number | number[];            // Default: R$ 8.000 ou array[12]
  cspSaberTech: number | number[];                  // Default: R$ 2.738 (part-time) ou array[12]
  cspSaberAccountPl: number | number[];             // Default: R$ 8.000 ou array[12]
  cspSaberSalesEnablement: number | number[];       // Default: R$ 6.000 ou array[12]
  
  // Outros CSP
  cspCssWebProducts: number | number[];             // Default: R$ 23.000 fixo
  cspGerentes: number | number[];                   // Default: R$ 60k-90k com rampa trimestral
  
  // TER usa estrutura similar ao Saber (mesma squad)
  cspTerUsaSaberSquad: boolean;          // Default: true
  
  // Despesas Marketing e Vendas
  folhaGestaoComercial: number;     // Default: R$ 32.500/mês
  comissaoMediaPorCliente: number; // Default: R$ 2.500/cliente
  salarioCloser: number;             // Default: R$ 9.000
  salarioSDR: number;                // Default: R$ 4.500
  despesasVisitas: number;           // Default: R$ 2.000/mês
  // Contagem atual da equipe de vendas (para cálculo de necessidade de contratações)
  currentSDR?: number;               // Ex: 1
  currentClosers?: number;           // Ex: 2
  
  // Despesas Administrativas (valores fixos mensais)
  despesasTimeAdm: number;          // Default: R$ 174.400
  despesasCustosAdm: number;        // Default: R$ 9.905
  despesasTech: number;              // Default: R$ 36.200
  despesasUtilities: number;         // Default: R$ 123.350
  despesasPessoasInicial: number;    // Default: R$ 73.500 (mês 1)
  despesasPessoasIncremento: number; // Default: R$ 1.750/mês
  viagensAdmin: number;              // Default: R$ 10.000
  despesasSoftwares: number;         // Default: R$ 21.672,26
  despesasServicosTerceirizados: number; // Default: R$ 25.246,50
  
  // Financeiro
  despesasFinanceirasRate: number;  // Default: 1.9% sobre Receita Bruta Recebida
  irpjRate: number;                  // Default: 15% sobre EBIT
  csllRate: number;                  // Default: 9% sobre EBIT
  
  // Fluxo de Caixa
  depreciacao: number;               // Default: R$ 8.740,71/mês
  compraAtivoIntangivel: number;     // Default: R$ 4.985,21/mês
  pagamentoFinanciamento: number;    // Default: R$ 11.388,93/mês
  distribuicaoDividendos: number;    // Default: R$ 150.000/mês
  caixaInicial: number;              // Default: R$ 1.500.000
}

// Sales & Marketing Configuration
export interface SalesConfig {
  // Comissões (%)
  comissaoActivationRate: number;      // Default: 5% (0.05)
  comissaoExpansionRate: number;       // Default: 6% (0.06)
  
  // Remuneração Closers
  closerProductivity: number;          // Default: 10 WONs/mês/closer
  closerSalary: number;                // Default: R$ 13.500/mês
  
  // Remuneração SDRs
  sdrProductivity: number;             // Default: 80 SQLs/mês/SDR
  sdrSalary: number;                   // Default: R$ 3.250/mês
  
  // Remuneração Farmers
  farmerProductivity: number;          // Default: 100 clientes/farmer
  farmerSalary: number;                // Default: R$ 7.000/mês
  
  // Despesas Fixas Mensais
  folhaGestaoComercial: number;        // Default: R$ 32.500/mês
  bonusCampanhasActivation: number;    // Default: R$ 8.000/mês
  estruturaSuporte: number[];          // Array de 12 meses (Default: [3500, 3500, ...])
  despesasVisitasActivation: number;   // Default: R$ 5.000/mês
  bonusCampanhasExpansion: number;     // Default: R$ 1.500/mês
  comissaoOperacao: number;            // Default: R$ 8.000/mês
  despesasVisitasExpansion: number;    // Default: R$ 2.000/mês
}

// DRE Data (resultado dos cálculos por mês)
export interface DREData {
  month: number;
  
  // RECEITA
  revenue: number;                        // Revenue total do BP
  activationRevenue: number;              // Activation (novos)
  renewalRevenue: number;                 // Renewals
  expansionRevenue: number;               // Expansions
  legacyRevenue: number;                  // Base legada
  
  // RECEITA DFC - Detalhamento por recebimento mensal
  activationRevenueDFC: number;                    // Receita DFC total do mês
  activationExecutarLoyaltyDFC: number;            // Executar Loyalty DFC (aquisição)
  activationExecutarNoLoyaltyDFC: number;          // Executar No-Loyalty DFC (aquisição)
  activationSaberConvLoyaltyDFC: number;           // Conversão Saber→Executar Loyalty DFC
  activationSaberConvNoLoyaltyDFC: number;         // Conversão Saber→Executar No-Loyalty DFC
  activationOutrosProdutos: number;                // Saber, Ter, Potencializar (sem mudança)
  
  // DEDUÇÕES
  inadimplencia: number;
  churnM0Falcons: number;
  churnRecebimentoOPS: number;
  performanceConversao: number;           // % (0-1)
  receitaBrutaRecebida: number;
  
  // TRIBUTOS
  royalties: number;
  iss: number;
  irrf: number;
  pis: number;
  cofins: number;
  totalImpostos: number;
  receitaLiquida: number;
  
  // CSP (Custo Serviço Prestado)
  cspExecutar: number;
  cspExecutarDireto: number;
  cspExecutarOverhead: number;
  cspSaber: number;
  cspSaberDireto: number;
  cspSaberOverhead: number;
  cspTer: number;
  cspTotal: number;
  percentualCSP: number;                  // % sobre Receita Líquida
  
  // MARGEM OPERACIONAL
  margemOperacional: number;
  percentualMargemOperacional: number;
  
  // DESPESAS MARKETING E VENDAS (calculado via SalesMetrics)
  salesMetrics: SalesMetrics;
  totalMarketingVendas: number;
  
  // MARGEM DE CONTRIBUIÇÃO
  margemContribuicao: number;
  percentualMargemContribuicao: number;
  
  // DESPESAS ADMINISTRATIVAS
  despesasTimeAdm: number;
  despesasCustosAdm: number;
  despesasTech: number;
  despesasUtilities: number;
  despesasPessoas: number;
  viagensAdmin: number;
  despesasSoftwares: number;
  despesasServicosTerceirizados: number;
  totalDespesasAdm: number;
  
  // EBITDA
  ebitda: number;
  percentualEBITDA: number;
  
  // EBIT
  despesasFinanceiras: number;
  receitasFinanceiras: number;
  ebit: number;
  
  // LUCRO LÍQUIDO
  irpj: number;
  csll: number;
  lucroLiquido: number;
  percentualLucroLiquido: number;
  
  // FLUXO DE CAIXA
  lucroPeríodo: number;
  contasAReceberBookado: number;
  taxasRoyaltiesBookado: number;
  depreciacao: number;
  caixaOperacional: number;
  compraAtivoIntangivel: number;
  caixaInvestimento: number;
  pagamentoFinanciamento: number;
  distribuicaoDividendos: number;
  caixaFinanciamento: number;
  saldoCaixaMes: number;
  caixaInicial: number;
  caixaFinal: number;
  caixaEfetivo: number;                   // Resumo: Lucro Líquido - Compra Ativo - Pagamento Financ - Dividendos
  
  // KPIs
  cac: number;                            // Customer Acquisition Cost
  clv: number;                            // Customer Lifetime Value
  roi: number;                            // ROI (CLV/CAC - 1)
  quantidadeClientes: number;             // Total de clientes ativos
}

export interface SimulationInputs {
  name: string;
  topline: ToplineInputs;
  tierMetrics: Record<Tier, TierMetrics>;
  conversionRates: ConversionRates;
  legacyBase: LegacyBase;
  expansionDistribution: ExpansionDistribution;
  capacityPlan: CapacityPlanConfig;
  salesConfig: SalesConfig;
  dreConfig: DREConfig;
}

export interface MonthlyData {
  month: number;
  // Funnel metrics per tier
  mqls: TierDistribution;
  sqls: TierDistribution;
  sals: TierDistribution;
  wons: TierDistribution;
  activations: TierDistribution;
  
  // Revenue per tier per product
  revenueByTierProduct: Record<Tier, ProductDistribution>;
  
  // Active clients (includes activations + conversions + renewals)
  activeClients: Record<Tier, ProductDistribution>;
  
  // Direct funnel activations only (no conversions or renewals)
  directActivations: Record<Tier, ProductDistribution>;
  
  // Activation breakdown (valores debitados pela quebra de ativação)
  activationBreakdown: Record<Tier, ProductDistribution>;
  
  // Legacy
  legacyClients: TierDistribution;
  legacyRevenueBeforeChurn: TierDistribution; // Receita antes de aplicar churn
  legacyRevenue: TierDistribution;
  legacyExpansionRevenue: TierDistribution; // Receita de expansão da base legada por tier (total)
  legacyExpansionByProduct: Record<Tier, ProductDistribution>; // Receita de expansão por produto/tier
  
  // Renewals
  renewals: Record<Tier, ProductDistribution>;
  renewalRevenue: Record<Tier, ProductDistribution>;
  
  // Expansion from active Executar base
  activeBaseExpansions: Record<Tier, ProductDistribution>;
  activeBaseExpansionRevenue: Record<Tier, ProductDistribution>;
  
  // Expansion (combined: active + legacy for backward compatibility)
  expansions: Record<Tier, ProductDistribution>;
  expansionRevenue: Record<Tier, ProductDistribution>;
  
  // Conversions Saber → Executar
  conversions: Record<Tier, { loyalty: number; noLoyalty: number }>;
  
  // Totals
  totalNewRevenue: number;
  totalRenewalRevenue: number;
  totalExpansionRevenue: number;
  totalLegacyRevenue: number;
  totalLegacyRenewalRevenue: number;  // Receita de renewal da base legada (separado)
  totalLegacyExpansionRevenue: number; // Receita de expansão da base legada (já existe acima, mas copiado para total)
  totalRevenue: number;
  totalActiveClients: number;
  
  // Capacity Plan
  capacityPlan: CapacityPlanData;
  
  // DRE
  dre: DREData;
}

export interface Simulation {
  id: string;
  inputs: SimulationInputs;
  monthlyData: MonthlyData[];
  createdAt: string;
  updatedAt: string;
}
