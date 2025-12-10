import React, { useMemo, useState } from 'react';
import { Simulation, SimulationInputs, Tier, Product } from '@/types/simulation';
import { MONTHS, TIER_LABELS, PRODUCT_LABELS } from '@/data/defaultInputs';
import { SpreadsheetCell, RowHeader, ColumnHeader } from './SpreadsheetCell';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/calculations';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { 
  InvestmentChart, 
  MQLsChart, 
  TotalRevenueChart, 
  RevenueByProductChart,
  RevenueByTierChart,
  TotalClientsChart,
  CapacityChart 
} from './SpreadsheetCharts';
import * as XLSX from 'xlsx';

interface SpreadsheetViewProps {
  simulation: Simulation;
  onUpdate: (inputs: SimulationInputs) => void;
}

const TIERS: Tier[] = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS: Product[] = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];

// Helper: get monthly value from number or array (for CSP salary ramps)
const getMonthlyValue = (value: number | number[], monthIndex: number): number => {
  return Array.isArray(value) ? value[monthIndex] : value;
};

const TOOLTIPS = {
  investment: 'Investimento mensal em marketing para geração de leads',
  cpl: 'Custo por Lead - quanto custa para adquirir cada MQL',
  totalMQLs: 'Total de Marketing Qualified Leads gerados no período (derivado)',
  mqlDistribution: 'Percentual do total de MQLs distribuídos para este tier',

  mqlToSqlRate: 'Taxa de conversão de MQL para SQL (Sales Qualified Lead)',
  sqlToSalRate: 'Taxa de conversão de SQL para SAL (Sales Accepted Lead / Opportunity)',
  salToWonRate: 'Taxa de conversão de SAL para WON (cliente fechado)',
  activationRate: 'Percentual de clientes WON que são ativados com sucesso',
  revenueActivationRate: 'Percentual da receita WON que é efetivamente ativada',
  productDistribution: 'Distribuição percentual de clientes por produto',
  productTicket: 'Ticket médio do produto para este tier',
  mqls: 'Marketing Qualified Leads - leads qualificados pelo marketing',
  sqls: 'Sales Qualified Leads - leads qualificados para vendas',
  sals: 'Sales Accepted Leads - oportunidades aceitas pelo comercial',
  wons: 'Clientes fechados (deals ganhos)',
  activations: 'Clientes efetivamente ativados',
  revenue: 'Receita gerada',
  saberToExecutar: 'Taxa de conversão de clientes Saber para Executar após 60 dias',
  executarLoyaltyRatio: 'Proporção de conversões que vão para Loyalty vs No-Loyalty',
  loyaltyDuration: 'Duração do ciclo de renovação para Loyalty (em meses)',
  loyaltyRenewalRate: 'Taxa de renovação para clientes Loyalty',
  loyaltyMaxRenewals: 'Número máximo de renovações para clientes Loyalty',
  noLoyaltyDuration: 'Duração do ciclo de renovação para No-Loyalty (em meses)',
  noLoyaltyRenewalRate: 'Taxa de renovação para clientes No-Loyalty',
  noLoyaltyMaxRenewals: 'Número máximo de renovações para clientes No-Loyalty',
  expansionRate: 'Taxa mensal de expansão de carteira sobre clientes ativos em Executar',
  legacyChurn: 'Taxa mensal de churn (perda) da base legada',
  legacyExpansion: 'Taxa mensal de expansão da base legada',
};

export function SpreadsheetView({ simulation, onUpdate }: SpreadsheetViewProps) {
const { inputs, monthlyData } = simulation;

  // Estado para controlar seções expandidas
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    topline: false,
    funnel: false,
    conversionRates: false,
    renewals: false,
    activeBaseExpansions: false,
    expansions: false,
    legacyBase: false,
    totals: false,
    totalsClients: false,
    capacityPlan: false,
    salesConfig: false,
    dre: false,
    fluxoCaixa: false, // Fluxo de caixa começa fechado
  });

  // Estado para controlar breakdown de horas
  const [hoursBreakdown, setHoursBreakdown] = useState<Record<string, boolean>>({
    saberHours: false,
    executarHours: false,
  });

  // Estado para controlar exibição dos gráficos
  const [showCharts, setShowCharts] = useState<Record<string, boolean>>({
    investment: false,
    mqls: false,
    totalRevenue: false,
    revenueByProduct: false,
    revenueByTier: false,
    totalClients: false,
    capacityHC: false,
  });

  // Estado para filtro do funil por tier
  type FunnelFilter = 'all' | 'tickets' | 'rates' | 'distribution' | 'results';
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('all');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleChart = (chart: string) => {
    setShowCharts(prev => ({ ...prev, [chart]: !prev[chart] }));
  };

  const updateInput = <K extends keyof SimulationInputs>(
    key: K,
    value: SimulationInputs[K]
  ) => {
    onUpdate({
      ...inputs,
      [key]: value,
    });
  };

  // Update monthly array in topline
  const updateToplineMonthly = (field: 'investmentMonthly' | 'cplMonthly', index: number, value: number) => {
    const current = [...inputs.topline[field]];
    current[index] = value;
    onUpdate({
      ...inputs,
      topline: {
        ...inputs.topline,
        [field]: current,
      },
    });
  };

  // Update monthly metric for a tier (scalar arrays)
  const updateTierMetricMonthly = (
    tier: Tier,
    key: 'mqlDistribution' | 'mqlToSqlRate' | 'sqlToSalRate' | 'salToWonRate' | 'activationRate' | 'revenueActivationRate',
    index: number,
    value: number
  ) => {
    const newTierMetrics = { ...inputs.tierMetrics };
    const current = [...newTierMetrics[tier][key]];
    current[index] = value;
    newTierMetrics[tier] = {
      ...newTierMetrics[tier],
      [key]: current,
    };
    onUpdate({
      ...inputs,
      tierMetrics: newTierMetrics,
    });
  };

  // Update monthly product distribution/tickets
  const updateTierProductMonthly = (
    tier: Tier,
    field: 'productDistribution' | 'productTickets',
    product: Product,
    index: number,
    value: number
  ) => {
    const newTierMetrics = { ...inputs.tierMetrics };
    const currentProduct = [...newTierMetrics[tier][field][product]];
    currentProduct[index] = value;
    newTierMetrics[tier] = {
      ...newTierMetrics[tier],
      [field]: {
        ...newTierMetrics[tier][field],
        [product]: currentProduct,
      },
    };
    onUpdate({
      ...inputs,
      tierMetrics: newTierMetrics,
    });
  };

  const updateLegacyBase = (tier: Tier | 'churnRate' | 'expansionRate', key: string, value: number) => {
    if (tier === 'churnRate' || tier === 'expansionRate') {
      onUpdate({
        ...inputs,
        legacyBase: {
          ...inputs.legacyBase,
          [tier]: value,
        },
      });
    } else {
      onUpdate({
        ...inputs,
        legacyBase: {
          ...inputs.legacyBase,
          [tier]: {
            ...inputs.legacyBase[tier],
            [key]: value,
          },
        },
      });
    }
  };

  const labelizeKey = (k: string) => {
    // simple camelCase / snake_case -> Title Case
    return k
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_\-]/g, ' ')
      .replace(/^./, (s) => s.toUpperCase())
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

  // Update top-level dreConfig scalar (used for manual lines like tech remuneração)
  const updateDreScalar = (key: keyof typeof inputs.dreConfig, value: number) => {
    onUpdate({
      ...inputs,
      dreConfig: {
        ...inputs.dreConfig,
        [key]: value,
      } as any,
    });
  };

    // Helpers for detailed administrative expenses editing
  const getDespesaDetalhadaValue = (key: string, monthIndex: number) => {
    const det = inputs.dreConfig.despesasAdmDetalhadas as Record<string, number | number[]> | undefined;
    if (!det) return 0;
    const v = det[key];
    if (v === undefined) return 0;
    if (Array.isArray(v)) return v[monthIndex] ?? 0;
    return v;
  };

    const updateDespesaDetalhada = (key: string, monthIndex: number, value: number) => {
    const current = { ...(inputs.dreConfig.despesasAdmDetalhadas || {}) } as Record<string, number | number[]>;
    const existing = current[key];
    if (existing === undefined) {
      // create an array of 12 with zeros and set
      const arr = new Array(12).fill(0);
      arr[monthIndex] = value;
      current[key] = arr;
    } else if (Array.isArray(existing)) {
      const arr = [...existing];
      arr[monthIndex] = value;
      current[key] = arr;
    } else {
      // existing scalar -> convert to array
      const arr = new Array(12).fill(existing as number);
      arr[monthIndex] = value;
      current[key] = arr;
    }

    onUpdate({
      ...inputs,
      dreConfig: {
        ...inputs.dreConfig,
        despesasAdmDetalhadas: current,
      },
    });
  };

  // Update capacity plan config
  const updateCapacityPlan = (
    squad: 'saberSquad' | 'executarSquad',
    key: string,
    value: number
  ) => {
    onUpdate({
      ...inputs,
      capacityPlan: {
        ...inputs.capacityPlan,
        [squad]: {
          ...inputs.capacityPlan[squad],
          [key]: value,
        },
      },
    });
  };

  // Update top-level capacityPlan scalar (ex: initialHCSaber, availabilityFactor)
  const updateCapacityScalar = (key: string, value: number) => {
    onUpdate({
      ...inputs,
      capacityPlan: {
        ...inputs.capacityPlan,
        [key]: value,
      } as any,
    });
  };

  // Update role hours per tier
  const updateRoleHours = (
    squad: 'saberSquad' | 'executarSquad',
    role: string,
    tier: Tier,
    value: number
  ) => {
    onUpdate({
      ...inputs,
      capacityPlan: {
        ...inputs.capacityPlan,
        [squad]: {
          ...inputs.capacityPlan[squad],
          roleHours: {
            ...inputs.capacityPlan[squad].roleHours,
            [role]: {
              ...inputs.capacityPlan[squad].roleHours[role],
              [tier]: value,
            },
          },
        },
      },
    });
  };
  

  const updateConversionRate = (key: keyof typeof inputs.conversionRates, value: number) => {
    onUpdate({
      ...inputs,
      conversionRates: {
        ...inputs.conversionRates,
        [key]: value,
      },
    });
  };

  // Update monthly legacy metrics (churnRate or expansionRate) at a specific month index
  const updateLegacyMonthly = (field: 'churnRate' | 'expansionRate', index: number, value: number) => {
    const current = [...inputs.legacyBase[field]];
    current[index] = value;
    onUpdate({
      ...inputs,
      legacyBase: {
        ...inputs.legacyBase,
        [field]: current,
      },
    });
  };


  // Calculate annual totals
  const annualTotals = useMemo(() => {
    const totalInvestment = inputs.topline.investmentMonthly.reduce((s, v) => s + v, 0);
    const avgCPL = inputs.topline.cplMonthly.reduce((s, v) => s + v, 0) / 12;
    
    return {
      totalNewRevenue: monthlyData.reduce((sum, m) => sum + m.totalNewRevenue, 0),
      totalRenewalRevenue: monthlyData.reduce((sum, m) => sum + m.totalRenewalRevenue, 0),
      totalExpansionRevenue: monthlyData.reduce((sum, m) => sum + m.totalExpansionRevenue, 0),
      totalLegacyRevenue: monthlyData.reduce((sum, m) => sum + m.totalLegacyRevenue, 0),
      totalRevenue: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
      totalMQLs: Math.round(totalInvestment / avgCPL),
      totalWons: monthlyData.reduce((sum, m) => Object.values(m.wons).reduce((s, v) => s + v, 0), 0),
    };
  }, [monthlyData, inputs.topline]);

  // Resumo administrativo (consolidado anual)
  const resumoAdministrativo = useMemo(() => {
    const prev = inputs.dreConfig.previousYearRevenue ?? 34000000;
    const cagr = prev > 0 ? (annualTotals.totalRevenue / prev) - 1 : 0;

    const ebitda = monthlyData.reduce((s, m) => s + ((m.dre && m.dre.ebitda) || 0), 0);
    const ebit = monthlyData.reduce((s, m) => s + ((m.dre && m.dre.ebit) || 0), 0);
    const lucro = monthlyData.reduce((s, m) => s + ((m.dre && m.dre.lucroLiquido) || 0), 0);
    const caixaEfetivo = monthlyData.reduce((s, m) => s + ((m.dre && m.dre.caixaEfetivo) || 0), 0);

    const revenue = Math.max(annualTotals.totalRevenue || 0, 1); // avoid div by zero

    return {
      cagr,
      ebitda,
      percentualEBITDA: ebitda / revenue,
      ebit,
      percentualEBIT: ebit / revenue,
      lucro,
      percentualLucro: lucro / revenue,
      caixaEfetivo,
      percentualCaixaEfetivo: caixaEfetivo / revenue,
    };
  }, [monthlyData, annualTotals, inputs.dreConfig.previousYearRevenue]);

  // Evolução do ticket médio (a partir das premissas / funil por tier)
  const ticketMedioSeries = useMemo(() => {
    return monthlyData.map((m) => {
      const totalNewRevenue = m.totalNewRevenue || 0;
      const totalActivations = TIERS.reduce((s, tier) => s + (m.activations?.[tier] || 0), 0);
      return totalActivations > 0 ? totalNewRevenue / totalActivations : 0;
    });
  }, [monthlyData]);

  // Export to Excel function
  const exportToExcel = () => {
    const data: (string | number)[][] = [];
    const headers = ['Métrica', ...MONTHS, 'Total'];
    data.push(headers);

    // Helper to add a row
    const addRow = (label: string, values: number[], total?: number, format?: 'currency' | 'percent' | 'number') => {
      const row: (string | number)[] = [label];
      values.forEach(v => row.push(v));
      row.push(total !== undefined ? total : values.reduce((s, v) => s + v, 0));
      data.push(row);
    };

    // TOPLINE
    data.push(['TOPLINE', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('$ Investimento', inputs.topline.investmentMonthly, inputs.topline.investmentMonthly.reduce((s, v) => s + v, 0));
    addRow('$ CPL', inputs.topline.cplMonthly, inputs.topline.cplMonthly.reduce((s, v) => s + v, 0) / 12);
    addRow('# Total MQLs', monthlyData.map(m => Object.values(m.mqls).reduce((s, v) => s + v, 0)));

    // FUNIL POR TIER
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['FUNIL POR TIER', '', '', '', '', '', '', '', '', '', '', '', '', '']);

    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      data.push([TIER_LABELS[tier], '', '', '', '', '', '', '', '', '', '', '', '', '']);
      
      // Distribution & Rates
      addRow(`  % MQL Distribution`, metrics.mqlDistribution);
      addRow(`  % MQL → SQL`, metrics.mqlToSqlRate);
      addRow(`  % SQL → SAL`, metrics.sqlToSalRate);
      addRow(`  % SAL → WON`, metrics.salToWonRate);
      addRow(`  % Ativação`, metrics.activationRate);
      addRow(`  % Receita Ativada`, metrics.revenueActivationRate);
      
      // Product Distribution
      for (const product of PRODUCTS) {
        addRow(`  % ${PRODUCT_LABELS[product]}`, metrics.productDistribution[product]);
      }
      
      // Product Tickets
      for (const product of PRODUCTS) {
        addRow(`  $ Ticket ${PRODUCT_LABELS[product]}`, metrics.productTickets[product]);
      }
      
      // Results
      addRow(`  # MQLs`, monthlyData.map(m => m.mqls[tier]));
      addRow(`  # SQLs`, monthlyData.map(m => m.sqls[tier]));
      addRow(`  # SALs`, monthlyData.map(m => m.sals[tier]));
      addRow(`  # WONs`, monthlyData.map(m => m.wons[tier]));
      addRow(`  # Ativações`, monthlyData.map(m => m.activations[tier]));
      
      // Revenue by product
      for (const product of PRODUCTS) {
        addRow(`  $ Receita ${PRODUCT_LABELS[product]}`, monthlyData.map(m => m.revenueByTierProduct[tier][product]));
      }

      // Direct activations (clientes ativados diretamente do funil) - exibidos na UI, faltavam na exportação
      for (const product of PRODUCTS) {
        addRow(`  # Clientes ${PRODUCT_LABELS[product]}`, monthlyData.map(m => m.directActivations[tier][product]));
      }

      // Activation breakdown (valores debitados pela taxa de ativação) - exporta como negativo para manter consistência com UI
      for (const product of PRODUCTS) {
        addRow(`  (-) Quebra Ativação ${PRODUCT_LABELS[product]}`, monthlyData.map(m => -m.activationBreakdown[tier][product]));
      }
    }

    // CONVERSION RATES
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['TAXAS DE CONVERSÃO E RENOVAÇÃO', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('% Saber → Executar', Array(12).fill(inputs.conversionRates.saberToExecutar));
    addRow('% Executar Loyalty Ratio', Array(12).fill(inputs.conversionRates.executarLoyaltyRatio));
    addRow('# Loyalty Duration (meses)', Array(12).fill(inputs.conversionRates.loyaltyDuration));
    addRow('% Loyalty Renewal Rate', Array(12).fill(inputs.conversionRates.loyaltyRenewalRate));
    addRow('# No-Loyalty Duration (meses)', Array(12).fill(inputs.conversionRates.noLoyaltyDuration));
    addRow('% No-Loyalty Renewal Rate', Array(12).fill(inputs.conversionRates.noLoyaltyRenewalRate));
    addRow('% Expansion Rate', Array(12).fill(inputs.conversionRates.expansionRate));

    // RENEWALS
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['RENOVAÇÕES', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    for (const tier of TIERS) {
      addRow(`  # Renovações Loyalty ${TIER_LABELS[tier]}`, monthlyData.map(m => m.renewals[tier].executarLoyalty));
      addRow(`  $ Receita Renovação Loyalty ${TIER_LABELS[tier]}`, monthlyData.map(m => m.renewalRevenue[tier].executarLoyalty));
      addRow(`  # Renovações NoLoyalty ${TIER_LABELS[tier]}`, monthlyData.map(m => m.renewals[tier].executarNoLoyalty));
      addRow(`  $ Receita Renovação NoLoyalty ${TIER_LABELS[tier]}`, monthlyData.map(m => m.renewalRevenue[tier].executarNoLoyalty));
    }
    addRow('$ Total Receita Renovação', monthlyData.map(m => m.totalRenewalRevenue));

    // CONVERSÕES SABER → EXECUTAR
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['CONVERSÕES SABER → EXECUTAR', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    // Conversões Saber → Executar por tier
    for (const tier of TIERS) {
      addRow(`  # Clientes Saber > Executar ${TIER_LABELS[tier]}`, monthlyData.map(m => m.conversions[tier].loyalty + m.conversions[tier].noLoyalty));
      const conversionRevenue = monthlyData.map(m => {
        const metrics = inputs.tierMetrics[tier];
        const monthIdx = m.month;
        const loyaltyRev = m.conversions[tier].loyalty * metrics.productTickets.executarLoyalty[monthIdx] * inputs.conversionRates.loyaltyDuration;
        const noLoyaltyRev = m.conversions[tier].noLoyalty * metrics.productTickets.executarNoLoyalty[monthIdx] * inputs.conversionRates.noLoyaltyDuration;
        return loyaltyRev + noLoyaltyRev;
      });
      addRow(`  $ Receita Saber > Executar ${TIER_LABELS[tier]}`, conversionRevenue);
    }
    addRow('$ Total Receita Conversões', monthlyData.map(m => 
      TIERS.reduce((sum, tier) => {
        const metrics = inputs.tierMetrics[tier];
        const loyaltyRev = m.conversions[tier].loyalty * metrics.productTickets.executarLoyalty[m.month] * inputs.conversionRates.loyaltyDuration;
        const noLoyaltyRev = m.conversions[tier].noLoyalty * metrics.productTickets.executarNoLoyalty[m.month] * inputs.conversionRates.noLoyaltyDuration;
        return sum + loyaltyRev + noLoyaltyRev;
      }, 0)
    ));

    // LEGACY BASE
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['BASE LEGADA', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    // legacy churn/expansion are now monthly arrays
    addRow('% Churn Mensal', inputs.legacyBase.churnRate);
    addRow('% Expansão Mensal', inputs.legacyBase.expansionRate);
    for (const tier of TIERS) {
      addRow(`  $ Receita Legada ${TIER_LABELS[tier]}`, monthlyData.map(m => m.legacyRevenue[tier]));
      addRow(`  $ Expansão Total ${TIER_LABELS[tier]}`, monthlyData.map(m => m.legacyExpansionRevenue[tier]));
      for (const product of PRODUCTS) {
        addRow(`    → ${PRODUCT_LABELS[product]}`, monthlyData.map(m => m.legacyExpansionByProduct[tier][product]));
      }
    }
    addRow('$ Total Receita Legada', monthlyData.map(m => m.totalLegacyRevenue));

    // TOTALS
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['TOTAIS DE RECEITA', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('$ Receita Nova Aquisição', monthlyData.map(m => m.totalNewRevenue));
    addRow('$ Receita Renovação Aquisição', monthlyData.map(m => m.totalRenewalRevenue));
    addRow('$ Receita Expansão Aquisição', monthlyData.map(m => m.totalExpansionRevenue));
    addRow('$ Receita Base Legada', monthlyData.map(m => {
      const legacyBase = TIERS.reduce((s, tier) => s + m.legacyRevenue[tier], 0);
      const legacyExpansion = TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
      return legacyBase - legacyExpansion;
    }));
    addRow('$ Receita Base Legada Expansão', monthlyData.map(m => TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0)));
    addRow('$ Receita Total Saber (All)', monthlyData.map(m => TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].saber, 0)));
    addRow('$ Receita Total Ter (All)', monthlyData.map(m => TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].ter, 0)));
    addRow('$ RECEITA TOTAL', monthlyData.map(m => m.totalRevenue));

    // CAPACITY PLAN
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['PLANO DE CAPACIDADE', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('# Clientes Saber', monthlyData.map(m => m.capacityPlan.totalClientsSaber));
    addRow('# UC Saber', monthlyData.map(m => m.capacityPlan.totalUC));
    addRow('# HC Saber', monthlyData.map(m => m.capacityPlan.hcSaber));
    addRow('# Clientes Executar', monthlyData.map(m => m.capacityPlan.totalClientsExecutar));
    addRow('# UC Executar', monthlyData.map(m => m.capacityPlan.executarUC));
    addRow('# HC Executar', monthlyData.map(m => m.capacityPlan.hcExecutar));
    addRow('# HC Total', monthlyData.map(m => m.capacityPlan.totalHC));
    addRow('% Turnover', monthlyData.map(() => 0.07));
    addRow('# Turnover Saber', monthlyData.map(m => m.capacityPlan.turnoverSaber));
    addRow('# Turnover Executar', monthlyData.map(m => m.capacityPlan.turnoverExecutar));
    addRow('# Total Turnover', monthlyData.map(m => m.capacityPlan.totalTurnover));
    addRow('# Contratações Saber', monthlyData.map(m => m.capacityPlan.hiresSaber));
    addRow('# Contratações Executar', monthlyData.map(m => m.capacityPlan.hiresExecutar));
    addRow('# Total Contratações', monthlyData.map(m => m.capacityPlan.totalHires));
    addRow('# GAP Reapropriação Executar→Saber', monthlyData.map(m => m.capacityPlan.redeployableFromExecutar));
    addRow('# Total Contratações (com realocação)', monthlyData.map(m => m.capacityPlan.totalHiresWithRedeployment));
    addRow('$ Receita/HC', monthlyData.map(m => m.capacityPlan.revenuePerHC));
    // Sales guidance (SDR / Closers) - não contam no totalHC
    addRow('# Sales: SDR Required', monthlyData.map(m => m.capacityPlan.salesSDRRequired ?? 0));
    addRow('# Sales: Closers Required', monthlyData.map(m => m.capacityPlan.salesClosersRequired ?? 0));
    addRow('# Sales: Current SDR', monthlyData.map(m => m.capacityPlan.salesCurrentSDR ?? 0));
    addRow('# Sales: Current Closers', monthlyData.map(m => m.capacityPlan.salesCurrentClosers ?? 0));
    addRow('# Contratações Sales', monthlyData.map(m => m.capacityPlan.salesHires ?? 0));

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // Métrica column
      ...MONTHS.map(() => ({ wch: 15 })),
      { wch: 15 }, // Total column
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Simulação');
    
    // Generate filename with simulation name and date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${inputs.name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with simulation name */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Input
            value={inputs.name}
            onChange={(e) => updateInput('name', e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:ring-1 focus:ring-primary max-w-md"
          />
          <div className="flex-1" />
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Receita Anual:</span>
              <span className="ml-2 font-mono text-currency text-lg font-semibold">
                {formatCurrency(annualTotals.totalRevenue)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">WONs:</span>
              <span className="ml-2 font-mono text-number">
                {formatNumber(annualTotals.totalWons)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Receita Ano Anterior:</span>
              <Input
                type="number"
                value={String(inputs.dreConfig.previousYearRevenue ?? 34000000)}
                onChange={(e) => onUpdate({
                  ...inputs,
                  dreConfig: { ...inputs.dreConfig, previousYearRevenue: Math.max(0, Math.round(Number(e.target.value) || 0)) }
                })}
                className="ml-2 w-40"
              />
            </div>
            <div>
              <span className="text-muted-foreground">CAGR:</span>
              <span className="ml-2 font-mono text-number">
                {formatPercentage((inputs.dreConfig.previousYearRevenue ?? 34000000) > 0 ? ((annualTotals.totalRevenue / (inputs.dreConfig.previousYearRevenue ?? 34000000)) - 1) : 0)}
              </span>
            </div>
            <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Spreadsheet container */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-w-max">
          {/* Column headers */}
          <div className="flex sticky top-0 z-30 bg-card">
            <div className="spreadsheet-row-header sticky left-0 z-40 bg-card flex items-center">
              <span className="text-muted-foreground">Métrica</span>
            </div>
            {MONTHS.map((month) => (
              <ColumnHeader key={month} label={month} />
            ))}
            <ColumnHeader label="Total" className="spreadsheet-grand-total" />
          </div>

          {/* TOPLINE SECTION */}
          <div className="flex">
            <RowHeader 
              label="TOPLINE" 
              level="section" 
              expanded={expandedSections.topline}
              onToggle={() => toggleSection('topline')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.topline && (
            <>
          {/* Chart: Investment */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('investment')}>
            <RowHeader 
              label={`📈 Gráfico: Investimento`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground col-span-13" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.investment ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.investment && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <InvestmentChart investmentMonthly={inputs.topline.investmentMonthly} />
              </div>
            </div>
          )}

          {/* Investment */}
          <div className="flex row-hover">
            <RowHeader label="Investimento" tooltip={TOOLTIPS.investment} />
              {MONTHS.map((_, i) => (
                <SpreadsheetCell
                  key={i}
                  value={inputs.topline.investmentMonthly[i] ?? 0}
                  onChange={(v) => updateToplineMonthly('investmentMonthly', i, v)}
                  editable
                  format="currency"
                />
              ))}
              <SpreadsheetCell
                value={inputs.topline.investmentMonthly.reduce((s, n) => s + (n || 0), 0)}
                format="currency"
                className="spreadsheet-total"
              />
          </div>

          {/* CPL */}
          <div className="flex row-hover">
            <RowHeader label="CPL" tooltip={TOOLTIPS.cpl} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.topline.cplMonthly[i] ?? 0}
                onChange={(v) => updateToplineMonthly('cplMonthly', i, v)}
                editable
                format="currency"
              />
            ))}
            <SpreadsheetCell
              value={inputs.topline.cplMonthly.reduce((s, n) => s + (n || 0), 0) / 12}
              format="currency"
              className="spreadsheet-total"
            />
          </div>

          {/* Chart: MQLs */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('mqls')}>
            <RowHeader 
              label={`📊 Gráfico: MQLs`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.mqls ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.mqls && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <MQLsChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          {/* Total MQLs (derived) */}
          <div className="flex row-hover">
            <RowHeader label="Total MQLs" tooltip={TOOLTIPS.totalMQLs} />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={Object.values(m.mqls).reduce((s, v) => s + v, 0)}
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalMQLs}
              format="number"
              className="spreadsheet-total"
            />
          </div>
            </>
          )}

          {/* FUNNEL BY TIER */}
          <div className="flex">
            <div className="spreadsheet-row-header sticky left-0 z-20 bg-card flex items-center justify-between">
              <button
                onClick={() => toggleSection('funnel')}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80"
              >
                {expandedSections.funnel ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                FUNIL POR TIER
              </button>
              {expandedSections.funnel && (
                <Select value={funnelFilter} onValueChange={(v) => setFunnelFilter(v as FunnelFilter)}>
                  <SelectTrigger className="h-6 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tudo</SelectItem>
                    <SelectItem value="tickets">💰 Tickets</SelectItem>
                    <SelectItem value="rates">📊 Taxas</SelectItem>
                    <SelectItem value="distribution">📈 Distribuição</SelectItem>
                    <SelectItem value="results">🎯 Resultados</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.funnel && TIERS.map((tier) => (
            <React.Fragment key={tier}>
              {/* Tier header */}
              <div className="flex">
                <RowHeader label={TIER_LABELS[tier]} level="tier" tier={tier} />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className={`spreadsheet-cell tier-${tier}`} />
                ))}
              </div>

              {/* MQL Distribution - distribution */}
              {(funnelFilter === 'all' || funnelFilter === 'distribution') && (
              <div className="flex row-hover">
                <RowHeader label="% Distribuição MQL" tooltip={TOOLTIPS.mqlDistribution} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.tierMetrics[tier].mqlDistribution[i] ?? 0}
                    onChange={(v) => updateTierMetricMonthly(tier, 'mqlDistribution', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                  <SpreadsheetCell
                    value={inputs.tierMetrics[tier].mqlDistribution.reduce((s, n) => s + n, 0) / 12}
                    format="percentage"
                    className="spreadsheet-total"
                  />
              </div>
              )}

              

              {/* MQLs - results */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
              <div className="flex row-hover">
                <RowHeader label="# MQLs" tooltip={TOOLTIPS.mqls} className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.mqls[tier]} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.mqls[tier], 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* MQL→SQL Rate - rates */}
              {(funnelFilter === 'all' || funnelFilter === 'rates') && (
              <div className="flex row-hover">
                <RowHeader label="% MQL → SQL" tooltip={TOOLTIPS.mqlToSqlRate} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.tierMetrics[tier].mqlToSqlRate[i] ?? 0}
                    onChange={(v) => updateTierMetricMonthly(tier, 'mqlToSqlRate', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.tierMetrics[tier].mqlToSqlRate.reduce((s, n) => s + n, 0) / 12}
                  format="percentage"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* SQLs - results */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
              <div className="flex row-hover">
                <RowHeader label="# SQLs" tooltip={TOOLTIPS.sqls} className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.sqls[tier]} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.sqls[tier], 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* SQL→SAL Rate - rates */}
              {(funnelFilter === 'all' || funnelFilter === 'rates') && (
              <div className="flex row-hover">
                <RowHeader label="% SQL → SAL" tooltip={TOOLTIPS.sqlToSalRate} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.tierMetrics[tier].sqlToSalRate[i] ?? 0}
                    onChange={(v) => updateTierMetricMonthly(tier, 'sqlToSalRate', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.tierMetrics[tier].sqlToSalRate.reduce((s, n) => s + n, 0) / 12}
                  format="percentage"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* SALs - results */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
              <div className="flex row-hover">
                <RowHeader label="# SALs" tooltip={TOOLTIPS.sals} className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.sals[tier]} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.sals[tier], 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* SAL→WON Rate - rates */}
              {(funnelFilter === 'all' || funnelFilter === 'rates') && (
              <div className="flex row-hover">
                <RowHeader label="% SAL → WON" tooltip={TOOLTIPS.salToWonRate} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.tierMetrics[tier].salToWonRate[i] ?? 0}
                    onChange={(v) => updateTierMetricMonthly(tier, 'salToWonRate', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.tierMetrics[tier].salToWonRate.reduce((s, n) => s + n, 0) / 12}
                  format="percentage"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* WONs - results */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
              <div className="flex row-hover">
                <RowHeader label="# WONs" tooltip={TOOLTIPS.wons} className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.wons[tier]} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.wons[tier], 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* Activation Rate - rates */}
              {(funnelFilter === 'all' || funnelFilter === 'rates') && (
              <div className="flex row-hover">
                <RowHeader label="% Ativação" tooltip={TOOLTIPS.activationRate} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.tierMetrics[tier].activationRate[i] ?? 0}
                    onChange={(v) => updateTierMetricMonthly(tier, 'activationRate', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.tierMetrics[tier].activationRate.reduce((s, n) => s + n, 0) / 12}
                  format="percentage"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* Activations - results */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
              <div className="flex row-hover">
                <RowHeader label="# Ativações" tooltip={TOOLTIPS.activations} className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.activations[tier]} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.activations[tier], 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>
              )}

              {/* Product breakdown */}
              {PRODUCTS.map((product) => (
                <React.Fragment key={product}>
                  {/* Product Qty (Clients) - results */}
                  {(funnelFilter === 'all' || funnelFilter === 'results') && (
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`# Clientes ${PRODUCT_LABELS[product]}`} 
                      tooltip="Quantidade de clientes novos ativados diretamente do funil (sem conversões ou renovações)"
                      className="pl-8" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.directActivations[tier][product]}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.directActivations[tier][product], 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                  )}

                  {/* Product Distribution - distribution */}
                  {(funnelFilter === 'all' || funnelFilter === 'distribution') && (
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`% ${PRODUCT_LABELS[product]}`} 
                      tooltip={TOOLTIPS.productDistribution}
                      className="pl-8" 
                    />
                    {MONTHS.map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.tierMetrics[tier].productDistribution[product][i] ?? 0}
                        onChange={(v) => updateTierProductMonthly(tier, 'productDistribution', product, i, v)}
                        editable
                        format="percentage"
                      />
                    ))}
                    <SpreadsheetCell
                      value={inputs.tierMetrics[tier].productDistribution[product].reduce((s, n) => s + n, 0) / 12}
                      format="percentage"
                      className="spreadsheet-total"
                    />
                  </div>
                  )}

                  {/* Product Ticket - tickets */}
                  {(funnelFilter === 'all' || funnelFilter === 'tickets') && (
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`$ Ticket ${PRODUCT_LABELS[product]}`} 
                      tooltip={TOOLTIPS.productTicket}
                      className="pl-8" 
                    />
                    {MONTHS.map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.tierMetrics[tier].productTickets[product][i] ?? 0}
                        onChange={(v) => updateTierProductMonthly(tier, 'productTickets', product, i, v)}
                        editable
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={inputs.tierMetrics[tier].productTickets[product].reduce((s, n) => s + n, 0) / 12}
                      format="currency"
                      className="spreadsheet-total"
                    />
                  </div>
                  )}

                  {/* Product Revenue - results */}
                  {(funnelFilter === 'all' || funnelFilter === 'results') && (
                  <>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`$ Receita ${PRODUCT_LABELS[product]}`} 
                      tooltip={TOOLTIPS.revenue}
                      className="pl-8" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.revenueByTierProduct[tier][product]}
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.revenueByTierProduct[tier][product], 0)}
                      format="currency"
                      className="spreadsheet-total"
                    />
                  </div>
                  
                  {/* Activation Breakdown - results */}
                  <div className="flex row-hover bg-destructive/10">
                    <RowHeader 
                      label={`(-) Quebra Ativação ${PRODUCT_LABELS[product]}`} 
                      tooltip="Valor debitado pela taxa de ativação (7% não ativados)"
                      className="pl-8 text-destructive font-semibold" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={-m.activationBreakdown[tier][product]}
                        format="currency"
                        className="text-destructive"
                      />
                    ))}
                    <SpreadsheetCell
                      value={-monthlyData.reduce((sum, m) => sum + m.activationBreakdown[tier][product], 0)}
                      format="currency"
                      className="bg-destructive/20 font-semibold text-destructive"
                    />
                  </div>
                  </>
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}

          {/* CONVERSION RATES SECTION */}
          <div className="flex">
            <RowHeader 
              label="TAXAS DE CONVERSÃO" 
              level="section"
              expanded={expandedSections.conversionRates}
              onToggle={() => toggleSection('conversionRates')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.conversionRates && (
            <>
          <div className="flex row-hover">
            <RowHeader label="% Saber → Executar" tooltip={TOOLTIPS.saberToExecutar} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.saberToExecutar}
                onChange={(v) => updateConversionRate('saberToExecutar', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.saberToExecutar}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Ratio Loyalty" tooltip={TOOLTIPS.executarLoyaltyRatio} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.executarLoyaltyRatio}
                onChange={(v) => updateConversionRate('executarLoyaltyRatio', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.executarLoyaltyRatio}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Duração Loyalty (meses)" tooltip={TOOLTIPS.loyaltyDuration} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.loyaltyDuration}
                onChange={(v) => updateConversionRate('loyaltyDuration', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.loyaltyDuration}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Renovação Loyalty" tooltip={TOOLTIPS.loyaltyRenewalRate} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.loyaltyRenewalRate}
                onChange={(v) => updateConversionRate('loyaltyRenewalRate', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.loyaltyRenewalRate}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Máx Renovações Loyalty" tooltip={TOOLTIPS.loyaltyMaxRenewals} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.loyaltyMaxRenewals}
                onChange={(v) => updateConversionRate('loyaltyMaxRenewals', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.loyaltyMaxRenewals}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Duração No-Loyalty (meses)" tooltip={TOOLTIPS.noLoyaltyDuration} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.noLoyaltyDuration}
                onChange={(v) => updateConversionRate('noLoyaltyDuration', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.noLoyaltyDuration}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Renovação No-Loyalty" tooltip={TOOLTIPS.noLoyaltyRenewalRate} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.noLoyaltyRenewalRate}
                onChange={(v) => updateConversionRate('noLoyaltyRenewalRate', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.noLoyaltyRenewalRate}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Máx Renovações No-Loyalty" tooltip={TOOLTIPS.noLoyaltyMaxRenewals} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.noLoyaltyMaxRenewals}
                onChange={(v) => updateConversionRate('noLoyaltyMaxRenewals', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.noLoyaltyMaxRenewals}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Expansão Carteira" tooltip={TOOLTIPS.expansionRate} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.conversionRates.expansionRate}
                onChange={(v) => updateConversionRate('expansionRate', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.conversionRates.expansionRate}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>
            </>
          )}

          {/* RENEWALS BY TIER/PRODUCT SECTION */}
          <div className="flex">
            <RowHeader 
              label="RENOVAÇÕES POR TIER / PRODUTO" 
              level="section"
              expanded={expandedSections.renewals}
              onToggle={() => toggleSection('renewals')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.renewals && TIERS.map((tier) => (
            <React.Fragment key={`renewals-${tier}`}>
              {/* Tier header */}
              <div className="flex">
                <RowHeader label={TIER_LABELS[tier]} level="tier" tier={tier} />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className={`spreadsheet-cell tier-${tier}`} />
                ))}
              </div>

              {/* Renewals per product */}
              {PRODUCTS.filter(p => p === 'executarNoLoyalty' || p === 'executarLoyalty').map((product) => (
                <React.Fragment key={`renewal-${tier}-${product}`}>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`# Renovações ${PRODUCT_LABELS[product]}`} 
                      tooltip="Quantidade de clientes que renovaram"
                      className="pl-6" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.renewals[tier][product]}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.renewals[tier][product], 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`$ Receita Renovação ${PRODUCT_LABELS[product]}`} 
                      tooltip="Receita de renovação"
                      className="pl-6" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.renewalRevenue[tier][product]}
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.renewalRevenue[tier][product], 0)}
                      format="currency"
                      className="spreadsheet-total"
                    />
                  </div>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}

          {/* CONVERSÕES SABER → EXECUTAR SECTION */}
          <div className="flex">
            <RowHeader 
              label="CONVERSÕES SABER → EXECUTAR" 
              level="section"
              expanded={expandedSections.activeBaseExpansions}
              onToggle={() => toggleSection('activeBaseExpansions')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.activeBaseExpansions && (
            <>
              {/* Conversões Saber → Executar por tier */}
              {TIERS.map((tier) => (
                <React.Fragment key={`saber-executar-${tier}`}>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`# Clientes Saber > Executar ${TIER_LABELS[tier]}`} 
                      tooltip="Clientes Saber que converteram para Executar"
                      className="pl-4" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.conversions[tier].loyalty + m.conversions[tier].noLoyalty}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.conversions[tier].loyalty + m.conversions[tier].noLoyalty, 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`$ Receita Saber > Executar ${TIER_LABELS[tier]}`} 
                      tooltip="Receita gerada pelas conversões Saber → Executar"
                      className="pl-4" 
                    />
                    {monthlyData.map((m, i) => {
                      const metrics = inputs.tierMetrics[tier];
                      const loyaltyTicket = metrics.productTickets.executarLoyalty[m.month] || 0;
                      const noLoyaltyTicket = metrics.productTickets.executarNoLoyalty[m.month] || 0;
                      const loyaltyRev = (m.conversions[tier].loyalty || 0) * loyaltyTicket * inputs.conversionRates.loyaltyDuration;
                      const noLoyaltyRev = (m.conversions[tier].noLoyalty || 0) * noLoyaltyTicket * inputs.conversionRates.noLoyaltyDuration;
                      const totalRev = (loyaltyRev || 0) + (noLoyaltyRev || 0);
                      return (
                        <SpreadsheetCell
                          key={i}
                          value={isNaN(totalRev) ? 0 : totalRev}
                          format="currency"
                        />
                      );
                    })}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => {
                        const metrics = inputs.tierMetrics[tier];
                        const loyaltyTicket = metrics.productTickets.executarLoyalty[m.month] || 0;
                        const noLoyaltyTicket = metrics.productTickets.executarNoLoyalty[m.month] || 0;
                        const loyaltyRev = (m.conversions[tier].loyalty || 0) * loyaltyTicket * inputs.conversionRates.loyaltyDuration;
                        const noLoyaltyRev = (m.conversions[tier].noLoyalty || 0) * noLoyaltyTicket * inputs.conversionRates.noLoyaltyDuration;
                        const totalRev = (loyaltyRev || 0) + (noLoyaltyRev || 0);
                        return sum + (isNaN(totalRev) ? 0 : totalRev);
                      }, 0)}
                      format="currency"
                      className="bg-primary/10 font-semibold"
                    />
                  </div>
                </React.Fragment>
              ))}

              {/* Total Conversion Revenue */}
              <div className="flex row-hover">
                <RowHeader 
                  label="$ Total Receita Conversões" 
                  className="font-semibold"
                />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => {
                      const metrics = inputs.tierMetrics[tier];
                      const loyaltyTicket = metrics.productTickets.executarLoyalty[m.month] || 0;
                      const noLoyaltyTicket = metrics.productTickets.executarNoLoyalty[m.month] || 0;
                      const loyaltyRev = (m.conversions[tier].loyalty || 0) * loyaltyTicket * inputs.conversionRates.loyaltyDuration;
                      const noLoyaltyRev = (m.conversions[tier].noLoyalty || 0) * noLoyaltyTicket * inputs.conversionRates.noLoyaltyDuration;
                      const totalRev = (loyaltyRev || 0) + (noLoyaltyRev || 0);
                      return sum + (isNaN(totalRev) ? 0 : totalRev);
                    }, 0)}
                    format="currency"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => 
                    sum + TIERS.reduce((tSum, tier) => {
                      const metrics = inputs.tierMetrics[tier];
                      const loyaltyTicket = metrics.productTickets.executarLoyalty[m.month] || 0;
                      const noLoyaltyTicket = metrics.productTickets.executarNoLoyalty[m.month] || 0;
                      const loyaltyRev = (m.conversions[tier].loyalty || 0) * loyaltyTicket * inputs.conversionRates.loyaltyDuration;
                      const noLoyaltyRev = (m.conversions[tier].noLoyalty || 0) * noLoyaltyTicket * inputs.conversionRates.noLoyaltyDuration;
                      const totalRev = (loyaltyRev || 0) + (noLoyaltyRev || 0);
                      return tSum + (isNaN(totalRev) ? 0 : totalRev);
                    }, 0), 0)}
                  format="currency"
                  className="spreadsheet-total"
                />
              </div>
            </>
          )}

          {/* EXPANSIONS BY TIER/PRODUCT SECTION */}
          <div className="flex">
            <RowHeader 
              label="EXPANSÕES POR TIER / PRODUTO" 
              level="section"
              expanded={expandedSections.expansions}
              onToggle={() => toggleSection('expansions')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-primary/10" />
            ))}
          </div>

          {expandedSections.expansions && TIERS.map((tier) => (
            <React.Fragment key={`expansions-${tier}`}>
              {/* Tier header */}
              <div className="flex">
                <RowHeader label={TIER_LABELS[tier]} level="tier" tier={tier} />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className={`spreadsheet-cell tier-${tier}`} />
                ))}
              </div>

              {/* Expansions per product */}
              {PRODUCTS.map((product) => (
                <React.Fragment key={`expansion-${tier}-${product}`}>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`# Expansões ${PRODUCT_LABELS[product]}`} 
                      tooltip="Quantidade de clientes em expansão"
                      className="pl-6" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.expansions[tier][product]}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.expansions[tier][product], 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                  <div className="flex row-hover">
                    <RowHeader 
                      label={`$ Receita Expansão ${PRODUCT_LABELS[product]}`} 
                      tooltip="Receita de expansão"
                      className="pl-6" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.expansionRevenue[tier][product]}
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.expansionRevenue[tier][product], 0)}
                      format="currency"
                      className="spreadsheet-total"
                    />
                  </div>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}

          {/* LEGACY BASE SECTION */}
          <div className="flex">
            <RowHeader 
              label="BASE LEGADA" 
              level="section"
              expanded={expandedSections.legacyBase}
              onToggle={() => toggleSection('legacyBase')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-primary/10" />
            ))}
          </div>

          {expandedSections.legacyBase && (
            <>
          <div className="flex row-hover">
            <RowHeader label="% Churn Mensal" tooltip={TOOLTIPS.legacyChurn} />
              {MONTHS.map((_, i) => (
                <SpreadsheetCell
                  key={i}
                  value={inputs.legacyBase.churnRate[i] ?? 0}
                  onChange={(v) => updateLegacyMonthly('churnRate', i, v)}
                  editable
                  format="percentage"
                />
              ))}
              <SpreadsheetCell
                value={(inputs.legacyBase.churnRate.reduce((s, n) => s + n, 0) / 12) || 0}
                format="percentage"
                className="spreadsheet-total"
              />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Expansão Mensal" tooltip={TOOLTIPS.legacyExpansion} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.legacyBase.expansionRate[i] ?? 0}
                onChange={(v) => updateLegacyMonthly('expansionRate', i, v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={(inputs.legacyBase.expansionRate.reduce((s, n) => s + n, 0) / 12) || 0}
              format="percentage"
              className="spreadsheet-total"
            />
          </div>

          {TIERS.map((tier) => (
            <React.Fragment key={`legacy-${tier}`}>
              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - Clientes Iniciais`} tooltip="Valor inicial de clientes (editável apenas no mês 1)" className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.legacyBase[tier].clients}
                    onChange={i === 0 ? (v) => updateLegacyBase(tier, 'clients', v) : undefined}
                    editable={i === 0}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.legacyBase[tier].clients}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - # Clientes Mês a Mês`} tooltip="Quantidade de clientes da base legada após aplicar churn mensal" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.legacyClients[tier]}
                    format="number"
                    className="bg-blue-50/50"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.legacyClients[tier] || 0}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - Receita Inicial`} tooltip="Valor inicial de receita (editável apenas no mês 1)" className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.legacyBase[tier].revenue}
                    onChange={i === 0 ? (v) => updateLegacyBase(tier, 'revenue', v) : undefined}
                    editable={i === 0}
                    format="currency"
                  />
                ))}
                <SpreadsheetCell
                  value={inputs.legacyBase[tier].revenue}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - $ Receita Base Mês a Mês`} tooltip="Receita recorrente da base legada (sem expansão) após aplicar churn" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.legacyRevenue[tier] - m.legacyExpansionRevenue[tier]}
                    format="currency"
                    className="bg-blue-50/50"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + (m.legacyRevenue[tier] - m.legacyExpansionRevenue[tier]), 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - $ Expansão Mês a Mês`} tooltip="Receita de expansão da base legada" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.legacyExpansionRevenue[tier]}
                    format="currency"
                    className="bg-green-50/50"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.legacyExpansionRevenue[tier], 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - $ Receita Total Mês a Mês`} tooltip="Receita total da base legada (base + expansão)" className="pl-6 font-bold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.legacyRevenue[tier]}
                    format="currency"
                    className="spreadsheet-total"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.legacyRevenue[tier], 0)}
                  format="currency"
                  className="bg-primary/10 font-bold"
                />
              </div>

              {/* Expansão por Produto */}
              {PRODUCTS.map((product) => (
                <div key={`${tier}-expansion-${product}`} className="flex row-hover">
                  <RowHeader label={`  → ${PRODUCT_LABELS[product]}`} className="pl-10 text-muted-foreground text-xs" />
                  {monthlyData.map((m, i) => (
                    <SpreadsheetCell
                      key={i}
                      value={m.legacyExpansionByProduct[tier][product]}
                      format="currency"
                      className="text-xs"
                    />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + m.legacyExpansionByProduct[tier][product], 0)}
                    format="currency"
                    className="spreadsheet-total text-xs"
                  />
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Totais Consolidados Base Legada */}
          <div className="flex row-hover spreadsheet-total">
            <RowHeader label="TOTAL # Clientes Base Legada" tooltip="Total de clientes da base legada (todos os tiers)" className="font-bold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => sum + m.legacyClients[tier], 0)}
                format="number"
                className="font-semibold"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="spreadsheet-grand-total"
            />
          </div>

          <div className="flex row-hover spreadsheet-total">
            <RowHeader label="TOTAL $ Receita Base Legada SC" tooltip="Total de receita recorrente da base legada SEM CHURN (sem expansão)" className="font-bold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => sum + m.legacyRevenueBeforeChurn[tier], 0)}
                format="currency"
                className="font-semibold"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.legacyRevenueBeforeChurn[tier], 0), 0)}
              format="currency"
              className="spreadsheet-grand-total"
            />
          </div>

          <div className="flex row-hover spreadsheet-total">
            <RowHeader label="TOTAL $ Receita Base Legada CC" tooltip="Total de receita recorrente da base legada COM CHURN (sem expansão)" className="font-bold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => sum + (m.legacyRevenue[tier] - m.legacyExpansionRevenue[tier]), 0)}
                format="currency"
                className="font-semibold"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.legacyRevenue[tier] - m.legacyExpansionRevenue[tier]), 0), 0)}
              format="currency"
              className="spreadsheet-grand-total"
            />
          </div>

          <div className="flex row-hover spreadsheet-total">
            <RowHeader label="TOTAL $ Expansão Legada" tooltip="Total de receita de expansão da base legada" className="font-bold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0)}
                format="currency"
                className="font-semibold"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0), 0)}
              format="currency"
              className="spreadsheet-grand-total"
            />
          </div>

          <div className="flex row-hover spreadsheet-grand-total">
            <RowHeader label="TOTAL $ Receita Total Base Legada" tooltip="Total geral da receita da base legada (base + expansão)" className="font-bold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={m.totalLegacyRevenue}
                format="currency"
                className="font-bold"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.totalLegacyRevenue, 0)}
              format="currency"
              className="spreadsheet-grand-total text-lg"
            />
          </div>
            </>
          )}

          {/* TOTALS SECTION */}
          <div className="flex">
            <RowHeader 
              label="TOTAIS" 
              level="section"
              expanded={expandedSections.totals}
              onToggle={() => toggleSection('totals')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.totals && (
            <>
          {/* Chart: Total Revenue */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('totalRevenue')}>
            <RowHeader 
              label={`💰 Gráfico: Receita Total`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.totalRevenue ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.totalRevenue && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <TotalRevenueChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          {/* Chart: Revenue By Product */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('revenueByProduct')}>
            <RowHeader 
              label={`📊 Gráfico: Receita por Produto`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.revenueByProduct ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.revenueByProduct && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <RevenueByProductChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          {/* Chart: Revenue By Tier */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('revenueByTier')}>
            <RowHeader 
              label={`📊 Gráfico: Receita por Tier`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.revenueByTier ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.revenueByTier && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <RevenueByTierChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          {/* Detalhamento de Receita Executar */}
          <div className="flex row-hover">
            <RowHeader label="$ Receita Aq. Executar NL" tooltip="Receita de clientes Executar No-Loyalty (aquisição direta)" className="pl-4" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarNoLoyalty, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarNoLoyalty, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Aq. Executar L" tooltip="Receita de clientes Executar Loyalty (aquisição direta)" className="pl-4" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarLoyalty, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarLoyalty, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Base Legada Executar" tooltip="Receita recorrente da base legada (todos Executar)" className="pl-4" />
            {monthlyData.map((m, i) => {
              const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
              const legacyExpansion = TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              return <SpreadsheetCell key={i} value={legacyBase - legacyExpansion} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => {
                const legacyBase = TIERS.reduce((s, tier) => s + m.legacyRevenue[tier], 0);
                const legacyExpansion = TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
                return sum + (legacyBase - legacyExpansion);
              }, 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Renovação Executar" tooltip="Renovações de clientes Executar (continuidade)" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.totalRenewalRevenue} format="currency" />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalRenewalRevenue}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Expansão Executar" tooltip="Expansões (upsell/cross-sell) de clientes Executar" className="pl-4" />
            {monthlyData.map((m, i) => {
              const acquisitionExpansion = m.totalExpansionRevenue;
              const legacyExpansion = TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              return <SpreadsheetCell key={i} value={acquisitionExpansion + legacyExpansion} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => {
                const acquisitionExpansion = m.totalExpansionRevenue;
                const legacyExpansion = TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
                return sum + acquisitionExpansion + legacyExpansion;
              }, 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          {/* Detalhamento de Receita Saber/Ter */}
          <div className="flex row-hover bg-muted/20">
            <RowHeader label="$ Receita Aq. Saber" tooltip="Receita de clientes Saber (aquisição direta - projeto pontual)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].saber, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].saber, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-muted/20">
            <RowHeader label="$ Receita Aq. Ter" tooltip="Receita de clientes Ter (aquisição direta)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].ter, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].ter, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          {/* Totais Consolidados de Receita */}
          <div className="flex row-hover bg-primary/10">
            <RowHeader label="$ Receita Total Saber (All)" tooltip="Toda receita de Saber (aquisição)" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].saber, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].saber, 0), 0)}
              format="currency"
              className="bg-primary/20 font-bold"
            />
          </div>

          <div className="flex row-hover bg-primary/10">
            <RowHeader label="$ Receita Total Ter (All)" tooltip="Toda receita de Ter (aquisição)" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].ter, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].ter, 0), 0)}
              format="currency"
              className="bg-primary/20 font-bold"
            />
          </div>

          <div className="flex row-hover bg-primary/10">
            <RowHeader label="$ Receita Total Executar (All)" tooltip="Toda receita Executar (Loyalty + No-Loyalty + Ter + Legada + Renovação + Expansão)" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              const executarRevenue = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].executarLoyalty 
                + m.revenueByTierProduct[tier].executarNoLoyalty
                + m.revenueByTierProduct[tier].ter, 0);
              const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
              const allExpansions = m.totalExpansionRevenue + TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              const total = executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
              return <SpreadsheetCell key={i} value={total} format="currency" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={(() => {
                return monthlyData.reduce((sum, m) => {
                  const executarRevenue = TIERS.reduce((s, tier) => 
                    s + m.revenueByTierProduct[tier].executarLoyalty 
                    + m.revenueByTierProduct[tier].executarNoLoyalty
                    + m.revenueByTierProduct[tier].ter, 0);
                  const legacyBase = TIERS.reduce((s, tier) => s + m.legacyRevenue[tier], 0);
                  const allExpansions = m.totalExpansionRevenue + TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
                  return sum + executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
                }, 0);
              })()}
              format="currency"
              className="bg-primary/20 font-bold"
            />
          </div>

          {/* Previous year revenue moved to header */}

          <div className="flex row-hover bg-primary/5">
            <RowHeader label="$ RECEITA TOTAL" className="font-bold text-primary text-[11px]" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={m.totalRevenue}
                format="currency"
                className="font-bold text-primary text-[10px]"
              />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalRevenue}
              format="currency"
              className="bg-primary/20 font-bold text-primary text-[11px]"
            />
          </div>

          {/* Chart: Total Clients */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('totalClients')}>
            <RowHeader 
              label={`👥 Gráfico: Clientes Totais`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.totalClients ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.totalClients && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <TotalClientsChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          {/* Detalhamento de Clientes Executar */}
          <div className="flex row-hover">
            <RowHeader label="Total Clientes Aq. Executar NL" tooltip="Clientes Executar No-Loyalty (aquisição direta)" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeClients[tier].executarNoLoyalty, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeClients[tier].executarNoLoyalty, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Total Clientes Aq. Executar L" tooltip="Clientes Executar Loyalty (aquisição direta)" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeClients[tier].executarLoyalty, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeClients[tier].executarLoyalty, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Total Clientes Saber > Executar NL" tooltip="Clientes convertidos de Saber para Executar No-Loyalty" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.conversions[tier].noLoyalty, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].conversions[tier].noLoyalty, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Total Clientes Saber > Executar L" tooltip="Clientes convertidos de Saber para Executar Loyalty" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.conversions[tier].loyalty, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].conversions[tier].loyalty, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Total Clientes Base Legada Executar" tooltip="Clientes da base legada (todos os tiers)" className="pl-4" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.legacyClients[tier], 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {/* Detalhamento de Clientes Saber/Ter */}
          <div className="flex row-hover bg-muted/20">
            <RowHeader label="Total Clientes Aq. Saber" tooltip="Clientes Saber (aquisição direta)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeClients[tier].saber, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeClients[tier].saber, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-muted/20">
            <RowHeader label="Total Clientes Aq. Ter" tooltip="Clientes Ter (aquisição direta)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeClients[tier].ter, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeClients[tier].ter, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-muted/20">
            <RowHeader label="Total Clientes Exp. Saber" tooltip="Clientes de expansão da base ativa (Saber)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeBaseExpansions[tier].saber, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeBaseExpansions[tier].saber, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-muted/20">
            <RowHeader label="Total Clientes Exp. Ter" tooltip="Clientes de expansão da base ativa (Ter)" className="pl-4 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={TIERS.reduce((sum, tier) => sum + m.activeBaseExpansions[tier].ter, 0)} 
                format="number" 
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].activeBaseExpansions[tier].ter, 0) : 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {/* Totais Consolidados */}
          <div className="flex row-hover bg-primary/10">
            <RowHeader label="Total Clientes Saber (All)" tooltip="Todos clientes Saber (aquisição + expansão)" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              const total = TIERS.reduce((sum, tier) => 
                sum + m.activeClients[tier].saber + m.activeBaseExpansions[tier].saber, 0);
              return <SpreadsheetCell key={i} value={total} format="number" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => 
                sum + monthlyData[11].activeClients[tier].saber + monthlyData[11].activeBaseExpansions[tier].saber, 0) : 0}
              format="number"
              className="bg-primary/20 font-bold"
            />
          </div>

          <div className="flex row-hover bg-primary/10">
            <RowHeader label="Total Clientes Ter (All)" tooltip="Todos clientes Ter (aquisição + expansão)" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              const total = TIERS.reduce((sum, tier) => 
                sum + m.activeClients[tier].ter + m.activeBaseExpansions[tier].ter, 0);
              return <SpreadsheetCell key={i} value={total} format="number" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => 
                sum + monthlyData[11].activeClients[tier].ter + monthlyData[11].activeBaseExpansions[tier].ter, 0) : 0}
              format="number"
              className="bg-primary/20 font-bold"
            />
          </div>

          <div className="flex row-hover bg-primary/10">
            <RowHeader label="Total Clientes Executar (All)" tooltip="Todos clientes Executar (aquisição + legada + conversões) + Ter" className="pl-4 font-bold" />
            {monthlyData.map((m, i) => {
              // activeClients de Executar JÁ inclui conversões acumuladas
              const total = TIERS.reduce((sum, tier) => 
                sum + m.activeClients[tier].executarLoyalty + m.activeClients[tier].executarNoLoyalty + 
                m.activeClients[tier].ter + m.legacyClients[tier], 0);
              return <SpreadsheetCell key={i} value={total} format="number" className="font-semibold" />;
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => 
                sum + monthlyData[11].activeClients[tier].executarLoyalty + monthlyData[11].activeClients[tier].executarNoLoyalty + 
                monthlyData[11].activeClients[tier].ter + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="bg-primary/20 font-bold"
            />
          </div>

          <div className="flex row-hover bg-primary/5">
            <RowHeader label="# CLIENTES ATIVOS TOTAL" tooltip="Todos os clientes ativos (legada + aquisição)" className="font-bold text-primary" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={m.totalActiveClients} 
                format="number"
                className="font-bold text-primary"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.totalActiveClients || 0}
              format="number"
              className="bg-primary/20 font-bold text-primary"
            />
          </div>
            </>
          )}

          {/* DETALHAMENTO DE CLIENTES */}
          <div className="flex">
            <RowHeader 
              label="DETALHAMENTO DE CLIENTES" 
              level="section"
              expanded={expandedSections.totalsClients}
              onToggle={() => toggleSection('totalsClients')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-primary/10" />
            ))}
          </div>

          {expandedSections.totalsClients && (
            <>
          {/* Origem dos Clientes Novos */}
          <div className="flex">
            <RowHeader label="Origem dos Clientes (Novos no Mês)" level="tier" tier="medium" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-medium" />
            ))}
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Aquisição (Funil)" tooltip="Clientes novos vindos do funil de vendas" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => 
                  sum + PRODUCTS.reduce((s, product) => s + m.activeClients[tier][product], 0), 0)}
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => 
                sum + TIERS.reduce((tierSum, tier) => 
                  tierSum + PRODUCTS.reduce((s, product) => s + m.activeClients[tier][product], 0), 0), 0)}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Expansão (Clientes Ativos)" tooltip="Clientes de expansão vindos da base ativa" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => 
                  sum + PRODUCTS.reduce((s, product) => s + m.expansions[tier][product], 0), 0)}
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => 
                sum + TIERS.reduce((tierSum, tier) => 
                  tierSum + PRODUCTS.reduce((s, product) => s + m.expansions[tier][product], 0), 0), 0)}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Conversão Saber → Executar" tooltip="Clientes Saber convertidos para Executar após 60 dias" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => 
                  sum + m.conversions[tier].loyalty + m.conversions[tier].noLoyalty, 0)}
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => 
                sum + TIERS.reduce((tierSum, tier) => 
                  tierSum + m.conversions[tier].loyalty + m.conversions[tier].noLoyalty, 0), 0)}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Base Legada" tooltip="Clientes da base legada (diminui com churn)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell
                key={i}
                value={TIERS.reduce((sum, tier) => sum + m.legacyClients[tier], 0)}
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          {/* Clientes por Produto (todos os tiers somados) */}
          <div className="flex">
            <RowHeader label="Clientes por Produto (Aquisição)" level="tier" tier="enterprise" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-enterprise" />
            ))}
          </div>
          {PRODUCTS.map((product) => (
            <div key={`total-product-${product}`} className="flex row-hover">
              <RowHeader label={`# ${PRODUCT_LABELS[product]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell
                  key={i}
                  value={TIERS.reduce((sum, tier) => sum + m.activeClients[tier][product], 0)}
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={monthlyData.reduce((sum, m) => 
                  sum + TIERS.reduce((s, tier) => s + m.activeClients[tier][product], 0), 0)}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}

          {/* Clientes por Tier (todos os produtos somados) */}
          <div className="flex">
            <RowHeader label="Clientes por Tier" level="tier" tier="large" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-large" />
            ))}
          </div>
          {TIERS.map((tier) => (
            <div key={`total-tier-${tier}`} className="flex row-hover">
              <RowHeader label={`# ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell
                  key={i}
                  value={PRODUCTS.reduce((sum, product) => sum + m.activeClients[tier][product], 0)}
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={monthlyData.reduce((sum, m) => 
                  sum + PRODUCTS.reduce((s, product) => s + m.activeClients[tier][product], 0), 0)}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}

          {/* Clientes Ativados (novos) */}
          <div className="flex">
            <RowHeader label="Clientes Ativados (Novos)" level="tier" tier="medium" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-medium" />
            ))}
          </div>
          {TIERS.map((tier) => (
            <div key={`activations-tier-${tier}`} className="flex row-hover">
              <RowHeader label={`# ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell key={i} value={m.activations[tier]} format="number" />
              ))}
              <SpreadsheetCell
                value={monthlyData.reduce((sum, m) => sum + m.activations[tier], 0)}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}

          {/* Total Renovações */}
          <div className="flex">
            <RowHeader label="Total Renovações" level="tier" tier="small" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-small" />
            ))}
          </div>
          {TIERS.map((tier) => (
            <div key={`renewals-tier-${tier}`} className="flex row-hover">
              <RowHeader label={`# ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell
                  key={i}
                  value={PRODUCTS.reduce((sum, product) => sum + m.renewals[tier][product], 0)}
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={monthlyData.reduce((sum, m) => 
                  sum + PRODUCTS.reduce((s, product) => s + m.renewals[tier][product], 0), 0)}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}

          {/* Total Expansões */}
          <div className="flex">
            <RowHeader label="Total Expansões" level="tier" tier="tiny" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-tiny" />
            ))}
          </div>
          {TIERS.map((tier) => (
            <div key={`expansions-tier-${tier}`} className="flex row-hover">
              <RowHeader label={`# ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell
                  key={i}
                  value={PRODUCTS.reduce((sum, product) => sum + m.expansions[tier][product], 0)}
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={monthlyData.reduce((sum, m) => 
                  sum + PRODUCTS.reduce((s, product) => s + m.expansions[tier][product], 0), 0)}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}

          {/* Base Legada */}
          <div className="flex">
            <RowHeader label="Base Legada" level="tier" tier="enterprise" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-enterprise" />
            ))}
          </div>
          {TIERS.map((tier) => (
            <div key={`legacy-tier-${tier}`} className="flex row-hover">
              <RowHeader label={`# ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell key={i} value={m.legacyClients[tier]} format="number" />
              ))}
              <SpreadsheetCell
                value={monthlyData[11]?.legacyClients[tier] || 0}
                format="number"
                className="bg-primary/10 font-semibold"
              />
            </div>
          ))}
            </>
          )}

          {/* CAPACITY PLAN SECTION */}
          <div className="flex">
            <RowHeader 
              label="CAPACITY PLAN" 
              level="section"
              expanded={expandedSections.capacityPlan}
              onToggle={() => toggleSection('capacityPlan')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-primary/10" />
            ))}
          </div>

          {expandedSections.capacityPlan && (
            <>
          {/* Base legada e parâmetros globais da Capacity */}
          <div className="flex row-hover">
            <RowHeader label="Base Legada - HC Saber" tooltip="HC já existente (Saber)" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.initialHCSaber}
                onChange={(v) => updateCapacityScalar('initialHCSaber', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.initialHCSaber}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Base Legada - HC Executar" tooltip="HC já existente (Executar)" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.initialHCExecutar}
                onChange={(v) => updateCapacityScalar('initialHCExecutar', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.initialHCExecutar}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Fator Disponibilidade" tooltip="Fator (0..1) de disponibilidade/eficiência (ex: 0.85)" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.availabilityFactor ?? 0.85}
                onChange={(v) => updateCapacityScalar('availabilityFactor', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.availabilityFactor ?? 0.85}
              format="number"
              className="bg-primary/10"
            />
          </div>
          {/* Parâmetros Coordenação Saber */}
          <div className="flex">
            <RowHeader label="Coordenação Saber - Horas por Cargo/Tier" level="tier" tier="enterprise" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-enterprise" />
            ))}
          </div>

          {/* Role Hours Matrix - Saber */}
          {Object.keys(inputs.capacityPlan.saberSquad.roleHours).map((role) => (
            <React.Fragment key={`saber-role-${role}`}>
              <div className="flex">
                <RowHeader label={role} className="pl-6 font-semibold" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell bg-muted/20" />
                ))}
              </div>
              {TIERS.map((tier) => (
                <div key={`${role}-${tier}`} className="flex row-hover">
                  <RowHeader label={TIER_LABELS[tier]} className="pl-10 text-sm" />
                  {MONTHS.map((_, i) => (
                    <SpreadsheetCell
                      key={i}
                      value={inputs.capacityPlan.saberSquad.roleHours[role][tier]}
                      onChange={(v) => updateRoleHours('saberSquad', role, tier, v)}
                      editable
                      format="number"
                      className="text-sm"
                    />
                  ))}
                  <SpreadsheetCell
                    value={inputs.capacityPlan.saberSquad.roleHours[role][tier]}
                    format="number"
                    className="bg-primary/10 text-sm"
                  />
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Config Coordenação */}
          <div className="flex row-hover">
            <RowHeader label="HC por Coordenação" tooltip="Pessoas por coordenação" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.saberSquad.headcount}
                onChange={(v) => updateCapacityPlan('saberSquad', 'headcount', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.saberSquad.headcount}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Horas Produtivas/Pessoa" tooltip="Horas produtivas mensais" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.saberSquad.productiveHoursPerPerson}
                onChange={(v) => updateCapacityPlan('saberSquad', 'productiveHoursPerPerson', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.saberSquad.productiveHoursPerPerson}
              format="number"
              className="bg-primary/10"
            />
          </div>



          {/* Parâmetros Coordenação Executar */}
          <div className="flex">
            <RowHeader label="Coordenação Executar - Horas por Cargo/Tier" level="tier" tier="large" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-large" />
            ))}
          </div>

          {/* Role Hours Matrix - Executar */}
          {Object.keys(inputs.capacityPlan.executarSquad.roleHours).map((role) => (
            <React.Fragment key={`exec-role-${role}`}>
              <div className="flex">
                <RowHeader label={role} className="pl-6 font-semibold" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell bg-muted/20" />
                ))}
              </div>
              {TIERS.map((tier) => (
                <div key={`${role}-${tier}`} className="flex row-hover">
                  <RowHeader label={TIER_LABELS[tier]} className="pl-10 text-sm" />
                  {MONTHS.map((_, i) => (
                    <SpreadsheetCell
                      key={i}
                      value={inputs.capacityPlan.executarSquad.roleHours[role][tier]}
                      onChange={(v) => updateRoleHours('executarSquad', role, tier, v)}
                      editable
                      format="number"
                      className="text-sm"
                    />
                  ))}
                  <SpreadsheetCell
                    value={inputs.capacityPlan.executarSquad.roleHours[role][tier]}
                    format="number"
                    className="bg-primary/10 text-sm"
                  />
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Config Coordenação */}
          <div className="flex row-hover">
            <RowHeader label="HC por Coordenação" tooltip="Pessoas por coordenação" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.executarSquad.headcount}
                onChange={(v) => updateCapacityPlan('executarSquad', 'headcount', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.executarSquad.headcount}
              format="number"
              className="bg-primary/10"
            />
          </div>



          <div className="flex row-hover">
            <RowHeader label="Horas Produtivas/Pessoa" tooltip="Horas produtivas mensais" className="pl-6 bg-muted/30" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.executarSquad.productiveHoursPerPerson}
                onChange={(v) => updateCapacityPlan('executarSquad', 'productiveHoursPerPerson', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.executarSquad.productiveHoursPerPerson}
              format="number"
              className="bg-primary/10"
            />
          </div>



          {/* Resultados Capacity */}
          <div className="flex">
            <RowHeader label="Resultados" level="tier" tier="medium" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-medium" />
            ))}
          </div>

          {/* Clientes Saber por Tier */}
          {TIERS.map((tier) => (
            <div key={`clients-saber-${tier}`} className="flex row-hover">
              <RowHeader label={`# Clientes Saber ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell key={i} value={m.capacityPlan.clientsSaberByTier[tier]} format="number" />
              ))}
              <SpreadsheetCell
                value={monthlyData[11]?.capacityPlan.clientsSaberByTier[tier] || 0}
                format="number"
                className="bg-primary/10"
              />
            </div>
          ))}

          <div className="flex row-hover">
            <RowHeader label="# Total Clientes Saber" className="pl-6 font-semibold" />
            {monthlyData.map((m, i) => {
              // Vinculado dinamicamente com Total Clientes Saber (All)
              const total = TIERS.reduce((sum, tier) => 
                sum + m.activeClients[tier].saber + m.activeBaseExpansions[tier].saber, 0);
              return <SpreadsheetCell key={i} value={total} format="number" />;
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => 
                sum + monthlyData[11].activeClients[tier].saber + monthlyData[11].activeBaseExpansions[tier].saber, 0) : 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover cursor-pointer" onClick={() => setHoursBreakdown(prev => ({ ...prev, saberHours: !prev.saberHours }))}>
            <RowHeader label="Horas Necessárias" tooltip="Total de horas necessárias para Saber (clique para expandir)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalHoursSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalHoursSaber || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {hoursBreakdown.saberHours && (
            <>
              {/* Breakdown por Tier - Saber */}
              {TIERS.map((tier) => {
                const roleHours = inputs.capacityPlan.saberSquad.roleHours;
                const totalHoursPerClient = Object.values(roleHours).reduce((sum, role) => sum + (role[tier] || 0), 0);
                
                return (
                  <div key={`saber-hours-${tier}`} className="flex row-hover bg-muted/30">
                    <RowHeader 
                      label={`├─ ${TIER_LABELS[tier]} (${totalHoursPerClient}h/cliente)`} 
                      tooltip={`Horas por cliente ${TIER_LABELS[tier]}`}
                      className="pl-10 text-sm text-muted-foreground"
                    />
                    {monthlyData.map((m, i) => {
                      const clients = m.capacityPlan.clientsSaberByTier[tier];
                      const hours = clients * totalHoursPerClient;
                      return <SpreadsheetCell key={i} value={hours} format="number" className="text-sm" />;
                    })}
                    <SpreadsheetCell
                      value={(monthlyData[11]?.capacityPlan.clientsSaberByTier[tier] || 0) * totalHoursPerClient}
                      format="number"
                      className="bg-primary/10 text-sm"
                    />
                  </div>
                );
              })}
            </>
          )}

          <div className="flex row-hover">
            <RowHeader label="# Squads Saber" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.squadsSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.squadsSaber || 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Utilização Saber" tooltip="Percentual de utilização da capacidade (horas)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hoursUtilizationSaber} format="percentage" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.hoursUtilizationSaber || 0}
              format="percentage"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Total Clientes Executar" className="pl-6 font-semibold" />
            {monthlyData.map((m, i) => {
              // Vinculado dinamicamente com Total Clientes Executar (All)
              const total = TIERS.reduce((sum, tier) => 
                sum + m.activeClients[tier].executarLoyalty + m.activeClients[tier].executarNoLoyalty + 
                m.activeClients[tier].ter + m.legacyClients[tier], 0);
              return <SpreadsheetCell key={i} value={total} format="number" />;
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? TIERS.reduce((sum, tier) => 
                sum + monthlyData[11].activeClients[tier].executarLoyalty + monthlyData[11].activeClients[tier].executarNoLoyalty + 
                monthlyData[11].activeClients[tier].ter + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          {/* Clientes Executar por Tier */}
          {TIERS.map((tier) => (
            <div key={`clients-exec-${tier}`} className="flex row-hover">
              <RowHeader label={`# Clientes Exec. ${TIER_LABELS[tier]}`} className="pl-6" />
              {monthlyData.map((m, i) => (
                <SpreadsheetCell key={i} value={m.capacityPlan.clientsExecutarByTier[tier]} format="number" />
              ))}
              <SpreadsheetCell
                value={monthlyData[11]?.capacityPlan.clientsExecutarByTier[tier] || 0}
                format="number"
                className="bg-primary/10"
              />
            </div>
          ))}

          <div className="flex row-hover cursor-pointer" onClick={() => setHoursBreakdown(prev => ({ ...prev, executarHours: !prev.executarHours }))}>
            <RowHeader label="Horas Necessárias Executar" tooltip="Total de horas necessárias para Executar (clique para expandir)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalHoursExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalHoursExecutar || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {hoursBreakdown.executarHours && (
            <>
              {/* Breakdown por Tier - Executar */}
              {TIERS.map((tier) => {
                const roleHours = inputs.capacityPlan.executarSquad.roleHours;
                const totalHoursPerClient = Object.values(roleHours).reduce((sum, role) => sum + (role[tier] || 0), 0);
                
                return (
                  <div key={`exec-hours-${tier}`} className="flex row-hover bg-muted/30">
                    <RowHeader 
                      label={`├─ ${TIER_LABELS[tier]} (${totalHoursPerClient}h/cliente)`} 
                      tooltip={`Horas por cliente ${TIER_LABELS[tier]}`}
                      className="pl-10 text-sm text-muted-foreground"
                    />
                    {monthlyData.map((m, i) => {
                      const clients = m.capacityPlan.clientsExecutarByTier[tier];
                      const hours = clients * totalHoursPerClient;
                      return <SpreadsheetCell key={i} value={hours} format="number" className="text-sm" />;
                    })}
                    <SpreadsheetCell
                      value={(monthlyData[11]?.capacityPlan.clientsExecutarByTier[tier] || 0) * totalHoursPerClient}
                      format="number"
                      className="bg-primary/10 text-sm"
                    />
                  </div>
                );
              })}
            </>
          )}

          <div className="flex row-hover">
            <RowHeader label="# Squads Executar" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.squadsExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.squadsExecutar || 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Utilização Executar" tooltip="Percentual de utilização da capacidade (horas)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hoursUtilizationExecutar} format="percentage" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.hoursUtilizationExecutar || 0}
              format="percentage"
              className="bg-primary/10"
            />
          </div>

          {/* Totais */}
          <div className="flex">
            <RowHeader label="Headcount Total" level="tier" tier="small" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-small" />
            ))}
          </div>

          {/* Chart: Headcount */}
          <div className="flex row-hover cursor-pointer" onClick={() => toggleChart('capacityHC')}>
            <RowHeader 
              label={`📊 Gráfico: Headcount`} 
              className="pl-4 text-primary"
            />
            <div className="spreadsheet-cell flex items-center justify-center text-muted-foreground" style={{ width: 'calc(100px * 13)' }}>
              {showCharts.capacityHC ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <span className="text-xs">Clique para expandir</span>
              )}
            </div>
          </div>
          {showCharts.capacityHC && (
            <div className="flex">
              <div className="spreadsheet-row-header sticky left-0 z-20 bg-card" />
              <div style={{ width: 'calc(100px * 13)' }} className="p-2">
                <CapacityChart monthlyData={monthlyData} />
              </div>
            </div>
          )}

          <div className="flex row-hover">
            <RowHeader label="HC Saber" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hcSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.hcSaber || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="HC Executar" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hcExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.hcExecutar || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-primary/5">
            <RowHeader label="TOTAL HC" className="pl-6 font-bold text-primary" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={m.capacityPlan.totalHC} 
                format="number"
                className="font-bold text-primary"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalHC || 0}
              format="number"
              className="bg-primary/20 font-bold text-primary"
            />
          </div>

          <div className="flex row-hover bg-primary/5">
            <RowHeader label="TOTAL SQUADS" className="pl-6 font-bold text-primary" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell 
                key={i} 
                value={m.capacityPlan.totalSquads} 
                format="number"
                className="font-bold text-primary"
              />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalSquads || 0}
              format="number"
              className="bg-primary/20 font-bold text-primary"
            />
          </div>

          {/* Turnover Section */}
          <div className="flex">
            <RowHeader label="Turnover & Contratações" level="tier" tier="small" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-small" />
            ))}
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Turnover Mensal" tooltip="Taxa de turnover mensal (7%)" className="pl-6" />
            {monthlyData.map((_, i) => (
              <SpreadsheetCell key={i} value={0.07} format="percent" />
            ))}
            <SpreadsheetCell
              value={0.07}
              format="percent"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Turnover Saber" tooltip="Pessoas que saem do time Saber" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.turnoverSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.turnoverSaber, 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Turnover Executar" tooltip="Pessoas que saem do time Executar" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.turnoverExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.turnoverExecutar, 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-destructive/10">
            <RowHeader label="# TOTAL TURNOVER" className="pl-6 font-semibold text-destructive" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalTurnover} format="number" className="text-destructive" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.totalTurnover, 0)}
              format="number"
              className="bg-destructive/20 font-semibold text-destructive"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Contratações Saber" tooltip="Contratações necessárias (crescimento + reposição)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hiresSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.hiresSaber, 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Contratações Executar" tooltip="Contratações necessárias (crescimento + reposição)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.hiresExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.hiresExecutar, 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-green-500/10">
            <RowHeader label="# TOTAL CONTRATAÇÕES" className="pl-6 font-bold text-green-500" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalHires} format="number" className="font-bold text-green-500" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.totalHires, 0)}
              format="number"
              className="bg-green-500/20 font-bold text-green-500"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# GAP REAPROVEITAMENTO (Executar → Saber)" tooltip="Pessoas liberadas em Executar que podem ser realocadas para Saber" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.redeployableFromExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.redeployableFromExecutar, 0)}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover bg-green-500/10">
            <RowHeader label="# TOTAL CONTRATAÇÕES (com realocação)" className="pl-6 font-bold text-green-500" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalHiresWithRedeployment} format="number" className="font-bold text-green-500" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + m.capacityPlan.totalHiresWithRedeployment, 0)}
              format="number"
              className="bg-green-500/20 font-bold text-green-500"
            />
          </div>

          {/* Sales guidance (SDR / Closers) - não contam no totalHC */}
          <div className="flex row-hover">
            <RowHeader label="# Sales: SDR Required" tooltip="Número de SDRs estimado (200 MQL / SDR)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.salesSDRRequired ?? 0} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesSDRRequired ?? 0), 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Sales: Closers Required" tooltip="Número de Closers estimado (50 SAL / Closer)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.salesClosersRequired ?? 0} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesClosersRequired ?? 0), 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Sales: Current SDR" tooltip="SDRs atuais (para comparação)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.salesCurrentSDR ?? 0} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesCurrentSDR ?? 0), 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Sales: Current Closers" tooltip="Closers atuais (para comparação)" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.salesCurrentClosers ?? 0} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesCurrentClosers ?? 0), 0)}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Contratações Sales" tooltip="Orientação de contratações para vendas (SDR+Closer)" className="pl-6 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.salesHires ?? 0} format="number" className="font-semibold" />
            ))}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesHires ?? 0), 0)}
              format="number"
              className="spreadsheet-total"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Saber" tooltip="Receita total do squad Saber (vinculada com Total Saber All)" className="pl-6" />
            {monthlyData.map((m, i) => {
              // Vinculado dinamicamente com $ Receita Total Saber (All)
              const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].saber, 0);
              return <SpreadsheetCell key={i} value={revenue} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].saber, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Executar" tooltip="Receita total do squad Executar (vinculada com Total Executar All)" className="pl-6" />
            {monthlyData.map((m, i) => {
              // Vinculado dinamicamente com $ Receita Total Executar (All)
              const executarRevenue = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].executarLoyalty 
                + m.revenueByTierProduct[tier].executarNoLoyalty
                + m.revenueByTierProduct[tier].ter, 0);
              const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
              const allExpansions = m.totalExpansionRevenue + TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              const total = executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
              return <SpreadsheetCell key={i} value={total} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => {
                const executarRevenue = TIERS.reduce((s, tier) => 
                  s + m.revenueByTierProduct[tier].executarLoyalty 
                  + m.revenueByTierProduct[tier].executarNoLoyalty
                  + m.revenueByTierProduct[tier].ter, 0);
                const legacyBase = TIERS.reduce((s, tier) => s + m.legacyRevenue[tier], 0);
                const allExpansions = m.totalExpansionRevenue + TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
                return sum + executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
              }, 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita/HC Saber" tooltip="Receita Saber dividida pelo HC Saber" className="pl-6" />
            {monthlyData.map((m, i) => {
              const receitaSaber = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].saber, 0);
              const revenuePerHC = m.capacityPlan.hcSaber > 0 ? receitaSaber / m.capacityPlan.hcSaber : 0;
              return <SpreadsheetCell key={i} value={revenuePerHC} format="currency" />;
            })}
            <SpreadsheetCell
              value={(() => {
                const m = monthlyData[11];
                if (!m) return 0;
                const receitaSaber = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].saber, 0);
                return m.capacityPlan.hcSaber > 0 ? receitaSaber / m.capacityPlan.hcSaber : 0;
              })()}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita/HC Executar" tooltip="Receita Executar dividida pelo HC Executar" className="pl-6" />
            {monthlyData.map((m, i) => {
              // Usar mesmo cálculo de $ Receita Total Executar (All)
              const executarRevenue = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].executarLoyalty 
                + m.revenueByTierProduct[tier].executarNoLoyalty
                + m.revenueByTierProduct[tier].ter, 0);
              const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
              const allExpansions = m.totalExpansionRevenue + TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              const receitaExecutar = executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
              const revenuePerHC = m.capacityPlan.hcExecutar > 0 ? receitaExecutar / m.capacityPlan.hcExecutar : 0;
              return <SpreadsheetCell key={i} value={revenuePerHC} format="currency" />;
            })}
            <SpreadsheetCell
              value={(() => {
                const m = monthlyData[11];
                if (!m) return 0;
                const executarRevenue = TIERS.reduce((sum, tier) => 
                  sum + m.revenueByTierProduct[tier].executarLoyalty 
                  + m.revenueByTierProduct[tier].executarNoLoyalty
                  + m.revenueByTierProduct[tier].ter, 0);
                const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
                const allExpansions = m.totalExpansionRevenue + TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
                const receitaExecutar = executarRevenue + legacyBase + m.totalRenewalRevenue + allExpansions;
                return m.capacityPlan.hcExecutar > 0 ? receitaExecutar / m.capacityPlan.hcExecutar : 0;
              })()}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover bg-primary/5">
            <RowHeader label="$ RECEITA/HC TOTAL" tooltip="Receita mensal dividida pelo headcount total" className="pl-6 font-bold text-primary" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.revenuePerHC} format="currency" className="font-bold text-primary" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.revenuePerHC || 0}
              format="currency"
              className="bg-primary/20 font-bold text-primary"
            />
          </div>
            </>
          )}

          {/* DRE SECTION */}
          <div className="flex">
            <RowHeader 
              label="DRE - DEMONSTRATIVO DE RESULTADOS" 
              level="section"
              expanded={expandedSections.dre}
              onToggle={() => toggleSection('dre')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-primary/10" />
            ))}
          </div>

          {expandedSections.dre && (
            <>
              {/* Parâmetros Configuráveis DRE */}
              <div className="flex">
                <RowHeader label="Parâmetros DRE" level="tier" tier="enterprise" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell tier-enterprise" />
                ))}
              </div>

              {/* Switch Linhas Gerenciais */}
              <div className="flex row-hover bg-yellow-500/10">
                <RowHeader label="🔄 Usar Linhas Gerenciais" className="pl-4 font-semibold" tooltip="Ativa/desativa linhas gerenciais (Inadimplência, Churn M0, Churn OPS) no cálculo do DRE. Desativar mostra DRE por competência." />
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell bg-yellow-500/10 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={inputs.dreConfig.usarLinhasGerenciais}
                      onChange={(e) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, usarLinhasGerenciais: e.target.checked } })}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                ))}
                <div className="spreadsheet-cell bg-yellow-500/20 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={inputs.dreConfig.usarLinhasGerenciais}
                    onChange={(e) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, usarLinhasGerenciais: e.target.checked } })}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Inadimplência" className="pl-4" tooltip="Percentual de inadimplência sobre a receita" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.inadimplenciaRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, inadimplenciaRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.inadimplenciaRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Churn M0 Falcons" className="pl-4" tooltip="Percentual de churn no mês 0 (Falcons)" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.churnM0FalconsRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, churnM0FalconsRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.churnM0FalconsRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Churn Recebimento OPS" className="pl-4" tooltip="Percentual de churn no recebimento de OPS" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.churnRecebimentoOPSRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, churnRecebimentoOPSRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.churnRecebimentoOPSRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Devoluções Saber" className="pl-4" tooltip="Percentual de devoluções aplicado sobre a receita de aquisição do produto Saber" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.devolucoesSaberRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, devolucoesSaberRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.devolucoesSaberRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Royalties" className="pl-4" tooltip="Percentual de royalties sobre receita bruta recebida" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.royaltiesRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, royaltiesRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.royaltiesRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Extra Monetizações Executar (Medium)" className="pl-4" tooltip="Adicione manualmente clientes extras por mês para Executar (No-Loyalty) no tier Medium" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.extraExecutarNoLoyaltyMedium || 0, i)}
                    format="number"
                    editable
                    onChange={(val) => {
                      const current = inputs.dreConfig.extraExecutarNoLoyaltyMedium ?? 0;
                      const newValue = Array.isArray(current) ? [...current] : Array(12).fill(current as number);
                      newValue[i] = Math.max(0, Math.round(val));
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, extraExecutarNoLoyaltyMedium: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.extraExecutarNoLoyaltyMedium || 0, 11)} format="number" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% ISS" className="pl-4" tooltip="Imposto sobre Serviços" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.issRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, issRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.issRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% IRRF" className="pl-4" tooltip="Imposto de Renda Retido na Fonte" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.irrfRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, irrfRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.irrfRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% PIS" className="pl-4" tooltip="Programa de Integração Social" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.pisRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, pisRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.pisRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% COFINS" className="pl-4" tooltip="Contribuição para Financiamento da Seguridade Social" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.cofinsRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cofinsRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.cofinsRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Equipe Comercial - SDRs (atuais)" className="pl-4" tooltip="Número atual de SDRs na equipe" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.currentSDR ?? 1}
                    format="number"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, currentSDR: Math.max(0, Math.round(val)) } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.currentSDR ?? 1} format="number" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Equipe Comercial - Closers (atuais)" className="pl-4" tooltip="Número atual de Closers na equipe" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.currentClosers ?? 2}
                    format="number"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, currentClosers: Math.max(0, Math.round(val)) } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.currentClosers ?? 2} format="number" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Despesas Financeiras" className="pl-4" tooltip="Percentual de despesas financeiras sobre receita bruta recebida" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.despesasFinanceirasRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, despesasFinanceirasRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.despesasFinanceirasRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% IRPJ" className="pl-4" tooltip="Imposto de Renda Pessoa Jurídica" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.irpjRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, irpjRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.irpjRate} format="percentage" className="bg-primary/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% CSLL" className="pl-4" tooltip="Contribuição Social sobre o Lucro Líquido" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.dreConfig.csllRate}
                    format="percentage"
                    editable
                    onChange={(val) => onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, csllRate: val } })}
                  />
                ))}
                <SpreadsheetCell value={inputs.dreConfig.csllRate} format="percentage" className="bg-primary/10" />
              </div>

              {/* === SALES CONFIG SECTION === */}
              <div className="flex mt-6">
                <RowHeader 
                  label="CONFIGURAÇÃO COMERCIAL & MARKETING" 
                  level="section"
                  expanded={expandedSections.salesConfig}
                  onToggle={() => toggleSection('salesConfig')}
                />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell bg-primary/10" />
                ))}
              </div>

              {expandedSections.salesConfig && (
                <>
                  {/* Taxas de Comissão */}
                  <div className="flex">
                    <RowHeader label="Taxas de Comissão" level="tier" tier="enterprise" />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell tier-enterprise" />
                    ))}
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Comissão Ativação (%)" className="pl-4" tooltip="Percentual de comissão sobre receita de ativação (novas vendas)" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.comissaoActivationRate}
                        format="percentage"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, comissaoActivationRate: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.comissaoActivationRate} format="percentage" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Comissão Expansion (%)" className="pl-4" tooltip="Percentual de comissão sobre receita de expansão (farmers)" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.comissaoExpansionRate}
                        format="percentage"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, comissaoExpansionRate: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.comissaoExpansionRate} format="percentage" className="bg-primary/10" />
                  </div>

                  {/* Produtividade & Salários - Closers */}
                  <div className="flex mt-2">
                    <RowHeader label="Closers" level="tier" tier="large" />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell tier-large" />
                    ))}
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Produtividade (WONs/mês)" className="pl-4" tooltip="Quantidade de WONs por closer por mês" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.closerProductivity}
                        format="number"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, closerProductivity: Math.max(1, Math.round(val)) } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.closerProductivity} format="number" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Salário Mensal (R$)" className="pl-4" tooltip="Salário mensal por closer" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.closerSalary}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, closerSalary: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.closerSalary} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Produtividade & Salários - SDRs */}
                  <div className="flex mt-2">
                    <RowHeader label="SDRs" level="tier" tier="large" />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell tier-large" />
                    ))}
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Produtividade (SQLs/mês)" className="pl-4" tooltip="Quantidade de SQLs por SDR por mês" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.sdrProductivity}
                        format="number"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, sdrProductivity: Math.max(1, Math.round(val)) } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.sdrProductivity} format="number" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Salário Mensal (R$)" className="pl-4" tooltip="Salário mensal por SDR" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.sdrSalary}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, sdrSalary: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.sdrSalary} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Produtividade & Salários - Farmers */}
                  <div className="flex mt-2">
                    <RowHeader label="Farmers (CS)" level="tier" tier="large" />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell tier-large" />
                    ))}
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Produtividade (Clientes/mês)" className="pl-4" tooltip="Quantidade de clientes ativos por farmer" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.farmerProductivity}
                        format="number"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, farmerProductivity: Math.max(1, Math.round(val)) } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.farmerProductivity} format="number" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Salário Mensal (R$)" className="pl-4" tooltip="Salário mensal por farmer" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.farmerSalary}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, farmerSalary: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.farmerSalary} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Despesas Fixas */}
                  <div className="flex mt-2">
                    <RowHeader label="Despesas Fixas" level="tier" tier="medium" />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell tier-medium" />
                    ))}
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Folha Gestão Comercial" className="pl-4" tooltip="Despesas com gestão comercial" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.folhaGestaoComercial}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, folhaGestaoComercial: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.folhaGestaoComercial * 12} format="currency" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Bônus Campanhas (Activation)" className="pl-4" tooltip="Bônus e campanhas para ativação" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.bonusCampanhasActivation}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, bonusCampanhasActivation: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.bonusCampanhasActivation * 12} format="currency" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Estrutura Suporte" className="pl-4" tooltip="Despesas com estrutura de suporte (varia por mês)" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.estruturaSuporte[i]}
                        format="currency"
                        editable
                        onChange={(val) => {
                          const newArray = [...inputs.salesConfig.estruturaSuporte];
                          newArray[i] = val;
                          onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, estruturaSuporte: newArray } });
                        }}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.estruturaSuporte.reduce((a, b) => a + b, 0)} format="currency" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Despesas Visitas (Activation)" className="pl-4" tooltip="Despesas com visitas para ativação" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.despesasVisitasActivation}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, despesasVisitasActivation: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.despesasVisitasActivation * 12} format="currency" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Bônus Campanhas (Expansion)" className="pl-4" tooltip="Bônus e campanhas para expansão" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.bonusCampanhasExpansion}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, bonusCampanhasExpansion: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.bonusCampanhasExpansion * 12} format="currency" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Comissão Monetização Ops (%)" className="pl-4" tooltip="Percentual aplicado sobre o total de expansão (inclui base legada)" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.comissaoMonetizacaoOpsRate}
                        format="percentage"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, comissaoMonetizacaoOpsRate: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.comissaoMonetizacaoOpsRate} format="percentage" className="bg-primary/10 font-semibold" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="Despesas Visitas (Expansion)" className="pl-4" tooltip="Despesas com visitas para expansão" />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.salesConfig.despesasVisitasExpansion}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({ ...inputs, salesConfig: { ...inputs.salesConfig, despesasVisitasExpansion: val } })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.salesConfig.despesasVisitasExpansion * 12} format="currency" className="bg-primary/10 font-semibold" />
                  </div>
                </>
              )}

              {/* Parâmetros CSP - Squad Model */}
              <div className="flex mt-4">
                <RowHeader label="CSP - Configuração de Squads" level="tier" tier="large" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell tier-large" />
                ))}
              </div>

              {/* SQUAD EXECUTAR - Header */}
              <div className="flex row-hover bg-primary/5">
                <RowHeader label="Squad EXECUTAR - Salários por Cargo" className="pl-4 font-semibold" tooltip="CSP = Squads Necessárias (Capacity Plan) × Custo Total do Squad" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell" />
                ))}
              </div>

              {/* Salários */}
              <div className="flex row-hover">
                <RowHeader label="Coordenador" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarCoordenador, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarCoordenador)
                        ? [...inputs.dreConfig.cspExecutarCoordenador]
                        : Array(12).fill(inputs.dreConfig.cspExecutarCoordenador);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarCoordenador: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarCoordenador, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Account Sr (2x)" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarAccountSr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarAccountSr)
                        ? [...inputs.dreConfig.cspExecutarAccountSr]
                        : Array(12).fill(inputs.dreConfig.cspExecutarAccountSr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarAccountSr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarAccountSr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Gestor Tráfego Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoSr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarGestorTrafegoSr)
                        ? [...inputs.dreConfig.cspExecutarGestorTrafegoSr]
                        : Array(12).fill(inputs.dreConfig.cspExecutarGestorTrafegoSr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarGestorTrafegoSr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoSr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Gestor Tráfego Pl" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoPl, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarGestorTrafegoPl)
                        ? [...inputs.dreConfig.cspExecutarGestorTrafegoPl]
                        : Array(12).fill(inputs.dreConfig.cspExecutarGestorTrafegoPl);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarGestorTrafegoPl: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoPl, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Copywriter Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarCopywriter, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarCopywriter)
                        ? [...inputs.dreConfig.cspExecutarCopywriter]
                        : Array(12).fill(inputs.dreConfig.cspExecutarCopywriter);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarCopywriter: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarCopywriter, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Designer Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarDesignerSr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarDesignerSr)
                        ? [...inputs.dreConfig.cspExecutarDesignerSr]
                        : Array(12).fill(inputs.dreConfig.cspExecutarDesignerSr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarDesignerSr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarDesignerSr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Designer Pl" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarDesignerPl, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarDesignerPl)
                        ? [...inputs.dreConfig.cspExecutarDesignerPl]
                        : Array(12).fill(inputs.dreConfig.cspExecutarDesignerPl);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarDesignerPl: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarDesignerPl, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Social Media" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspExecutarSocialMedia, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspExecutarSocialMedia)
                        ? [...inputs.dreConfig.cspExecutarSocialMedia]
                        : Array(12).fill(inputs.dreConfig.cspExecutarSocialMedia);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspExecutarSocialMedia: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspExecutarSocialMedia, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              {/* Total Squad Executar */}
              <div className="flex row-hover bg-primary/5">
                <RowHeader label="Total Squad Executar (mensal)" className="pl-8 font-semibold" />
                {[...Array(12)].map((_, i) => {
                  const total = getMonthlyValue(inputs.dreConfig.cspExecutarCoordenador, i) +
                                (getMonthlyValue(inputs.dreConfig.cspExecutarAccountSr, i) * 2) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoSr, i) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoPl, i) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarCopywriter, i) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarDesignerSr, i) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarDesignerPl, i) +
                                getMonthlyValue(inputs.dreConfig.cspExecutarSocialMedia, i);
                  return (
                    <SpreadsheetCell
                      key={i}
                      value={total}
                      format="currency"
                      className="font-semibold"
                    />
                  );
                })}
                <SpreadsheetCell 
                  value={getMonthlyValue(inputs.dreConfig.cspExecutarCoordenador, 11) +
                        (getMonthlyValue(inputs.dreConfig.cspExecutarAccountSr, 11) * 2) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoSr, 11) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarGestorTrafegoPl, 11) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarCopywriter, 11) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarDesignerSr, 11) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarDesignerPl, 11) +
                        getMonthlyValue(inputs.dreConfig.cspExecutarSocialMedia, 11)} 
                  format="currency" 
                  className="bg-primary/10 font-semibold" 
                />
              </div>

              {/* SQUAD SABER - Header */}
              <div className="flex row-hover bg-primary/5 mt-2">
                <RowHeader label="Squad SABER - Salários por Cargo" className="pl-4 font-semibold" tooltip="CSP = Squads Necessárias (Capacity Plan) × Custo Total do Squad" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell" />
                ))}
              </div>

              {/* Salários */}
              <div className="flex row-hover">
                <RowHeader label="Coordenador" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberCoordenador, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberCoordenador)
                        ? [...inputs.dreConfig.cspSaberCoordenador]
                        : Array(12).fill(inputs.dreConfig.cspSaberCoordenador);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberCoordenador: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberCoordenador, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Account Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberAccountSr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberAccountSr)
                        ? [...inputs.dreConfig.cspSaberAccountSr]
                        : Array(12).fill(inputs.dreConfig.cspSaberAccountSr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberAccountSr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberAccountSr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Account Pl" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberAccountPl, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberAccountPl)
                        ? [...inputs.dreConfig.cspSaberAccountPl]
                        : Array(12).fill(inputs.dreConfig.cspSaberAccountPl);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberAccountPl: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberAccountPl, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Account Jr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberAccountJr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberAccountJr)
                        ? [...inputs.dreConfig.cspSaberAccountJr]
                        : Array(12).fill(inputs.dreConfig.cspSaberAccountJr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberAccountJr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberAccountJr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Gestor Tráfego Pl" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberGestorTrafegoPl, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberGestorTrafegoPl)
                        ? [...inputs.dreConfig.cspSaberGestorTrafegoPl]
                        : Array(12).fill(inputs.dreConfig.cspSaberGestorTrafegoPl);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberGestorTrafegoPl: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberGestorTrafegoPl, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Copywriter Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberCopywriter, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberCopywriter)
                        ? [...inputs.dreConfig.cspSaberCopywriter]
                        : Array(12).fill(inputs.dreConfig.cspSaberCopywriter);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberCopywriter: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberCopywriter, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Designer Sr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberDesignerSr, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberDesignerSr)
                        ? [...inputs.dreConfig.cspSaberDesignerSr]
                        : Array(12).fill(inputs.dreConfig.cspSaberDesignerSr);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberDesignerSr: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberDesignerSr, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Tech (part-time)" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberTech, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberTech)
                        ? [...inputs.dreConfig.cspSaberTech]
                        : Array(12).fill(inputs.dreConfig.cspSaberTech);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberTech: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberTech, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Sales Enablement Jr" className="pl-8" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspSaberSalesEnablement, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspSaberSalesEnablement)
                        ? [...inputs.dreConfig.cspSaberSalesEnablement]
                        : Array(12).fill(inputs.dreConfig.cspSaberSalesEnablement);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspSaberSalesEnablement: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspSaberSalesEnablement, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              {/* Total Squad Saber */}
              <div className="flex row-hover bg-primary/5">
                <RowHeader label="Total Squad Saber (mensal)" className="pl-8 font-semibold" />
                {[...Array(12)].map((_, i) => {
                  const total = getMonthlyValue(inputs.dreConfig.cspSaberCoordenador, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberAccountSr, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberAccountPl, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberAccountJr, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberGestorTrafegoPl, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberCopywriter, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberDesignerSr, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberTech, i) +
                                getMonthlyValue(inputs.dreConfig.cspSaberSalesEnablement, i);
                  return (
                    <SpreadsheetCell
                      key={i}
                      value={total}
                      format="currency"
                      className="font-semibold"
                    />
                  );
                })}
                <SpreadsheetCell 
                  value={getMonthlyValue(inputs.dreConfig.cspSaberCoordenador, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberAccountSr, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberAccountPl, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberAccountJr, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberGestorTrafegoPl, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberCopywriter, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberDesignerSr, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberTech, 11) +
                        getMonthlyValue(inputs.dreConfig.cspSaberSalesEnablement, 11)} 
                  format="currency" 
                  className="bg-primary/10 font-semibold" 
                />
              </div>

              {/* OUTROS CSP */}
              <div className="flex row-hover bg-primary/5 mt-2">
                <RowHeader label="Outros CSP" className="pl-4 font-semibold" />
                {[...Array(13)].map((_, i) => (
                  <div key={i} className="spreadsheet-cell" />
                ))}
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSS Web Products" className="pl-8" tooltip="Custo fixo de 23k/mês" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspCssWebProducts, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspCssWebProducts)
                        ? [...inputs.dreConfig.cspCssWebProducts]
                        : Array(12).fill(inputs.dreConfig.cspCssWebProducts);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspCssWebProducts: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspCssWebProducts, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Gerentes" className="pl-8" tooltip="Rampa trimestral de 60k a 90k" />
                {[...Array(12)].map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={getMonthlyValue(inputs.dreConfig.cspGerentes, i)}
                    format="currency"
                    editable
                    onChange={(val) => {
                      const newValue = Array.isArray(inputs.dreConfig.cspGerentes)
                        ? [...inputs.dreConfig.cspGerentes]
                        : Array(12).fill(inputs.dreConfig.cspGerentes);
                      newValue[i] = val;
                      onUpdate({ ...inputs, dreConfig: { ...inputs.dreConfig, cspGerentes: newValue } });
                    }}
                  />
                ))}
                <SpreadsheetCell value={getMonthlyValue(inputs.dreConfig.cspGerentes, 11)} format="currency" className="bg-primary/10 font-semibold" />
              </div>

              {/* ========== RECEITA ========== */}
              <div className="flex row-hover bg-primary/5 mt-4">
                <RowHeader label="REVENUE" className="pl-4 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.revenue} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.revenue, 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Receita Executar" className="pl-6" tooltip="Receita Executar mês a mês. Respeita 'Usar Linhas Gerenciais' (DFC) quando ativado." />
                {monthlyData.map((m, i) => {
                  // Sum activation DFCs when using managerial lines
                  const activationsDFC = (m.dre.activationExecutarLoyaltyDFC || 0)
                    + (m.dre.activationExecutarNoLoyaltyDFC || 0)
                    + (m.dre.activationSaberConvLoyaltyDFC || 0)
                    + (m.dre.activationSaberConvNoLoyaltyDFC || 0);

                  // Sum expansions and legacy expansions for Executar (product-level)
                  const expansionsExecutar = TIERS.reduce((s, tier) => s
                    + (m.expansionRevenue?.[tier]?.executarLoyalty || 0)
                    + (m.expansionRevenue?.[tier]?.executarNoLoyalty || 0), 0);

                  // Allocate legacy base revenue to Executar: use total legacy revenue per tier
                  const legacyBaseExecutar = TIERS.reduce((s, tier) => s + (m.legacyRevenue?.[tier] || 0), 0);

                  if (inputs.dreConfig.usarLinhasGerenciais) {
                    // activations (DFC) + current expansions + full legacy base (legacyRevenue already includes legacy expansions)
                    const valor = activationsDFC + expansionsExecutar + legacyBaseExecutar;
                    return <SpreadsheetCell key={i} value={valor} format="currency" />;
                  }

                  // Fallback: competence view — product revenue + current expansions + full legacy base
                  const revenueExecutar = TIERS.reduce((s, tier) => s
                    + (m.revenueByTierProduct?.[tier]?.executarLoyalty || 0)
                    + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty || 0), 0);
                  const valor = revenueExecutar + expansionsExecutar + legacyBaseExecutar;
                  return <SpreadsheetCell key={i} value={valor} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => {
                    const activationsDFC = (m.dre.activationExecutarLoyaltyDFC || 0)
                      + (m.dre.activationExecutarNoLoyaltyDFC || 0)
                      + (m.dre.activationSaberConvLoyaltyDFC || 0)
                      + (m.dre.activationSaberConvNoLoyaltyDFC || 0);

                    const expansionsExecutar = TIERS.reduce((s, tier) => s
                      + (m.expansionRevenue?.[tier]?.executarLoyalty || 0)
                      + (m.expansionRevenue?.[tier]?.executarNoLoyalty || 0), 0);

                    const legacyExpansionsExecutar = TIERS.reduce((s, tier) => s
                      + (m.legacyExpansionByProduct?.[tier]?.executarLoyalty || 0)
                      + (m.legacyExpansionByProduct?.[tier]?.executarNoLoyalty || 0), 0);

                    if (inputs.dreConfig.usarLinhasGerenciais) {
                      return sum + activationsDFC + expansionsExecutar + legacyExpansionsExecutar;
                    }

                    const revenueExecutar = TIERS.reduce((s, tier) => s
                      + (m.revenueByTierProduct?.[tier]?.executarLoyalty || 0)
                      + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty || 0), 0);
                    return sum + revenueExecutar + expansionsExecutar + legacyExpansionsExecutar;
                  }, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              

              {/* Receita Ativação (explícita para facilitar ROAS) */}
              <div className="flex row-hover">
                <RowHeader label="Receita Ativação" className="pl-6" tooltip="Receita total de ativações usada para calcular ROAS" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.receitaAtivacao ?? m.dre.activationRevenue} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + (m.dre.receitaAtivacao ?? m.dre.activationRevenue), 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* ROAS ATIVAÇÃO: receita ativação / investimento aplicado (amortizado se usar linhas gerenciais) */}
              <div className="flex row-hover">
                <RowHeader label="ROAS ATIVAÇÃO" className="pl-6" tooltip="Receita por R$ investido em marketing (ativações)" />
                {monthlyData.map((m, i) => {
                  const receita = m.dre.receitaAtivacao ?? m.dre.activationRevenue;
                  const invest = m.dre.investimentoMarketingAplicado ?? inputs.topline.investmentMonthly[i] ?? 0;
                  const value = invest > 0 ? receita / invest : 0;
                  return <SpreadsheetCell key={i} value={value} format="number" />;
                })}
                <SpreadsheetCell
                  value={(() => {
                    const totalReceita = monthlyData.reduce((s, m) => s + (m.dre.receitaAtivacao ?? m.dre.activationRevenue), 0);
                    const totalInvest = monthlyData.reduce((s, m, idx) => s + (m.dre.investimentoMarketingAplicado ?? inputs.topline.investmentMonthly[idx] ?? 0), 0);
                    return totalInvest > 0 ? totalReceita / totalInvest : 0;
                  })()}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              {/* Detalhamento Activation - Condicional baseado em usarLinhasGerenciais */}
              {inputs.dreConfig.usarLinhasGerenciais ? (
                <>
                  {/* Visão DFC */}
                  <div className="flex row-hover bg-primary/5">
                    <RowHeader label="📊 Visão DFC (Recebimento Mensal)" className="pl-8 text-xs italic text-white" tooltip="Receita distribuída por competência de recebimento mensal" />
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell bg-primary/10 text-white" />
                    ))}
                    <div className="spreadsheet-cell bg-primary/20 text-white" />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Executar Loyalty (Aquisição)" className="pl-12" tooltip="DFC: Receita mensal de Executar Loyalty - aquisição direta" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.activationExecutarLoyaltyDFC} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.activationExecutarLoyaltyDFC, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Executar No-Loyalty (Aquisição)" className="pl-12" tooltip="DFC: Receita mensal de Executar No-Loyalty - aquisição direta" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.activationExecutarNoLoyaltyDFC} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.activationExecutarNoLoyaltyDFC, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Saber→Executar Loyalty (Conversão)" className="pl-12" tooltip="DFC: Receita mensal de conversão Saber para Executar Loyalty" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.activationSaberConvLoyaltyDFC} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.activationSaberConvLoyaltyDFC, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Saber→Executar No-Loyalty (Conversão)" className="pl-12" tooltip="DFC: Receita mensal de conversão Saber para Executar No-Loyalty" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.activationSaberConvNoLoyaltyDFC} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.activationSaberConvNoLoyaltyDFC, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Outros Produtos (Saber, Ter, Potenc.)" className="pl-12" tooltip="Receita de Saber, Ter e Potencializar (sem mudança)" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.activationOutrosProdutos} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.activationOutrosProdutos, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Visão de Competência (original) */}
                  <div className="flex row-hover bg-black">
                    <RowHeader label="📈 Visão Competência (Total no Mês)" className="pl-8 text-xs italic text-white" tooltip="Receita total bookada no mês de venda" />
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="spreadsheet-cell bg-black text-white" />
                    ))}
                    <div className="spreadsheet-cell bg-black text-white" />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Executar Loyalty" className="pl-12" tooltip="Receita total Executar Loyalty (7 meses) no mês de venda" />
                    {monthlyData.map((m, i) => {
                      const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarLoyalty, 0);
                      return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                    })}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarLoyalty, 0), 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                  
                  <div className="flex row-hover">
                    <RowHeader label="Executar No-Loyalty" className="pl-12" tooltip="Receita total Executar No-Loyalty (2 meses) no mês de venda" />
                    {monthlyData.map((m, i) => {
                      const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarNoLoyalty, 0);
                      return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                    })}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarNoLoyalty, 0), 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                </>
              )}

              <div className="flex row-hover">
                <RowHeader label="Renewal" className="pl-6" tooltip="Receita de renovações" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.renewalRevenue} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.renewalRevenue, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Expansion" className="pl-6" tooltip="Receita de expansões" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.expansionRevenue} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.expansionRevenue, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Legacy Revenue" className="pl-6" tooltip="Receita da base legada" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.legacyRevenue} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.legacyRevenue, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== DEDUÇÕES ========== */}
              {inputs.dreConfig.usarLinhasGerenciais && (
                <>
                  <div className="flex row-hover mt-4">
                    <RowHeader label="(-) Inadimplência" className="pl-6" tooltip={`${(inputs.dreConfig.inadimplenciaRate * 100).toFixed(1)}% sobre Revenue`} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.inadimplencia} format="currency" className="text-destructive" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.inadimplencia, 0)}
                      format="currency"
                      className="bg-primary/10 text-destructive"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Churn M0 Falcons" className="pl-6" tooltip={`${(inputs.dreConfig.churnM0FalconsRate * 100).toFixed(1)}% sobre Revenue`} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.churnM0Falcons} format="currency" className="text-destructive" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.churnM0Falcons, 0)}
                      format="currency"
                      className="bg-primary/10 text-destructive"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Churn Recebimento OPS" className="pl-6" tooltip={`${(inputs.dreConfig.churnRecebimentoOPSRate * 100).toFixed(1)}% sobre Revenue`} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.churnRecebimentoOPS} format="currency" className="text-destructive" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.churnRecebimentoOPS, 0)}
                      format="currency"
                      className="bg-primary/10 text-destructive"
                    />
                  </div>

                  {/* Devoluções Saber (moved below to be always visible) */}

                  <div className="flex row-hover">
                    <RowHeader label="(%) Performance Conversão" className="pl-6" tooltip="Percentual efetivamente recebido após deduções" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.performanceConversao} format="percentage" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData[0]?.dre.performanceConversao || 0}
                      format="percentage"
                      className="bg-primary/10"
                    />
                  </div>
                </>
              )}

                  {/* Devoluções Saber (sempre visível e aplicada) */}
                  <div className="flex row-hover">
                    <RowHeader label="(-) Devoluções Saber" className="pl-6" tooltip={`${((inputs.dreConfig.devolucoesSaberRate ?? 0) * 100).toFixed(1)}% sobre Receita Saber (aquisição)`} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.devolucoesSaber} format="currency" className="text-destructive" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.devolucoesSaber, 0)}
                      format="currency"
                      className="bg-primary/10 text-destructive"
                    />
                  </div>

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="(=) RECEITA BRUTA" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.receitaBrutaRecebida} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.receitaBrutaRecebida, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              {/* ========== TRIBUTOS ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) ROYALTS" className="pl-6" tooltip={`${(inputs.dreConfig.royaltiesRate * 100).toFixed(1)}% sobre Receita Bruta Recebida`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.royalties} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.royalties, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) IMPOSTOS" className="pl-6 font-semibold" tooltip="ISS + IRRF + PIS + COFINS" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.totalImpostos} format="currency" className="font-semibold text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.totalImpostos, 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) ISS" className="pl-12" tooltip={`${(inputs.dreConfig.issRate * 100).toFixed(2)}%`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.iss} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.iss, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) IRRF" className="pl-12" tooltip={`${(inputs.dreConfig.irrfRate * 100).toFixed(2)}%`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.irrf} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.irrf, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) PIS" className="pl-12" tooltip={`${(inputs.dreConfig.pisRate * 100).toFixed(2)}%`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.pis} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.pis, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) COFINS" className="pl-12" tooltip={`${(inputs.dreConfig.cofinsRate * 100).toFixed(2)}%`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cofins} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cofins, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="(=) RECEITA LÍQUIDA" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.receitaLiquida} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              {/* ========== CSP ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) CUSTO SERVIÇO PRESTADO" className="pl-6 font-semibold" tooltip="Custo total de delivery (Executar + Saber + Ter)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspTotal} format="currency" className="font-semibold text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspTotal, 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% CSP" className="pl-10" tooltip="Percentual do CSP sobre Receita Líquida" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.percentualCSP} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspTotal, 0) / monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP EXECUTAR" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspExecutar} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspExecutar, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP Direto" className="pl-12" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspExecutarDireto} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspExecutarDireto, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP Overhead" className="pl-12" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspExecutarOverhead} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspExecutarOverhead, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP SABER" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspSaber} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspSaber, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP Direto" className="pl-12" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspSaberDireto} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspSaberDireto, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP Overhead" className="pl-12" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspSaberOverhead} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspSaberOverhead, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP TER" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cspTer} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.cspTer, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Comissão Operação" className="pl-12" tooltip="Comissão de monetização (movida para CSP)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.comissaoOperacao} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.comissaoOperacao, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP CSS e Web Products" className="pl-10" tooltip="Custos com CSS e produtos web" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={getMonthlyValue(inputs.dreConfig.cspCssWebProducts, i)} format="currency" />
                ))}
                <SpreadsheetCell
                  value={Array.from({ length: 12 }, (_, i) => getMonthlyValue(inputs.dreConfig.cspCssWebProducts, i)).reduce((sum, v) => sum + v, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CSP Gerentes" className="pl-10" tooltip="Custos com gerentes (incluídos no CSP Total)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={getMonthlyValue(inputs.dreConfig.cspGerentes, i)} format="currency" />
                ))}
                <SpreadsheetCell
                  value={Array.from({ length: 12 }, (_, i) => getMonthlyValue(inputs.dreConfig.cspGerentes, i)).reduce((sum, v) => sum + v, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== MARGEM OPERACIONAL ========== */}
              <div className="flex row-hover bg-primary/10 mt-2">
                <RowHeader label="(=) MARGEM OPERACIONAL" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.margemOperacional} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.margemOperacional, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Margem Operacional" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.percentualMargemOperacional} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.margemOperacional, 0) / monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== MARKETING E VENDAS ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) Despesas Marketing e Vendas" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => {
                  const investmentDisplay = inputs.dreConfig.usarLinhasGerenciais
                    ? m.dre.investimentoMarketingAmortizado
                    : inputs.topline.investmentMonthly[i];
                  return (
                    <SpreadsheetCell
                      key={i}
                      value={investmentDisplay + m.dre.salesMetrics.totalDespesasMarketingVendas}
                      format="currency"
                      className="font-bold text-destructive"
                    />
                  );
                })}
                <SpreadsheetCell
                  value={(inputs.dreConfig.usarLinhasGerenciais
                    ? monthlyData.reduce((s, m) => s + (m.dre.investimentoMarketingAmortizado || 0), 0)
                    : inputs.topline.investmentMonthly.reduce((sum, v) => sum + v, 0)) + monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.totalDespesasMarketingVendas, 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Investimento Marketing" className="pl-10" tooltip="Investimento em aquisição de leads (do BP)" />
                {monthlyData.map((m, i) => {
                  const investmentDisplay = inputs.dreConfig.usarLinhasGerenciais
                    ? m.dre.investimentoMarketingAmortizado
                    : inputs.topline.investmentMonthly[i];
                  return <SpreadsheetCell key={i} value={investmentDisplay} format="currency" />;
                })}
                <SpreadsheetCell
                  value={inputs.dreConfig.usarLinhasGerenciais
                    ? monthlyData.reduce((s, m) => s + (m.dre.investimentoMarketingAmortizado || 0), 0)
                    : inputs.topline.investmentMonthly.reduce((sum, v) => sum + v, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* Despesas Comerciais - Breakdown Detalhado */}
              <div className="flex row-hover">
                <RowHeader label="(-) Despesas Comerciais" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.totalDespesasMarketingVendas} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.totalDespesasMarketingVendas, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* Activation Breakdown */}
              <div className="flex row-hover">
                <RowHeader label="Activation" className="pl-12 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.despesaComercialActivation} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.despesaComercialActivation, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Closers" className="pl-14" tooltip="Remuneração closers = Quantidade × Salário" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell 
                    key={i} 
                    value={m.dre.salesMetrics.remuneracaoCloser} 
                    format="currency"
                    tooltip={`${m.dre.salesMetrics.closersRequired} closers × R$ ${inputs.salesConfig.closerSalary.toLocaleString('pt-BR')}`}
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.remuneracaoCloser, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="SDRs" className="pl-14" tooltip="Remuneração SDRs = Quantidade × Salário" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell 
                    key={i} 
                    value={m.dre.salesMetrics.remuneracaoSDR} 
                    format="currency"
                    tooltip={`${m.dre.salesMetrics.sdrsRequired} SDRs × R$ ${inputs.salesConfig.sdrSalary.toLocaleString('pt-BR')}`}
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.remuneracaoSDR, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Comissão Ativação" className="pl-14" tooltip={`${(inputs.salesConfig.comissaoActivationRate * 100).toFixed(1)}% sobre receita de ativação`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.comissaoVendasActivation} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.comissaoVendasActivation, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Bônus Campanhas" className="pl-14" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.bonusCampanhasActivation} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.bonusCampanhasActivation, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Despesas Visitas" className="pl-14" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.despesasVisitasActivation} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.despesasVisitasActivation, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Estrutura Suporte" className="pl-14" tooltip="Despesas com estrutura de suporte (variável por mês)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.estruturaSuporte} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.estruturaSuporte, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* Expansion Breakdown */}
              <div className="flex row-hover">
                <RowHeader label="Expansion" className="pl-12 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.despesaComercialExpansion} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.despesaComercialExpansion, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Farmers (CS)" className="pl-14" tooltip="Remuneração farmers = Quantidade × Salário" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell 
                    key={i} 
                    value={m.dre.salesMetrics.remuneracaoFarmer} 
                    format="currency"
                    tooltip={`${m.dre.salesMetrics.farmersRequired} farmers × R$ ${inputs.salesConfig.farmerSalary.toLocaleString('pt-BR')}`}
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.remuneracaoFarmer, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Comissão Farmer" className="pl-14" tooltip={`${(inputs.salesConfig.comissaoExpansionRate * 100).toFixed(1)}% sobre receita de expansão`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.comissaoFarmerExpansion} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.comissaoFarmerExpansion, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Bônus Campanhas" className="pl-14" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.bonusCampanhasExpansion} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.bonusCampanhasExpansion, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              

              <div className="flex row-hover">
                <RowHeader label="Despesas Visitas" className="pl-14" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.despesasVisitasExpansion} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.despesasVisitasExpansion, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* Estruturas Fixas */}
              <div className="flex row-hover">
                <RowHeader label="Folha Gestão Comercial" className="pl-12" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.salesMetrics.folhaGestaoComercial} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.salesMetrics.folhaGestaoComercial, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== MARGEM DE CONTRIBUIÇÃO ========== */}
              <div className="flex row-hover bg-primary/10 mt-2">
                <RowHeader label="(=) MARGEM DE CONTRIBUIÇÃO" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.margemContribuicao} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.margemContribuicao, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Margem Contribuição" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.percentualMargemContribuicao} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.margemContribuicao, 0) / monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== DESPESAS ADMINISTRATIVAS ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) Despesas Administrativas" className="pl-6 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.totalDespesasAdm} format="currency" className="font-semibold text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.totalDespesasAdm, 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold text-destructive"
                />
              </div>

              {inputs.dreConfig.despesasAdmDetalhadas ? (
                <>
                  {/* Ordered detailed Despesas Administrativas per requested sequence */}
                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Time Adm" className="pl-10" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasTimeAdm} format="currency" />
                    ))}
                    <SpreadsheetCell value={monthlyData.reduce((sum, m) => sum + m.dre.despesasTimeAdm, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Time sub-lines */}
                  {['timePG','timeFinanceiro','timePP'].map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-12" />
                      {MONTHS.map((_, i) => (
                        <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />
                      ))}
                      <SpreadsheetCell value={MONTHS.reduce((s, _, i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Custos Adm" className="pl-10" />
                    {monthlyData.map((m,i) => <SpreadsheetCell key={i} value={m.dre.despesasCustosAdm} format="currency" />)}
                    <SpreadsheetCell value={monthlyData.reduce((s,m) => s + m.dre.despesasCustosAdm, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Custos sub-line Seguro Empresa */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('seguroEmpresa')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('seguroEmpresa', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('seguroEmpresa', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('seguroEmpresa', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Tech Remuneração" className="pl-10" />
                    {MONTHS.map((_, i) => (
                      <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('techRemuneracao', i) || 0} format="currency" editable onChange={(v) => updateDespesaDetalhada('techRemuneracao', i, v)} />
                    ))}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + (getDespesaDetalhadaValue('techRemuneracao', i) || 0), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Utilities" className="pl-10" />
                    {monthlyData.map((m,i) => <SpreadsheetCell key={i} value={m.dre.despesasUtilities} format="currency" />)}
                    <SpreadsheetCell value={monthlyData.reduce((s,m) => s + m.dre.despesasUtilities, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Utilities São Paulo and children */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('utilitiesSaoPaulo')} className="pl-12" />
                    {MONTHS.map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={
                          getDespesaDetalhadaValue('utilitiesSaoPaulo', i) || (
                            (getDespesaDetalhadaValue('aluguelV4House', i) || 0) +
                            (getDespesaDetalhadaValue('aluguelPaulista', i) || 0) +
                            (getDespesaDetalhadaValue('aguaPaulista', i) || 0) +
                            (getDespesaDetalhadaValue('limpezaPaulista', i) || 0) +
                            (getDespesaDetalhadaValue('facilites', i) || 0)
                          )
                        }
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={MONTHS.reduce((s, _, i) =>
                        s + (getDespesaDetalhadaValue('utilitiesSaoPaulo', i) || (
                          (getDespesaDetalhadaValue('aluguelV4House', i) || 0) +
                          (getDespesaDetalhadaValue('aluguelPaulista', i) || 0) +
                          (getDespesaDetalhadaValue('aguaPaulista', i) || 0) +
                          (getDespesaDetalhadaValue('limpezaPaulista', i) || 0) +
                          (getDespesaDetalhadaValue('facilites', i) || 0)
                        )), 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  {['aluguelV4House','aluguelPaulista','aguaPaulista','limpezaPaulista','facilites'].map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-14" />
                      {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />)}
                      <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}

                  {/* Office V4 Camp */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('officeV4Camp')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('officeV4Camp', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('officeV4Camp', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('officeV4Camp', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Aluguel Conteiner */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('aluguelConteiner')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('aluguelConteiner', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('aluguelConteiner', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('aluguelConteiner', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Office Campinas */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('officeCampinas')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('officeCampinas', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('officeCampinas', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('officeCampinas', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Office Poa */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('officePoa')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('officePoa', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('officePoa', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('officePoa', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Flagship */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('flagship')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('flagship', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('flagship', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('flagship', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Pessoas aggregate */}
                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Pessoas" className="pl-10" />
                    {monthlyData.map((m,i) => <SpreadsheetCell key={i} value={m.dre.despesasPessoas} format="currency" />)}
                    <SpreadsheetCell value={monthlyData.reduce((s,m) => s + m.dre.despesasPessoas, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Pessoas sub-lines in requested order */}
                  {['officePaulistaAjuda','officeV4CampAjuda','flagshipAjuda','campinasAjuda','ifood','odonto','transfer','saude','socios'].map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-12" />
                      {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />)}
                      <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}

                  {/* Endomarketing */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('endomarketing')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('endomarketing', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('endomarketing', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('endomarketing', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Viagens Admin */}
                  <div className="flex row-hover">
                    <RowHeader label={labelizeKey('viagensAdmin')} className="pl-12" />
                    {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue('viagensAdmin', i)} format="currency" editable onChange={(v) => updateDespesaDetalhada('viagensAdmin', i, v)} />)}
                    <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue('viagensAdmin', i), 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {/* Despesas Softwares aggregate and sub-lines */}
                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Softwares" className="pl-10" />
                    {monthlyData.map((m,i) => <SpreadsheetCell key={i} value={m.dre.despesasSoftwares} format="currency" />)}
                    <SpreadsheetCell value={monthlyData.reduce((s,m) => s + m.dre.despesasSoftwares, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {['despesasSoftwaresStackDigital','gestao','financeiro','tech','vendas'].map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-12" />
                      {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />)}
                      <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}

                  {/* Despesas Serviços Terceirizados aggregate and sub-lines */}
                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Serviços Terceirizados" className="pl-10" />
                    {monthlyData.map((m,i) => <SpreadsheetCell key={i} value={m.dre.despesasServicosTerceirizados} format="currency" />)}
                    <SpreadsheetCell value={monthlyData.reduce((s,m) => s + m.dre.despesasServicosTerceirizados, 0)} format="currency" className="bg-primary/10" />
                  </div>

                  {['servicosContabilidade','servicosAuddas'].map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-12" />
                      {MONTHS.map((_, i) => <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />)}
                      <SpreadsheetCell value={MONTHS.reduce((s,_,i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}

                  
                  {/* Any other detailed keys not included above (render as Outros) */}
                  {Object.keys(inputs.dreConfig.despesasAdmDetalhadas).filter(k => ![
                    'timePG','timeFinanceiro','timePP','seguroEmpresa','techRemuneracao',
                    'utilitiesSaoPaulo','aluguelV4House','aluguelPaulista','aguaPaulista','limpezaPaulista','facilites','officeCampinas','aluguelConteiner','officeIndaiatuba','flagship',
                    'officePaulistaAjuda','officeV4CampAjuda','flagshipAjuda','campinasAjuda','ifood','odonto','transfer','saude','socios',
                    'despesasSoftwaresStackDigital','servicosContabilidade','servicosAuddas','gestao','financeiro','tech','vendas','endomarketing','viagensAdmin'
                  ].includes(k)).map(k => (
                    <div className="flex row-hover" key={k}>
                      <RowHeader label={labelizeKey(k)} className="pl-12" />
                      {MONTHS.map((_, i) => (
                        <SpreadsheetCell key={i} value={getDespesaDetalhadaValue(k, i)} format="currency" editable onChange={(v) => updateDespesaDetalhada(k, i, v)} />
                      ))}
                      <SpreadsheetCell value={MONTHS.reduce((s, _, i) => s + getDespesaDetalhadaValue(k, i), 0)} format="currency" className="bg-primary/10" />
                    </div>
                  ))}
                </>
              ) : (
                // Fallback: render legacy static rows
                <>
                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Time Adm" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasTimeAdm)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasTimeAdm} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasTimeAdm, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Custos Adm" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasCustosAdm)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasCustosAdm} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasCustosAdm, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Tech Remuneração" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasTech)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasTech} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasTech, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Utilities" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasUtilities)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasUtilities} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasUtilities, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Pessoas" className="pl-10" tooltip={`Inicia em ${formatCurrency(inputs.dreConfig.despesasPessoasInicial)} + ${formatCurrency(inputs.dreConfig.despesasPessoasIncremento)}/mês`} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasPessoas} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasPessoas, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Viagens Admin" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.viagensAdmin)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.viagensAdmin} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.viagensAdmin, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Softwares" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasSoftwares)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasSoftwares} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasSoftwares, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  <div className="flex row-hover">
                    <RowHeader label="(-) Despesas Serviços Terceirizados" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.despesasServicosTerceirizados)} />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.dre.despesasServicosTerceirizados} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.dre.despesasServicosTerceirizados, 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                </>
              )}

              {/* ========== EBITDA ========== */}
              <div className="flex row-hover bg-green-500/10 mt-2">
                <RowHeader label="(=) EBITDA" className="pl-6 font-bold text-green-500" tooltip="Earnings Before Interest, Taxes, Depreciation and Amortization" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.ebitda} format="currency" className="font-bold text-green-500" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.ebitda, 0)}
                  format="currency"
                  className="bg-green-500/20 font-bold text-green-500"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% EBITDA" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.percentualEBITDA} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.ebitda, 0) / monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== EBIT ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) Despesas Financeiras" className="pl-10" tooltip={`${(inputs.dreConfig.despesasFinanceirasRate * 100).toFixed(2)}% sobre Receita Bruta Recebida`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.despesasFinanceiras} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.despesasFinanceiras, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover bg-green-500/10">
                <RowHeader label="(=) EBIT" className="pl-6 font-bold text-green-500" tooltip="Earnings Before Interest and Taxes" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.ebit} format="currency" className="font-bold text-green-500" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.ebit, 0)}
                  format="currency"
                  className="bg-green-500/20 font-bold text-green-500"
                />
              </div>

              {/* ========== LUCRO LÍQUIDO ========== */}
              <div className="flex row-hover mt-4">
                <RowHeader label="(-) IRPJ" className="pl-10" tooltip={`${(inputs.dreConfig.irpjRate * 100).toFixed(1)}% sobre EBIT`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.irpj} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.irpj, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) CSLL" className="pl-10" tooltip={`${(inputs.dreConfig.csllRate * 100).toFixed(1)}% sobre EBIT`} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.csll} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.csll, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover bg-green-500/10 mt-2">
                <RowHeader label="(=) LUCRO LÍQUIDO" className="pl-6 font-bold text-green-500" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.lucroLiquido} format="currency" className="font-bold text-green-500" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.lucroLiquido, 0)}
                  format="currency"
                  className="bg-green-500/20 font-bold text-green-500"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="% Lucro Líquido" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.percentualLucroLiquido} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.lucroLiquido, 0) / monthlyData.reduce((sum, m) => sum + m.dre.receitaLiquida, 0)}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              {/* ========== RESUMO CAIXA EFETIVO ========== */}
              <div className="flex row-hover mt-6 bg-blue-500/10">
                <RowHeader label="RESUMO CAIXA EFETIVO" className="pl-4 font-semibold" tooltip="Resumo simplificado do impacto no caixa" />
                {MONTHS.map((month, i) => (
                  <ColumnHeader key={i} label="" />
                ))}
                <ColumnHeader label="" className="bg-blue-500/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(=) Lucro Líquido" className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.lucroLiquido} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.lucroLiquido, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Compra Ativo Intangível" className="pl-6" tooltip={formatCurrency(inputs.dreConfig.compraAtivoIntangivel)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.compraAtivoIntangivel} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.compraAtivoIntangivel, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Pagamento Financiamento" className="pl-6" tooltip={formatCurrency(inputs.dreConfig.pagamentoFinanciamento)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.pagamentoFinanciamento} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.pagamentoFinanciamento, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Distribuição de Dividendos" className="pl-6" tooltip={formatCurrency(inputs.dreConfig.distribuicaoDividendos)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.distribuicaoDividendos} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.distribuicaoDividendos, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              {(() => {
                const caixaTotal = monthlyData.reduce((sum, m) => sum + m.dre.caixaEfetivo, 0);
                return (
                  <div className="flex row-hover">
                    <RowHeader label="(=) CAIXA EFETIVO" className="pl-6 font-bold" tooltip="Caixa efetivo após todas as deduções principais" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.dre.caixaEfetivo}
                        format="currency"
                        className={`font-bold ${m.dre.caixaEfetivo >= 0 ? 'text-green-600' : 'text-destructive'}`}
                      />
                    ))}
                    <SpreadsheetCell
                      value={caixaTotal}
                      format="currency"
                      className={`${caixaTotal >= 0 ? 'bg-green-500/10 font-bold text-green-600' : 'bg-destructive/10 font-bold text-destructive'}`}
                    />
                  </div>
                );
              })()}

                {/* Breakeaven: CSP + Despesas Administrativas - (Comissão Ativação + Bônus Campanhas Activation + Comissão Farmer + Bônus Campanhas Expansion + Comissão Operação) - Royalties */}
                <div className="flex row-hover mt-4">
                  <RowHeader label="Breakeaven" className="pl-6 font-semibold" tooltip="CSP + Despesas Administrativas - comissões/bonificações - royalties" />
                  {monthlyData.map((m, i) => {
                    const csp = m.dre.cspTotal ?? 0;
                    const despAdm = m.dre.totalDespesasAdm ?? 0;
                    const comissaoAtiv = m.dre.salesMetrics?.comissaoVendasActivation ?? 0;
                    const bonusCampAtiv = m.dre.salesMetrics?.bonusCampanhasActivation ?? 0;
                    const comissaoFarmer = m.dre.salesMetrics?.comissaoFarmerExpansion ?? 0;
                    const bonusCampExp = m.dre.salesMetrics?.bonusCampanhasExpansion ?? 0;
                    const comissaoOper = m.dre.salesMetrics?.comissaoOperacao ?? 0;
                    const royalties = m.dre.royalties ?? 0;
                    const value = csp + despAdm - (comissaoAtiv + bonusCampAtiv + comissaoFarmer + bonusCampExp + comissaoOper) - royalties;
                    return <SpreadsheetCell key={i} value={value} format="currency" />;
                  })}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => {
                      const csp = m.dre.cspTotal ?? 0;
                      const despAdm = m.dre.totalDespesasAdm ?? 0;
                      const comissaoAtiv = m.dre.salesMetrics?.comissaoVendasActivation ?? 0;
                      const bonusCampAtiv = m.dre.salesMetrics?.bonusCampanhasActivation ?? 0;
                      const comissaoFarmer = m.dre.salesMetrics?.comissaoFarmerExpansion ?? 0;
                      const bonusCampExp = m.dre.salesMetrics?.bonusCampanhasExpansion ?? 0;
                      const comissaoOper = m.dre.salesMetrics?.comissaoOperacao ?? 0;
                      const royalties = m.dre.royalties ?? 0;
                      return sum + (csp + despAdm - (comissaoAtiv + bonusCampAtiv + comissaoFarmer + bonusCampExp + comissaoOper) - royalties);
                    }, 0)}
                    format="currency"
                    className="bg-primary/10 font-semibold"
                  />
                </div>

              {/* ========== FLUXO DE CAIXA ========== */}
              <div className="flex row-hover mt-6 bg-primary/5">
                <RowHeader 
                  label="FLUXO DE CAIXA (DETALHADO)" 
                  level="section"
                  className="pl-4 font-semibold" 
                  expanded={expandedSections.fluxoCaixa}
                  onToggle={() => toggleSection('fluxoCaixa')}
                />
                {MONTHS.map((month, i) => (
                  <ColumnHeader key={i} label="" />
                ))}
                <ColumnHeader label="" className="bg-primary/20" />
              </div>

              {expandedSections.fluxoCaixa && (
                <>
                  <div className="flex row-hover">
                    <RowHeader label="(+) Lucro do Período" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.lucroPeríodo} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.lucroPeríodo, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Contas a Receber Bookado" className="pl-10" tooltip="Receita bookada ainda não recebida" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.contasAReceberBookado} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.contasAReceberBookado, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(+) Depreciação" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.depreciacao)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.depreciacao} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.depreciacao, 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="(=) Caixa Operacional" className="pl-10 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.caixaOperacional} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.caixaOperacional, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover mt-2">
                <RowHeader label="(-) Compra Ativo Intangível" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.compraAtivoIntangivel)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.compraAtivoIntangivel} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.compraAtivoIntangivel, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="(=) Caixa após Investimento" className="pl-10 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.caixaInvestimento} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.caixaInvestimento, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover mt-2">
                <RowHeader label="(-) Pagamento Financiamento" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.pagamentoFinanciamento)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.pagamentoFinanciamento} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.pagamentoFinanciamento, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="(-) Distribuição de Dividendos" className="pl-10" tooltip={formatCurrency(inputs.dreConfig.distribuicaoDividendos)} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.distribuicaoDividendos} format="currency" className="text-destructive" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.distribuicaoDividendos, 0)}
                  format="currency"
                  className="bg-primary/10 text-destructive"
                />
              </div>

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="(=) Caixa após Financiamento" className="pl-10 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.caixaFinanciamento} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.caixaFinanciamento, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover mt-2 bg-primary/10">
                <RowHeader label="(=) SALDO DE CAIXA MÊS" className="pl-10 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.saldoCaixaMes} format="currency" className="font-semibold" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.dre.saldoCaixaMes, 0)}
                  format="currency"
                  className="bg-primary/20 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Caixa Inicial" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.caixaInicial} format="currency" />
                ))}
                <SpreadsheetCell
                  value={inputs.dreConfig.caixaInicial}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-green-500/10">
                <RowHeader label="Caixa Final" className="pl-10 font-bold text-green-500" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.caixaFinal} format="currency" className="font-bold text-green-500" />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.dre.caixaFinal || 0}
                  format="currency"
                  className="bg-green-500/20 font-bold text-green-500"
                />
              </div>

              {/* ========== KPIS ========== */}
              <div className="flex row-hover mt-6 bg-primary/5">
                <RowHeader label="KPIS" className="pl-4 font-semibold" />
                {MONTHS.map((month, i) => (
                  <ColumnHeader key={i} label="" />
                ))}
                <ColumnHeader label="" className="bg-purple-500/10" />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CAC" className="pl-10" tooltip="Customer Acquisition Cost - Investimento / Clientes Won" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.cac} format="currency" />
                ))}
                <SpreadsheetCell
                  value={(inputs.dreConfig.usarLinhasGerenciais
                    ? monthlyData.reduce((s, m) => s + (m.dre.investimentoMarketingAmortizado || 0), 0)
                    : inputs.topline.investmentMonthly.reduce((s, v) => s + v, 0)) / monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, t) => s + m.wons[t], 0), 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="CLV" className="pl-10" tooltip="Customer Lifetime Value" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.clv} format="currency" />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.dre.clv || 0}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="ROI (CLV/CAC)" className="pl-10" tooltip="Return on Investment" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.roi} format="percentage" />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.dre.roi || 0}
                  format="percentage"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Quantidade de Clientes" className="pl-10" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.dre.quantidadeClientes} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.dre.quantidadeClientes || 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>
                </>
              )}
            </>
          )}

          {/* Spacer at bottom */}
          <div className="h-20" />
          {/* Resumo Administrativo - consolidado anual (somente totais) */}

        </div>
      </div>
    </div>
  );
}
