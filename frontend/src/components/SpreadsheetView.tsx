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
    topline: true,
    funnel: true,
    conversionRates: false,
    renewals: false,
    expansions: false,
    legacyBase: false,
    totals: true,
    totalsClients: false,
    capacityPlan: true,
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

  const updateConversionRate = (key: keyof typeof inputs.conversionRates, value: number) => {
    onUpdate({
      ...inputs,
      conversionRates: {
        ...inputs.conversionRates,
        [key]: value,
      },
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

  // Update capacity plan config
  const updateCapacityPlan = (
    squad: 'saberSquad' | 'executarSquad',
    key: string,
    value: number,
    tier?: Tier
  ) => {
    if (tier) {
      // Updating tier weight
      onUpdate({
        ...inputs,
        capacityPlan: {
          ...inputs.capacityPlan,
          saberSquad: {
            ...inputs.capacityPlan.saberSquad,
            tierWeights: {
              ...inputs.capacityPlan.saberSquad.tierWeights,
              [tier]: value,
            },
          },
        },
      });
    } else {
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
    }
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

    // EXPANSIONS - BASE ATIVA (conversões Saber→Executar)
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['EXPANSÕES BASE ATIVA', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('% Taxa Expansão Base Ativa', Array(12).fill(inputs.conversionRates.expansionRate));
    for (const tier of TIERS) {
      for (const product of PRODUCTS) {
        addRow(`  # Expansão ${PRODUCT_LABELS[product]} ${TIER_LABELS[tier]}`, monthlyData.map(m => m.activeBaseExpansions[tier][product]));
        addRow(`  $ Receita Expansão ${PRODUCT_LABELS[product]} ${TIER_LABELS[tier]}`, monthlyData.map(m => m.activeBaseExpansionRevenue[tier][product]));
      }
    }
    addRow('$ Total Receita Expansão Base Ativa', monthlyData.map(m => 
      TIERS.reduce((sum, tier) => 
        sum + PRODUCTS.reduce((pSum, product) => 
          pSum + m.activeBaseExpansionRevenue[tier][product], 0), 0)
    ));

    // LEGACY BASE
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['BASE LEGADA', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('% Churn Mensal', Array(12).fill(inputs.legacyBase.churnRate));
    addRow('% Expansão Mensal', Array(12).fill(inputs.legacyBase.expansionRate));
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
    addRow('$ Receita/HC', monthlyData.map(m => m.capacityPlan.revenuePerHC));

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
            <ColumnHeader label="Total" className="bg-primary/20 font-bold" />
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
              <div key={i} className="spreadsheet-cell bg-primary/10" />
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
                className="bg-primary/10 font-semibold"
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
              className="bg-primary/10"
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
              className="bg-primary/10 font-semibold"
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
              <div key={i} className="spreadsheet-cell bg-primary/10" />
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
                  className="bg-primary/10"
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
                  className="bg-primary/10 font-semibold"
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
                  className="bg-primary/10"
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
                  className="bg-primary/10 font-semibold"
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
                  className="bg-primary/10"
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
                  className="bg-primary/10 font-semibold"
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
                  className="bg-primary/10"
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
                  className="bg-primary/10 font-semibold"
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
                  className="bg-primary/10"
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
                  className="bg-primary/10 font-semibold"
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
                      tooltip="Quantidade de clientes novos ativados neste produto"
                      className="pl-8" 
                    />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={m.activeClients[tier][product]}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + m.activeClients[tier][product], 0)}
                      format="number"
                      className="bg-primary/10 font-semibold"
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
                      className="bg-primary/10"
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
                      className="bg-primary/10"
                    />
                  </div>
                  )}

                  {/* Product Revenue - results */}
                  {(funnelFilter === 'all' || funnelFilter === 'results') && (
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
                      className="bg-primary/10 font-semibold"
                    />
                  </div>
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
              <div key={i} className="spreadsheet-cell bg-primary/10" />
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              className="bg-primary/10"
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
              <div key={i} className="spreadsheet-cell bg-primary/10" />
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
                      className="bg-primary/10 font-semibold"
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
                      className="bg-primary/10 font-semibold"
                    />
                  </div>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}

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
                      className="bg-primary/10 font-semibold"
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
                      className="bg-primary/10 font-semibold"
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
                value={inputs.legacyBase.churnRate}
                onChange={(v) => updateLegacyBase('churnRate', '', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.legacyBase.churnRate}
              format="percentage"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="% Expansão Mensal" tooltip={TOOLTIPS.legacyExpansion} />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.legacyBase.expansionRate}
                onChange={(v) => updateLegacyBase('expansionRate', '', v)}
                editable
                format="percentage"
              />
            ))}
            <SpreadsheetCell
              value={inputs.legacyBase.expansionRate}
              format="percentage"
              className="bg-primary/10"
            />
          </div>

          {TIERS.map((tier) => (
            <React.Fragment key={`legacy-${tier}`}>
              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - Clientes Iniciais`} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={i === 0 ? inputs.legacyBase[tier].clients : monthlyData[i]?.legacyClients[tier] || 0}
                    onChange={i === 0 ? (v) => updateLegacyBase(tier, 'clients', v) : undefined}
                    editable={i === 0}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11]?.legacyClients[tier] || 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - Receita Inicial`} className="pl-6" />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={i === 0 ? inputs.legacyBase[tier].revenue : monthlyData[i]?.legacyRevenue[tier] || 0}
                    onChange={i === 0 ? (v) => updateLegacyBase(tier, 'revenue', v) : undefined}
                    editable={i === 0}
                    format="currency"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.legacyRevenue[tier], 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label={`${TIER_LABELS[tier]} - $ Expansão Total`} tooltip="Receita de expansão da base legada" className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.legacyExpansionRevenue[tier]}
                    format="currency"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.legacyExpansionRevenue[tier], 0)}
                  format="currency"
                  className="bg-primary/10 font-semibold"
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
                    className="bg-primary/10 text-xs"
                  />
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Totais Expansão Base Legada */}
          <div className="flex row-hover bg-primary/5">
            <RowHeader label="TOTAL $ Expansão Legada" className="font-semibold" />
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
              className="bg-primary/10 font-bold"
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
              <div key={i} className="spreadsheet-cell bg-primary/10" />
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

          <div className="flex row-hover">
            <RowHeader label="$ Receita Nova Aquisição" tooltip="Receita de novos clientes adquiridos no mês" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.totalNewRevenue} format="currency" />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalNewRevenue}
              format="currency"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Renovação Aquisição" tooltip="Receita de renovações de clientes adquiridos" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.totalRenewalRevenue} format="currency" />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalRenewalRevenue}
              format="currency"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Expansão Aquisição" tooltip="Receita de expansão de clientes adquiridos (novos produtos)" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.totalExpansionRevenue} format="currency" />
            ))}
            <SpreadsheetCell
              value={annualTotals.totalExpansionRevenue}
              format="currency"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Base Legada" tooltip="Receita recorrente da base de clientes existentes (com churn aplicado)" />
            {monthlyData.map((m, i) => {
              // Receita base legada SEM expansão = totalLegacyRevenue - soma das expansões
              const legacyBase = TIERS.reduce((sum, tier) => sum + m.legacyRevenue[tier], 0);
              const legacyExpansion = TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              const legacyBaseOnly = legacyBase - legacyExpansion;
              return <SpreadsheetCell key={i} value={legacyBaseOnly} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => {
                const legacyBase = TIERS.reduce((s, tier) => s + m.legacyRevenue[tier], 0);
                const legacyExpansion = TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0);
                return sum + (legacyBase - legacyExpansion);
              }, 0)}
              format="currency"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Base Legada Expansão" tooltip="Receita de expansão da base legada (upsell/cross-sell de clientes existentes)" />
            {monthlyData.map((m, i) => {
              const legacyExpansion = TIERS.reduce((sum, tier) => sum + m.legacyExpansionRevenue[tier], 0);
              return <SpreadsheetCell key={i} value={legacyExpansion} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.legacyExpansionRevenue[tier], 0), 0)}
              format="currency"
              className="bg-primary/10 font-semibold"
            />
          </div>

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

          <div className="flex row-hover">
            <RowHeader label="# Clientes Ativos Base Legada" tooltip="Clientes da base legada (todos os tiers)" />
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

          <div className="flex row-hover">
            <RowHeader label="# Clientes Ativos Aquisição" tooltip="Clientes novos (funil + expansão + conversões)" />
            {monthlyData.map((m, i) => {
              const legacyTotal = TIERS.reduce((sum, tier) => sum + m.legacyClients[tier], 0);
              return (
                <SpreadsheetCell 
                  key={i} 
                  value={m.totalActiveClients - legacyTotal} 
                  format="number" 
                />
              );
            })}
            <SpreadsheetCell
              value={monthlyData[11] ? monthlyData[11].totalActiveClients - TIERS.reduce((sum, tier) => sum + monthlyData[11].legacyClients[tier], 0) : 0}
              format="number"
              className="bg-primary/10 font-semibold"
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
          {/* Parâmetros Squad Saber */}
          <div className="flex">
            <RowHeader label="Squad Saber + Ter" level="tier" tier="enterprise" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-enterprise" />
            ))}
          </div>

          <div className="flex row-hover">
            <RowHeader label="HC por Squad" tooltip="Quantidade de pessoas por squad Saber" className="pl-6" />
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
            <RowHeader label="Capacidade UC por Squad" tooltip="Unidades de capacidade por squad" className="pl-6" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.saberSquad.capacityUC}
                onChange={(v) => updateCapacityPlan('saberSquad', 'capacityUC', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.saberSquad.capacityUC}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {/* Pesos por Tier */}
          {TIERS.map((tier) => (
            <div key={`weight-${tier}`} className="flex row-hover">
              <RowHeader label={`Peso ${TIER_LABELS[tier]}`} tooltip="Peso de complexidade do tier" className="pl-6" />
              {MONTHS.map((_, i) => (
                <SpreadsheetCell
                  key={i}
                  value={inputs.capacityPlan.saberSquad.tierWeights[tier]}
                  onChange={(v) => updateCapacityPlan('saberSquad', 'tierWeights', v, tier)}
                  editable
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={inputs.capacityPlan.saberSquad.tierWeights[tier]}
                format="number"
                className="bg-primary/10"
              />
            </div>
          ))}

          {/* Parâmetros Squad Executar */}
          <div className="flex">
            <RowHeader label="Squad Executar" level="tier" tier="large" />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell tier-large" />
            ))}
          </div>

          <div className="flex row-hover">
            <RowHeader label="HC por Squad" tooltip="Quantidade de pessoas por squad Executar" className="pl-6" />
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
            <RowHeader label="Clientes por Squad" tooltip="Capacidade de clientes por squad (legacy)" className="pl-6" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.executarSquad.clientsPerSquad}
                onChange={(v) => updateCapacityPlan('executarSquad', 'clientsPerSquad', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.executarSquad.clientsPerSquad}
              format="number"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="Capacidade UC por Squad" tooltip="Unidades de capacidade por squad Executar" className="pl-6" />
            {MONTHS.map((_, i) => (
              <SpreadsheetCell
                key={i}
                value={inputs.capacityPlan.executarSquad.capacityUC}
                onChange={(v) => updateCapacityPlan('executarSquad', 'capacityUC', v)}
                editable
                format="number"
              />
            ))}
            <SpreadsheetCell
              value={inputs.capacityPlan.executarSquad.capacityUC}
              format="number"
              className="bg-primary/10"
            />
          </div>

          {/* Pesos por Tier Executar */}
          {TIERS.map((tier) => (
            <div key={`weight-exec-${tier}`} className="flex row-hover">
              <RowHeader label={`Peso ${TIER_LABELS[tier]}`} tooltip="Peso de complexidade do tier para Executar" className="pl-6" />
              {MONTHS.map((_, i) => (
                <SpreadsheetCell
                  key={i}
                  value={inputs.capacityPlan.executarSquad.tierWeights?.[tier] ?? 1}
                  onChange={(v) => updateCapacityPlan('executarSquad', 'tierWeights', v, tier)}
                  editable
                  format="number"
                />
              ))}
              <SpreadsheetCell
                value={inputs.capacityPlan.executarSquad.tierWeights?.[tier] ?? 1}
                format="number"
                className="bg-primary/10"
              />
            </div>
          ))}

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
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalClientsSaber} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalClientsSaber || 0}
              format="number"
              className="bg-primary/10 font-semibold"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="UC Necessário" tooltip="Unidades de capacidade necessárias" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalUC} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalUC || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

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
            <RowHeader label="% Utilização Saber" tooltip="Percentual de utilização da capacidade" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.ucUtilization} format="percentage" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.ucUtilization || 0}
              format="percentage"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="# Total Clientes Executar" className="pl-6 font-semibold" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.totalClientsExecutar} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.totalClientsExecutar || 0}
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

          <div className="flex row-hover">
            <RowHeader label="UC Executar Necessário" tooltip="Unidades de capacidade necessárias para Executar" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.executarUC} format="number" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.executarUC || 0}
              format="number"
              className="bg-primary/10"
            />
          </div>

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
            <RowHeader label="% Utilização Executar" tooltip="Percentual de utilização da capacidade" className="pl-6" />
            {monthlyData.map((m, i) => (
              <SpreadsheetCell key={i} value={m.capacityPlan.executarUtilization} format="percentage" />
            ))}
            <SpreadsheetCell
              value={monthlyData[11]?.capacityPlan.executarUtilization || 0}
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
            <RowHeader label="$ Receita Saber" tooltip="Receita do produto Saber" className="pl-6" />
            {monthlyData.map((m, i) => {
              const receitaSaber = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].saber, 0);
              return <SpreadsheetCell key={i} value={receitaSaber} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => 
                sum + TIERS.reduce((s, tier) => 
                  s + m.revenueByTierProduct[tier].saber, 0), 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita Executar" tooltip="Receita dos produtos Executar + Potencializar + Legada" className="pl-6" />
            {monthlyData.map((m, i) => {
              const receitaExecutar = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].executarLoyalty 
                + m.revenueByTierProduct[tier].executarNoLoyalty 
                + m.revenueByTierProduct[tier].potencializar
                + m.legacyRevenue[tier], 0)
                + m.totalRenewalRevenue + m.totalExpansionRevenue;
              return <SpreadsheetCell key={i} value={receitaExecutar} format="currency" />;
            })}
            <SpreadsheetCell
              value={monthlyData.reduce((sum, m) => 
                sum + TIERS.reduce((s, tier) => 
                  s + m.revenueByTierProduct[tier].executarLoyalty 
                  + m.revenueByTierProduct[tier].executarNoLoyalty 
                  + m.revenueByTierProduct[tier].potencializar
                  + m.legacyRevenue[tier], 0)
                + m.totalRenewalRevenue + m.totalExpansionRevenue, 0)}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita/HC Saber" tooltip="Receita Saber+Ter dividida pelo HC Saber" className="pl-6" />
            {monthlyData.map((m, i) => {
              const receitaSaber = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].saber + m.revenueByTierProduct[tier].ter, 0);
              const revenuePerHC = m.capacityPlan.hcSaber > 0 ? receitaSaber / m.capacityPlan.hcSaber : 0;
              return <SpreadsheetCell key={i} value={revenuePerHC} format="currency" />;
            })}
            <SpreadsheetCell
              value={(() => {
                const m = monthlyData[11];
                if (!m) return 0;
                const receitaSaber = TIERS.reduce((sum, tier) => 
                  sum + m.revenueByTierProduct[tier].saber + m.revenueByTierProduct[tier].ter, 0);
                return m.capacityPlan.hcSaber > 0 ? receitaSaber / m.capacityPlan.hcSaber : 0;
              })()}
              format="currency"
              className="bg-primary/10"
            />
          </div>

          <div className="flex row-hover">
            <RowHeader label="$ Receita/HC Executar" tooltip="Receita Executar dividida pelo HC Executar" className="pl-6" />
            {monthlyData.map((m, i) => {
              const receitaExecutar = TIERS.reduce((sum, tier) => 
                sum + m.revenueByTierProduct[tier].executarLoyalty 
                + m.revenueByTierProduct[tier].executarNoLoyalty 
                + m.revenueByTierProduct[tier].potencializar
                + m.legacyRevenue[tier], 0)
                + m.totalRenewalRevenue + m.totalExpansionRevenue;
              const revenuePerHC = m.capacityPlan.hcExecutar > 0 ? receitaExecutar / m.capacityPlan.hcExecutar : 0;
              return <SpreadsheetCell key={i} value={revenuePerHC} format="currency" />;
            })}
            <SpreadsheetCell
              value={(() => {
                const m = monthlyData[11];
                if (!m) return 0;
                const receitaExecutar = TIERS.reduce((sum, tier) => 
                  sum + m.revenueByTierProduct[tier].executarLoyalty 
                  + m.revenueByTierProduct[tier].executarNoLoyalty 
                  + m.revenueByTierProduct[tier].potencializar
                  + m.legacyRevenue[tier], 0)
                  + m.totalRenewalRevenue + m.totalExpansionRevenue;
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

          {/* Spacer at bottom */}
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
}
