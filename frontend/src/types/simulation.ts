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

// Capacity Plan Types
export interface CapacityPlanConfig {
  saberSquad: {
    headcount: number;           // Pessoas por squad Saber
    capacityUC: number;          // Unidades de capacidade por squad
    tierWeights: TierDistribution; // Peso de cada tier
  };
  executarSquad: {
    headcount: number;           // Pessoas por squad Executar
    clientsPerSquad: number;     // Clientes por squad (legacy, mantido para compatibilidade)
    capacityUC: number;          // Unidades de capacidade por squad Executar
    tierWeights: TierDistribution; // Peso de cada tier para Executar
  };
}

export interface CapacityPlanData {
  // Clientes Saber por tier (apenas novos do mês, projeto pontual)
  clientsSaberByTier: TierDistribution;
  // Total clientes Saber
  totalClientsSaber: number;
  // Clientes Executar por tier
  clientsExecutarByTier: TierDistribution;
  // Total clientes Executar (Loyalty + NoLoyalty)
  totalClientsExecutar: number;
  // Unidades de capacidade Saber necessárias
  totalUC: number;
  // Unidades de capacidade Executar necessárias
  executarUC: number;
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
  // Métricas
  revenuePerHC: number;
  ucUtilization: number; // % de utilização da capacidade Saber
  executarUtilization: number; // % de utilização da capacidade Executar
}

export interface SimulationInputs {
  name: string;
  topline: ToplineInputs;
  tierMetrics: Record<Tier, TierMetrics>;
  conversionRates: ConversionRates;
  legacyBase: LegacyBase;
  expansionDistribution: ExpansionDistribution;
  capacityPlan: CapacityPlanConfig;
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
  
  // Active clients
  activeClients: Record<Tier, ProductDistribution>;
  
  // Legacy
  legacyClients: TierDistribution;
  legacyRevenue: TierDistribution;
  legacyExpansionRevenue: TierDistribution; // Receita de expansão da base legada por tier (total)
  legacyExpansionByProduct: Record<Tier, ProductDistribution>; // Receita de expansão por produto/tier
  
  // Renewals
  renewals: Record<Tier, ProductDistribution>;
  renewalRevenue: Record<Tier, ProductDistribution>;
  
  // Expansion
  expansions: Record<Tier, ProductDistribution>;
  expansionRevenue: Record<Tier, ProductDistribution>;
  
  // Conversions Saber → Executar
  conversions: Record<Tier, { loyalty: number; noLoyalty: number }>;
  
  // Totals
  totalNewRevenue: number;
  totalRenewalRevenue: number;
  totalExpansionRevenue: number;
  totalLegacyRevenue: number;
  totalRevenue: number;
  totalActiveClients: number;
  
  // Capacity Plan
  capacityPlan: CapacityPlanData;
}

export interface Simulation {
  id: string;
  inputs: SimulationInputs;
  monthlyData: MonthlyData[];
  createdAt: string;
  updatedAt: string;
}
