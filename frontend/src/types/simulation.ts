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
  leadToMqlRate: number[];      // 12 values
}

export interface ConversionRates {
  // saberToExecutar removed
  // executarLoyaltyRatio removed
  saberConversionDays: number;
  loyaltyDuration: Record<Tier, number>;
  loyaltyRenewalRate: number;
  loyaltyMaxRenewals: number;
  noLoyaltyDuration: number;
  noLoyaltyRenewalRate: number;
  noLoyaltyMaxRenewals: number;
  // expansionRate removed
}

export interface LegacyBase {
  enterprise: { revenue: number; clients: number };
  large: { revenue: number; clients: number };
  medium: { revenue: number; clients: number };
  small: { revenue: number; clients: number };
  tiny: { revenue: number; clients: number };
  // Monthly rates (12 values) to allow per-month adjustments
  churnRate: number[];
  expansionRate: number[];
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
  // Fator (0..1) que representa disponibilidade/eficiência média (ex: 0.85)
  availabilityFactor?: number;
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
  // Accounts requeridos (carteira) por tier e total
  accountsByTier: TierDistribution;
  accountsRequired: number;
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
  // Comissão Monetização Ops: percentual aplicado sobre a receita de expansão total
  comissaoMonetizacaoOpsRate: number;  // Default: 5% (0.05)
  despesasVisitasExpansion: number;    // Default: R$ 2.000/mês

  // Contagem atual da equipe de vendas
  currentSDR?: number;
  currentClosers?: number;
  // Outbound SALs as a fraction of SQLs (e.g., 0.074 adds 7.4% outbound SALs)
  outboundSalRate?: number;
}

// =============================================================================
// WTP (Willingness to Pay) - Expansion Line Model
// =============================================================================

/** WTP Configuration per Tier - annual values and monthly targets */
export interface WTPTierConfig {
  annualWTP: number;                    // $ Annual WTP - quanto cada cliente pode gastar/ano
  shareOfWalletDesired: number[];       // 12 values - % meta de captura mensal (ex: [0.05, 0.05, ...])
  productDistribution: ProductDistribution;  // % distribuição por produto para expansão
}

/** Complete WTP Configuration */
export interface WTPConfig {
  enterprise: WTPTierConfig;
  large: WTPTierConfig;
  medium: WTPTierConfig;
  small: WTPTierConfig;
  tiny: WTPTierConfig;
}

/** WTP Monthly Data per Tier - tracking de Share of Wallet */
export interface WTPTierMonthlyData {
  goLiveClients: number;               // # clientes que ativaram (Go Lives)
  revenueAtGoLive: number;             // $ receita na ativação
  totalShareOfWallet: number;          // $ Total WTP × clientes
  shareOfWalletActived: number;        // $ Share of Wallet já capturada (acumulada)
  shareOfWalletRemaining: number;      // $ Quanto ainda pode capturar
  expansionGoal: number;               // $ Meta de expansão do mês
  numExpansions: number;               // # de expansões no mês
  revenueExpansion: number;            // $ receita de expansão WTP
  saturationIndex: number;             // % do WTP já capturado
  monetizationPotential: number;       // % ainda disponível para captura
  expansionByProduct: ProductDistribution;  // $ receita por produto
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
  wtpConfig: WTPConfig;  // NEW: Configuração WTP por tier
}

export interface MonthlyData {
  month: number;
  // Funnel metrics per tier
  mqls: TierDistribution;
  sqls: TierDistribution;
  sals: TierDistribution;
  // inbound/outbound breakdown for SALs (keeps compatibility with sheet which shows inbound + outbound)
  salsInbound: TierDistribution;
  salsOutbound: TierDistribution;
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
  // conversions removed

  // Totals
  totalLeads: number;
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

  // Sales Metrics (previously in DRE, now moved here)
  salesMetrics?: SalesMetrics;

  // WTP (Willingness to Pay) - Expansion Line Data
  wtpData: Record<Tier, WTPTierMonthlyData>;
  totalWTPExpansionRevenue: number;  // Total de receita de expansão WTP no mês
}

export interface Simulation {
  id: string;
  inputs: SimulationInputs;
  monthlyData: MonthlyData[];
  createdAt: string;
  updatedAt: string;
}



