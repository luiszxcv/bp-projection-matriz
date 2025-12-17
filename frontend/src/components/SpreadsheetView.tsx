import React, { useMemo, useState, useEffect } from 'react';
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
  TotalClientsChart
} from './SpreadsheetCharts';
import * as XLSX from 'xlsx';

interface SpreadsheetViewProps {
  simulation: Simulation;
  onUpdate: (inputs: SimulationInputs) => void;
}

const TIERS: Tier[] = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS: Product[] = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];

// Helper: get monthly value from number or array (for CSP salary ramps)


const TOOLTIPS = {
  investment: 'Investimento mensal em marketing para geração de leads',
  cpl: 'Custo por Lead - quanto custa para adquirir cada Lead',
  leads: 'Total de Leads gerados (Budget / CPL)',
  leadToMqlRate: 'Taxa de conversão de Leads para MQLs',
  totalMQLs: 'Total de Marketing Qualified Leads (Leads × Taxa)',
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
  loyaltyDuration: 'Duração do ciclo de renovação para Loyalty (em meses)',
  loyaltyRenewalRate: 'Taxa de renovação para clientes Loyalty',
  loyaltyMaxRenewals: 'Número máximo de renovações para clientes Loyalty',
  noLoyaltyDuration: 'Duração do ciclo de renovação para No-Loyalty (em meses)',
  noLoyaltyRenewalRate: 'Taxa de renovação para clientes No-Loyalty',
  noLoyaltyMaxRenewals: 'Número máximo de renovações para clientes No-Loyalty',
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
    expansions: true,  // WTP/Expansão seção expandida por padrão
    totals: false,
    totalsClients: false,
    capacityPlan: false,
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

  // Estado para expandir a lista de Accounts por Tier dentro do Capacity Plan
  const [accountsExpanded, setAccountsExpanded] = useState<boolean>(false);

  // Estado para filtro do funil por tier
  type FunnelFilter = 'all' | 'tickets' | 'rates' | 'distribution' | 'results';
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('all');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleChart = (chart: string) => {
    setShowCharts(prev => ({ ...prev, [chart]: !prev[chart] }));
  };

  // Simple per-simulation password protection (client-side)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default unlocked until effect runs
  const [passwordInput, setPasswordInput] = useState('');
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);

  // Helper: compute SHA-256 hex hash of input
  const sha256Hex = async (text: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Track last seen password hash and last seen simulation id to avoid
  // resetting authentication on unrelated updates, but require the
  // password whenever the user switches to a different simulation that
  // has a password configured.
  const [lastPasswordHash, setLastPasswordHash] = useState<string | undefined>(undefined);
  const [lastSimId, setLastSimId] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const pwHash = (simulation.inputs as any)?.protection?.passwordHash;

      // If no password on this simulation, ensure unlocked and clear trackers
      if (!pwHash) {
        setIsAuthenticated(true);
        setLastPasswordHash(undefined);
        setLastSimId(simulation.id);
        return;
      }

      // If switched simulation (different id), require password regardless
      if (simulation.id !== lastSimId) {
        setIsAuthenticated(false);
        setLastPasswordHash(pwHash);
        setLastSimId(simulation.id);
        return;
      }

      // If same simulation but hash changed, require password
      if (lastPasswordHash !== pwHash) {
        setIsAuthenticated(false);
        setLastPasswordHash(pwHash);
      }
      // Otherwise keep current isAuthenticated
    } catch (e) {
      // ignore
    }
  }, [simulation, lastPasswordHash, lastSimId]);

  const handleUnlock = async () => {
    try {
      const pwHash = (simulation.inputs as any)?.protection?.passwordHash;
      if (!pwHash) {
        setIsAuthenticated(true);
        return;
      }
      const enteredHash = await sha256Hex(passwordInput);
      if (enteredHash === pwHash) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        alert('Senha incorreta');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao verificar senha');
    }
  };

  // Open modal to set a password and lock the simulation
  const handleOpenSetPassword = () => {
    setShowSetPasswordModal(true);
    setPasswordInput('');
  };

  const handleSetPassword = async (pw: string) => {
    try {
      if (!pw || pw.trim() === '') {
        alert('Senha vazia não é permitida');
        return;
      }
      const hash = await sha256Hex(pw);
      const newInputs = { ...inputs, protection: { ...(inputs as any).protection, passwordHash: hash } } as typeof inputs;
      onUpdate(newInputs);
      // after saving, require password
      setIsAuthenticated(false);
      setShowSetPasswordModal(false);
      setPasswordInput('');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar senha');
    }
  };

  // Remove password protection entirely (persist change)
  const handleRemovePassword = () => {
    try {
      // Create a shallow copy of inputs and a new protection object to avoid mutating shared refs
      const newInputs = { ...inputs } as any;
      if (newInputs.protection) {
        const newProtection = { ...newInputs.protection };
        delete newProtection.passwordHash;
        // If protection becomes empty, remove the property entirely
        if (Object.keys(newProtection).length === 0) {
          delete newInputs.protection;
        } else {
          newInputs.protection = newProtection;
        }
      }
      onUpdate(newInputs);
      setIsAuthenticated(true);
      setShowSetPasswordModal(false);
      setPasswordInput('');
    } catch (e) {
      console.error(e);
    }
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
  const updateToplineMonthly = (field: 'investmentMonthly' | 'cplMonthly' | 'leadToMqlRate', index: number, value: number) => {
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

  // Update scalar expansion ticket in wtpConfig (expansionTickets are stored as scalars per tier/product)
  const updateWtpExpansionTicket = (tier: Tier, product: Product, value: number) => {
    const newWtp = { ...(inputs as any).wtpConfig } as any;
    newWtp[tier] = { ...newWtp[tier], expansionTickets: { ...newWtp[tier].expansionTickets, [product]: value } };
    onUpdate({
      ...inputs,
      wtpConfig: newWtp,
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
    addRow('$ Investimento', inputs.topline.investmentMonthly, inputs.topline.investmentMonthly.reduce((s, v) => s + v, 0));
    addRow('$ CPL', inputs.topline.cplMonthly, inputs.topline.cplMonthly.reduce((s, v) => s + v, 0) / 12);
    addRow('# Leads', monthlyData.map(m => m.totalLeads));
    addRow('% Lead → MQL', inputs.topline.leadToMqlRate);
    addRow('# Total MQLs', monthlyData.map(m => Object.values(m.mqls).reduce((s, v) => s + v, 0)));
    addRow('# Total SQLs', monthlyData.map(m => Object.values(m.sqls).reduce((s, v) => s + v, 0)));
    addRow('# Total SALs', monthlyData.map(m => Object.values(m.sals).reduce((s, v) => s + v, 0)));
    addRow('# Total Ativações', monthlyData.map(m => Object.values(m.activations).reduce((s, v) => s + v, 0)));

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
      addRow(`  # MQLs`, monthlyData.map(m => (m.mqls?.[tier] ?? 0)));
      addRow(`  # SQLs`, monthlyData.map(m => (m.sqls?.[tier] ?? 0)));
      addRow(`  # SALs (Total)`, monthlyData.map(m => (m.sals?.[tier] ?? 0)));
      addRow(`    - Inbound SALs`, monthlyData.map(m => (m.salsInbound?.[tier] ?? 0)));
      addRow(`    - Outbound SALs`, monthlyData.map(m => (m.salsOutbound?.[tier] ?? 0)));
      addRow(`  # WONs`, monthlyData.map(m => (m.wons?.[tier] ?? 0)));
      addRow(`  # Ativações`, monthlyData.map(m => (m.activations?.[tier] ?? 0)));

      // Revenue by product
      for (const product of PRODUCTS) {
        addRow(`  $ Receita ${PRODUCT_LABELS[product]}`, monthlyData.map(m => (m.revenueByTierProduct?.[tier]?.[product] ?? 0)));
      }

      // Direct activations (clientes ativados diretamente do funil) - exibidos na UI, faltavam na exportação
      for (const product of PRODUCTS) {
        addRow(`  # Clientes ${PRODUCT_LABELS[product]}`, monthlyData.map(m => (m.directActivations?.[tier]?.[product] ?? 0)));
      }

      // Activation breakdown (valores debitados pela taxa de ativação) - exporta como negativo para manter consistência com UI
      for (const product of PRODUCTS) {
        addRow(`  (-) Quebra Ativação ${PRODUCT_LABELS[product]}`, monthlyData.map(m => -(m.activationBreakdown?.[tier]?.[product] ?? 0)));
      }
    }

    // CONVERSION RATES
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['TAXAS DE CONVERSÃO E RENOVAÇÃO', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('% Loyalty Renewal Rate', Array(12).fill(inputs.conversionRates.loyaltyRenewalRate));
    addRow('# No-Loyalty Duration (meses)', Array(12).fill(inputs.conversionRates.noLoyaltyDuration));
    addRow('% No-Loyalty Renewal Rate', Array(12).fill(inputs.conversionRates.noLoyaltyRenewalRate));
    // Expansion Rate removed

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
    // Potencializar (product-level revenue) - acquisition, expansion and total rows
    addRow('$ Receita Aquisição Potencializar', monthlyData.map(m => TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.potencializar ?? 0), 0)));
    addRow('$ Receita Expansão Potencializar', monthlyData.map(m => TIERS.reduce((s, tier) => s + (m.expansionRevenue?.[tier]?.potencializar ?? 0), 0)));
    // Combined total (Acquisition + Expansion) for Potencializar
    addRow('$ Receita Total Potencializar (All)', monthlyData.map(m => TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.potencializar ?? 0) + (m.expansionRevenue?.[tier]?.potencializar ?? 0), 0)));
    addRow('$ RECEITA TOTAL', monthlyData.map(m => m.totalRevenue));

    // CAPACITY PLAN
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['PLANO DE CAPACIDADE', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    addRow('# Clientes Saber', monthlyData.map(m => m.capacityPlan.totalClientsSaber));
    addRow('# Squads Saber', monthlyData.map(m => m.capacityPlan.squadsSaber));
    addRow('# HC Saber', monthlyData.map(m => m.capacityPlan.hcSaber));
    addRow('# Clientes Executar', monthlyData.map(m => m.capacityPlan.totalClientsExecutar));
    addRow('# Squads Executar', monthlyData.map(m => m.capacityPlan.squadsExecutar));
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
    // '# Total Contratações (com realocação)' será renderizado depois das linhas de Sales
    addRow('$ Receita/HC', monthlyData.map(m => m.capacityPlan.revenuePerHC));
    // Sales guidance (SDR / Closers) - não contam no totalHC
    addRow('# Sales: SDR Required', monthlyData.map(m => m.capacityPlan.salesSDRRequired ?? 0));
    addRow('# Sales: Closers Required', monthlyData.map(m => m.capacityPlan.salesClosersRequired ?? 0));
    addRow('# Sales: Current SDR', monthlyData.map(m => m.capacityPlan.salesCurrentSDR ?? 0));
    addRow('# Sales: Current Closers', monthlyData.map(m => m.capacityPlan.salesCurrentClosers ?? 0));
    addRow('# Contratações Sales', monthlyData.map(m => m.capacityPlan.salesHires ?? 0));

    // '# Total Contratações (com realocação)' movido para após Sales e somando hires de Sales
    addRow('# Total Contratações (com realocação)', monthlyData.map(m => (m.capacityPlan.totalHiresWithRedeployment || 0) + (m.capacityPlan.salesHires || 0)));

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
            {/* <div>
              <span className="text-muted-foreground">WONs:</span>
              <span className="ml-2 font-mono text-number">
                {formatNumber(annualTotals.totalWons)}
              </span>
            </div> */}

            <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            {isAuthenticated && (
              <Button onClick={handleOpenSetPassword} variant="destructive" size="sm" className="gap-2">
                Bloquear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* If not authenticated, show blocking modal (simple client-side password) */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Esta simulação está bloqueada</h3>
            <p className="text-sm text-muted-foreground mb-4">Insira a senha para acessar esta tela.</p>
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Senha"
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setPasswordInput(''); }}>Limpar</Button>
              <Button size="sm" onClick={handleUnlock}>Entrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Set password modal (shown when user clicks Bloquear) */}
      {showSetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Bloquear simulação</h3>
            <p className="text-sm text-muted-foreground mb-4">Defina uma senha que será exigida para abrir esta simulação.</p>
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Senha"
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowSetPasswordModal(false); setPasswordInput(''); }}>Cancelar</Button>
              <Button variant="ghost" size="sm" onClick={handleRemovePassword}>Remover senha</Button>
              <Button size="sm" onClick={() => handleSetPassword(passwordInput)}>Bloquear</Button>
            </div>
          </div>
        </div>
      )}

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
                <RowHeader label="Media Budget" tooltip={TOOLTIPS.investment} />
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
                <RowHeader label="CPL (Cost per Lead)" tooltip={TOOLTIPS.cpl} />
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

              {/* Leads */}
              <div className="flex row-hover">
                <RowHeader label="# Leads" tooltip={TOOLTIPS.leads} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.totalLeads}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((s, m) => s + m.totalLeads, 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              {/* CPMQL */}
              <div className="flex row-hover">
                <RowHeader label="CPMQL (Cost per MQL)" tooltip="Custo por Lead Qualificado pelo Marketing" />
                {monthlyData.map((m, i) => {
                  const totalMQLs = Object.values(m.mqls).reduce((s, v) => s + v, 0);
                  const invest = inputs.topline.investmentMonthly[i] || 0;
                  const cpmql = totalMQLs > 0 ? invest / totalMQLs : 0;
                  return (
                    <SpreadsheetCell
                      key={i}
                      value={cpmql}
                      format="currency"
                    />
                  );
                })}
                <SpreadsheetCell
                  value={(
                    inputs.topline.investmentMonthly.reduce((s, v) => s + (v || 0), 0) /
                    (monthlyData.reduce((s, m) => s + Object.values(m.mqls).reduce((a, b) => a + b, 0), 0) || 1)
                  )}
                  format="currency"
                  className="spreadsheet-total"
                />
              </div>

              {/* Lead -> MQL Rate */}
              <div className="flex row-hover">
                <RowHeader label="% Lead → MQL" tooltip={TOOLTIPS.leadToMqlRate} />
                {MONTHS.map((_, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={inputs.topline.leadToMqlRate[i] ?? 0.8}
                    onChange={(v) => updateToplineMonthly('leadToMqlRate', i, v)}
                    editable
                    format="percentage"
                  />
                ))}
                <SpreadsheetCell
                  value={(inputs.topline.leadToMqlRate.reduce((s, n) => s + (n || 0), 0) / 12)}
                  format="percentage"
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

              {/* Total SQLs (derived) */}
              <div className="flex row-hover">
                <RowHeader label="# Total SQLs" tooltip={TOOLTIPS.sqls} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={Object.values(m.sqls).reduce((s, v) => s + v, 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + Object.values(m.sqls).reduce((s, v) => s + v, 0), 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              {/* Total SALs (derived) */}
              <div className="flex row-hover">
                <RowHeader label="# Total SALs" tooltip={TOOLTIPS.sals} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={Object.values(m.sals).reduce((s, v) => s + v, 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + Object.values(m.sals).reduce((s, v) => s + v, 0), 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              {/* Total Activations (derived) */}
              <div className="flex row-hover">
                <RowHeader label="# Ativações" tooltip={TOOLTIPS.activations} />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={Object.values(m.activations).reduce((s, v) => s + v, 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + Object.values(m.activations).reduce((s, v) => s + v, 0), 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              {/* Revenue by Product (Topline summary) */}
              {PRODUCTS.map((product) => (
                <div key={`topline-revenue-${product}`} className="flex row-hover">
                  <RowHeader label={`$ Receita Aquisição ${PRODUCT_LABELS[product]}`} className="pl-4" />
                  {monthlyData.map((m, i) => {
                    const revenue = TIERS.reduce((sum, tier) => sum + (m.revenueByTierProduct?.[tier]?.[product] ?? 0), 0);
                    return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                  })}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.[product] ?? 0), 0), 0)}
                    format="currency"
                    className="spreadsheet-total"
                  />
                </div>
              ))}
            </>
          )}

          {/* CAPACITY PLAN (UI) - Accounts stratification collapsible */}
          <div className="flex">
            <div className="spreadsheet-row-header sticky left-0 z-20 bg-card flex items-center justify-between">
              <button
                onClick={() => toggleSection('capacityPlan')}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80"
              >
                {expandedSections.capacityPlan ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                PLANO DE CAPACIDADE
              </button>
            </div>
            {[...Array(13)].map((_, i) => (
              <div key={`cap-header-${i}`} className="spreadsheet-cell spreadsheet-total" />
            ))}
          </div>

          {expandedSections.capacityPlan && (
            <>
              <div className="flex row-hover">
                <RowHeader label="# Accounts Required" tooltip="Accounts necessários (carteira)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.capacityPlan.accountsRequired ?? 0} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((s, m) => s + (m.capacityPlan.accountsRequired || 0), 0)}
                  format="number"
                  className="spreadsheet-total"
                />
              </div>

              <div className="flex row-hover">
                <div className="spreadsheet-row-header sticky left-0 z-20 bg-card flex items-center">
                  <button
                    onClick={() => setAccountsExpanded(prev => !prev)}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary"
                  >
                    {accountsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Carteira por Tier
                  </button>
                </div>
                {[...Array(13)].map((_, i) => (
                  <div key={`cap-empty-${i}`} className="spreadsheet-cell" />
                ))}
              </div>

              {accountsExpanded && TIERS.map((tier) => (
                <div key={`accounts-tier-${tier}`} className="flex row-hover">
                  <RowHeader label={`  ${TIER_LABELS[tier]}`} className="pl-6" level="tier" tier={tier} />
                  {monthlyData.map((m, i) => (
                    <SpreadsheetCell key={i} value={m.capacityPlan.accountsByTier?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((s, m) => s + (m.capacityPlan.accountsByTier?.[tier] || 0), 0)}
                    format="number"
                    className="spreadsheet-total"
                  />
                </div>
              ))}
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
                    <SpreadsheetCell key={i} value={m.mqls?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + (m.mqls?.[tier] ?? 0), 0)}
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
                    <SpreadsheetCell key={i} value={m.sqls?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + (m.sqls?.[tier] ?? 0), 0)}
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
                    <SpreadsheetCell key={i} value={m.sals?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + (m.sals?.[tier] ?? 0), 0)}
                    format="number"
                    className="spreadsheet-total"
                  />
                </div>
              )}

              {/* SALs Inbound / Outbound breakdown */}
              {(funnelFilter === 'all' || funnelFilter === 'results') && (
                <>
                  <div className="flex row-hover">
                    <RowHeader label="- Inbound SALs" tooltip="SALs geradas a partir dos SQLs (inbound)" className="pl-8" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.salsInbound?.[tier] ?? 0} format="number" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.salsInbound?.[tier] ?? 0), 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                  <div className="flex row-hover">
                    <RowHeader label="- Outbound SALs" tooltip="SALs geradas proativamente pelo time de vendas (outbound)" className="pl-8" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.salsOutbound?.[tier] ?? 0} format="number" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.salsOutbound?.[tier] ?? 0), 0)}
                      format="number"
                      className="spreadsheet-total"
                    />
                  </div>
                </>
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
                    <SpreadsheetCell key={i} value={m.wons?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + (m.wons?.[tier] ?? 0), 0)}
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
                    <SpreadsheetCell key={i} value={m.activations?.[tier] ?? 0} format="number" />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) => sum + (m.activations?.[tier] ?? 0), 0)}
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
                          value={m.directActivations?.[tier]?.[product] ?? 0}
                          format="number"
                        />
                      ))}
                      <SpreadsheetCell
                        value={monthlyData.reduce((sum, m) => sum + (m.directActivations?.[tier]?.[product] ?? 0), 0)}
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
                            value={m.revenueByTierProduct?.[tier]?.[product] ?? 0}
                            format="currency"
                          />
                        ))}
                        <SpreadsheetCell
                          value={monthlyData.reduce((sum, m) => sum + (m.revenueByTierProduct?.[tier]?.[product] ?? 0), 0)}
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
                            value={-(m.activationBreakdown?.[tier]?.[product] ?? 0)}
                            format="currency"
                            className="text-destructive"
                          />
                        ))}
                        <SpreadsheetCell
                          value={-monthlyData.reduce((sum, m) => sum + (m.activationBreakdown?.[tier]?.[product] ?? 0), 0)}
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


              {/* Loyalty Duration Per Tier */}
              {TIERS.map((tier) => (
                <div key={tier} className="flex row-hover">
                  <RowHeader label={`Duração Loyalty (${TIER_LABELS[tier]})`} tooltip={TOOLTIPS.loyaltyDuration} />
                  {MONTHS.map((_, i) => (
                    <SpreadsheetCell
                      key={i}
                      value={inputs.conversionRates.loyaltyDuration[tier] ?? 7}
                      onChange={(v) => {
                        const newDurations = { ...inputs.conversionRates.loyaltyDuration, [tier]: v };
                        onUpdate({
                          ...inputs,
                          conversionRates: { ...inputs.conversionRates, loyaltyDuration: newDurations }
                        });
                      }}
                      editable
                      format="number"
                    />
                  ))}
                  <SpreadsheetCell
                    value={inputs.conversionRates.loyaltyDuration[tier] ?? 7}
                    format="number"
                    className="spreadsheet-total"
                  />
                </div>
              ))}

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
                        value={m.renewals?.[tier]?.[product] ?? 0}
                        format="number"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.renewals?.[tier]?.[product] ?? 0), 0)}
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
                        value={m.renewalRevenue?.[tier]?.[product] ?? 0}
                        format="currency"
                      />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.renewalRevenue?.[tier]?.[product] ?? 0), 0)}
                      format="currency"
                      className="spreadsheet-total"
                    />
                  </div>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}



          {/* === WTP (WILLINGNESS TO PAY) - EXPANSÃO SECTION === */}
          {/* Substitui a antiga seção "EXPANSÕES POR TIER / PRODUTO" */}
          <div className="flex">
            <RowHeader
              label="EXPANSÕES (WTP - SHARE OF WALLET)"
              level="section"
              expanded={expandedSections.expansions}
              onToggle={() => toggleSection('expansions')}
            />
            {[...Array(13)].map((_, i) => (
              <div key={i} className="spreadsheet-cell bg-green-500/10" />
            ))}
          </div>

          {expandedSections.expansions && (
            <>
              {/* Loop por tier para mostrar dados WTP */}
              {TIERS.map(tier => (
                <React.Fragment key={tier}>
                  <div className="flex">
                    <RowHeader label={`WTP ${TIER_LABELS[tier]}`} level="tier" tier={tier} />
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className={`spreadsheet-cell tier-${tier}`} />
                    ))}
                  </div>

                  {/* Annual WTP (editable) */}
                  <div className="flex row-hover">
                    <RowHeader label="$ Annual WTP" className="pl-6" tooltip={`Quanto um cliente ${TIER_LABELS[tier]} pode investir por ano`} />
                    {[...Array(12)].map((_, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={inputs.wtpConfig[tier].annualWTP}
                        format="currency"
                        editable
                        onChange={(val) => onUpdate({
                          ...inputs,
                          wtpConfig: {
                            ...inputs.wtpConfig,
                            [tier]: { ...inputs.wtpConfig[tier], annualWTP: val }
                          }
                        })}
                      />
                    ))}
                    <SpreadsheetCell value={inputs.wtpConfig[tier].annualWTP} format="currency" className="bg-primary/10" />
                  </div>

                  {/* % Share of Wallet Desired (editable per month) */}
                  <div className="flex row-hover">
                    <RowHeader label="% Share of Wallet Desired" className="pl-6" tooltip="Meta de captura do Share of Wallet mensal" />
                    {inputs.wtpConfig[tier].shareOfWalletDesired.map((val, i) => (
                      <SpreadsheetCell
                        key={i}
                        value={val}
                        format="percentage"
                        editable
                        onChange={(newVal) => {
                          const newArray = [...inputs.wtpConfig[tier].shareOfWalletDesired];
                          newArray[i] = newVal;
                          onUpdate({
                            ...inputs,
                            wtpConfig: {
                              ...inputs.wtpConfig,
                              [tier]: { ...inputs.wtpConfig[tier], shareOfWalletDesired: newArray }
                            }
                          });
                        }}
                      />
                    ))}
                    <SpreadsheetCell
                      value={inputs.wtpConfig[tier].shareOfWalletDesired.reduce((a, b) => a + b, 0) / 12}
                      format="percentage"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Debug WTP Medium: tickets e mix usados na expansão */}
                  {tier === 'medium' && (
                    <>
                      <div className="flex row-hover">
                        <RowHeader label="% Mix Expansão (config)" className="pl-6" tooltip="Distribuição usada para expansão (wtpConfig.productDistribution)" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].productDistribution.saber ?? 0}
                            format="percentage"
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].productDistribution.saber ?? 0}
                          format="percentage"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].productDistribution.ter ?? 0}
                            format="percentage"
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].productDistribution.ter ?? 0}
                          format="percentage"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].productDistribution.executarNoLoyalty ?? 0}
                            format="percentage"
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].productDistribution.executarNoLoyalty ?? 0}
                          format="percentage"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].productDistribution.executarLoyalty ?? 0}
                            format="percentage"
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].productDistribution.executarLoyalty ?? 0}
                          format="percentage"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].productDistribution.potencializar ?? 0}
                            format="percentage"
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].productDistribution.potencializar ?? 0}
                          format="percentage"
                          className="bg-primary/10"
                        />
                      </div>

                      <div className="flex row-hover">
                        <RowHeader label="$ Ticket Expansão (config)" className="pl-6" tooltip="Tickets médios de expansão por produto (wtpConfig.expansionTickets)" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].expansionTickets.saber ?? 0}
                            format="currency"
                            editable={true}
                            onChange={(v) => updateWtpExpansionTicket(tier, 'saber', v)}
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].expansionTickets.saber ?? 0}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].expansionTickets.ter ?? 0}
                            format="currency"
                            editable={true}
                            onChange={(v) => updateWtpExpansionTicket(tier, 'ter', v)}
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].expansionTickets.ter ?? 0}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].expansionTickets.executarNoLoyalty ?? 0}
                            format="currency"
                            editable={true}
                            onChange={(v) => updateWtpExpansionTicket(tier, 'executarNoLoyalty', v)}
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].expansionTickets.executarNoLoyalty ?? 0}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].expansionTickets.executarLoyalty ?? 0}
                            format="currency"
                            editable={true}
                            onChange={(v) => updateWtpExpansionTicket(tier, 'executarLoyalty', v)}
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].expansionTickets.executarLoyalty ?? 0}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>
                      <div className="flex row-hover">
                        <RowHeader label="" className="pl-10 text-muted-foreground" />
                        {MONTHS.map((_, i) => (
                          <SpreadsheetCell
                            key={i}
                            value={inputs.wtpConfig[tier].expansionTickets.potencializar ?? 0}
                            format="currency"
                            editable={true}
                            onChange={(v) => updateWtpExpansionTicket(tier, 'potencializar', v)}
                          />
                        ))}
                        <SpreadsheetCell
                          value={inputs.wtpConfig[tier].expansionTickets.potencializar ?? 0}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>

                      <div className="flex row-hover bg-muted/20">
                        <RowHeader label="Ticket Médio Expansão (mix)" className="pl-6" tooltip="Soma(mix × ticket expansão). Igual ao usado para #Expansões = goal / ticket_médio" />
                        {MONTHS.map((_, i) => {
                          const dist = inputs.wtpConfig[tier].productDistribution;
                          const tks = inputs.wtpConfig[tier].expansionTickets;
                          const avg =
                            (dist.saber ?? 0) * (tks.saber ?? 0) +
                            (dist.ter ?? 0) * (tks.ter ?? 0) +
                            (dist.executarNoLoyalty ?? 0) * (tks.executarNoLoyalty ?? 0) +
                            (dist.executarLoyalty ?? 0) * (tks.executarLoyalty ?? 0) +
                            (dist.potencializar ?? 0) * (tks.potencializar ?? 0);
                          return <SpreadsheetCell key={i} value={avg} format="currency" />;
                        })}
                        <SpreadsheetCell
                          value={(() => {
                            const dist = inputs.wtpConfig[tier].productDistribution;
                            const tks = inputs.wtpConfig[tier].expansionTickets;
                            return (
                              (dist.saber ?? 0) * (tks.saber ?? 0) +
                              (dist.ter ?? 0) * (tks.ter ?? 0) +
                              (dist.executarNoLoyalty ?? 0) * (tks.executarNoLoyalty ?? 0) +
                              (dist.executarLoyalty ?? 0) * (tks.executarLoyalty ?? 0) +
                              (dist.potencializar ?? 0) * (tks.potencializar ?? 0)
                            );
                          })()}
                          format="currency"
                          className="bg-primary/10"
                        />
                      </div>
                    </>
                  )}

                  {/* Calculated: # Go Lives */}
                  <div className="flex row-hover">
                    <RowHeader label="# Go Lives (Ativações)" className="pl-6" tooltip="Clientes que ativaram no mês" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.goLiveClients ?? 0} format="number" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.wtpData?.[tier]?.goLiveClients ?? 0), 0)}
                      format="number"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: $ Total Share of Wallet */}
                  <div className="flex row-hover">
                    <RowHeader label="$ Total Share of Wallet" className="pl-6" tooltip="WTP × Total de clientes acumulados" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.totalShareOfWallet ?? 0} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData[11]?.wtpData?.[tier]?.totalShareOfWallet ?? 0}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: $ Share of Wallet Actived */}
                  <div className="flex row-hover">
                    <RowHeader label="$ Share of Wallet Actived" className="pl-6" tooltip="Receita já capturada (acumulada)" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.shareOfWalletActived ?? 0} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData[11]?.wtpData?.[tier]?.shareOfWalletActived ?? 0}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: $ Expansion Goal */}
                  <div className="flex row-hover">
                    <RowHeader label="$ Expansion Goal" className="pl-6" tooltip="Meta de expansão do mês" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.expansionGoal ?? 0} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.wtpData?.[tier]?.expansionGoal ?? 0), 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: # Expansions */}
                  <div className="flex row-hover">
                    <RowHeader label="# Expansões WTP" className="pl-6" tooltip="Número de expansões no mês" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.numExpansions ?? 0} format="number" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.wtpData?.[tier]?.numExpansions ?? 0), 0)}
                      format="number"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: $ Revenue Expansion */}
                  <div className="flex row-hover bg-green-500/5">
                    <RowHeader label="$ Receita Expansão WTP" className="pl-6 font-semibold text-green-600" tooltip="Receita de expansão WTP no mês" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.revenueExpansion ?? 0} format="currency" className="text-green-600" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.wtpData?.[tier]?.revenueExpansion ?? 0), 0)}
                      format="currency"
                      className="bg-green-500/20 font-semibold text-green-600"
                    />
                  </div>

                  {/* Calculated: % Saturation Index */}
                  <div className="flex row-hover">
                    <RowHeader label="% Índice Saturação" className="pl-6" tooltip="% do WTP já capturado" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.saturationIndex ?? 0} format="percentage" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData[11]?.wtpData?.[tier]?.saturationIndex ?? 0}
                      format="percentage"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: % Monetization Potential */}
                  <div className="flex row-hover">
                    <RowHeader label="% Potencial Monetização" className="pl-6" tooltip="% ainda disponível para captura" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.monetizationPotential ?? 0} format="percentage" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData[11]?.wtpData?.[tier]?.monetizationPotential ?? 0}
                      format="percentage"
                      className="bg-primary/10"
                    />
                  </div>

                  {/* Calculated: $ Expansão Potencializar (expansion revenue per tier) */}
                  <div className="flex row-hover">
                    <RowHeader label="$ Expansão Potencializar" className="pl-6" tooltip="Valor de expansão associado ao produto Potencializar (se existir)" />
                    {monthlyData.map((m, i) => (
                      <SpreadsheetCell key={i} value={m.expansionRevenue?.[tier]?.potencializar ?? 0} format="currency" />
                    ))}
                    <SpreadsheetCell
                      value={monthlyData.reduce((sum, m) => sum + (m.expansionRevenue?.[tier]?.potencializar ?? 0), 0)}
                      format="currency"
                      className="bg-primary/10"
                    />
                  </div>
                </React.Fragment>
              ))}

              {/* TOTAL WTP Expansion Revenue */}
              <div className="flex row-hover bg-green-500/10">
                <RowHeader label="$ TOTAL RECEITA EXPANSÃO WTP" className="font-bold text-green-600" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.totalWTPExpansionRevenue}
                    format="currency"
                    className="font-bold text-green-600"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + m.totalWTPExpansionRevenue, 0)}
                  format="currency"
                  className="bg-green-500/20 font-bold text-green-600"
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
                  const revenue = TIERS.reduce((sum, tier) => sum + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty ?? 0), 0);
                  return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty ?? 0), 0), 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="$ Receita Aq. Executar L" tooltip="Receita de clientes Executar Loyalty (aquisição direta)" className="pl-4" />
                {monthlyData.map((m, i) => {
                  const revenue = TIERS.reduce((sum, tier) => sum + (m.revenueByTierProduct?.[tier]?.executarLoyalty ?? 0), 0);
                  return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.executarLoyalty ?? 0), 0), 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="$ Receita Base Legada Executar" tooltip="Receita recorrente da base legada (todos Executar)" className="pl-4" />
                {monthlyData.map((m, i) => {
                  const legacyBase = TIERS.reduce((sum, tier) => sum + (m.legacyRevenue?.[tier] ?? 0), 0);
                  const legacyExpansion = TIERS.reduce((sum, tier) => sum + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                  return <SpreadsheetCell key={i} value={legacyBase - legacyExpansion} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => {
                    const legacyBase = TIERS.reduce((s, tier) => s + (m.legacyRevenue?.[tier] ?? 0), 0);
                    const legacyExpansion = TIERS.reduce((s, tier) => s + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
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
                  const acquisitionExpansion = m.totalExpansionRevenue ?? 0;
                  const legacyExpansion = TIERS.reduce((sum, tier) => sum + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                  return <SpreadsheetCell key={i} value={acquisitionExpansion + legacyExpansion} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => {
                    const acquisitionExpansion = m.totalExpansionRevenue ?? 0;
                    const legacyExpansion = TIERS.reduce((s, tier) => s + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
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
                  const revenue = TIERS.reduce((sum, tier) => sum + (m.revenueByTierProduct?.[tier]?.saber ?? 0), 0);
                  return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.saber ?? 0), 0), 0)}
                  format="currency"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-muted/20">
                <RowHeader label="$ Receita Aq. Ter" tooltip="Receita de clientes Ter (aquisição direta)" className="pl-4 font-semibold" />
                {monthlyData.map((m, i) => {
                  const revenue = TIERS.reduce((sum, tier) => sum + (m.revenueByTierProduct?.[tier]?.ter ?? 0), 0);
                  return <SpreadsheetCell key={i} value={revenue} format="currency" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.ter ?? 0), 0), 0)}
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
                    sum + (m.revenueByTierProduct?.[tier]?.executarLoyalty ?? 0)
                    + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty ?? 0)
                    + (m.revenueByTierProduct?.[tier]?.ter ?? 0), 0);
                  const legacyBase = TIERS.reduce((sum, tier) => sum + (m.legacyRevenue?.[tier] ?? 0), 0);
                  const allExpansions = (m.totalExpansionRevenue ?? 0) + TIERS.reduce((sum, tier) => sum + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                  const total = executarRevenue + legacyBase + (m.totalRenewalRevenue ?? 0) + allExpansions;
                  return <SpreadsheetCell key={i} value={total} format="currency" className="font-semibold" />;
                })}
                <SpreadsheetCell
                  value={(() => {
                    return monthlyData.reduce((sum, m) => {
                      const executarRevenue = TIERS.reduce((s, tier) =>
                        s + (m.revenueByTierProduct?.[tier]?.executarLoyalty ?? 0)
                        + (m.revenueByTierProduct?.[tier]?.executarNoLoyalty ?? 0)
                        + (m.revenueByTierProduct?.[tier]?.ter ?? 0), 0);
                      const legacyBase = TIERS.reduce((s, tier) => s + (m.legacyRevenue?.[tier] ?? 0), 0);
                      const allExpansions = (m.totalExpansionRevenue ?? 0) + TIERS.reduce((s, tier) => s + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                      return sum + executarRevenue + legacyBase + (m.totalRenewalRevenue ?? 0) + allExpansions;
                    }, 0);
                  })()}
                  format="currency"
                  className="bg-primary/20 font-bold"
                />
              </div>

              {/* Potencializar (product-level revenue totals) - inserted directly below Total Executar for visibility */}
              <div className="flex row-hover">
                <RowHeader label="$ Receita Total Potencializar (All)" tooltip="Receita total Potencializar (Aquisição + Expansão)" className="pl-4 font-bold" />
                {monthlyData.map((m, i) => {
                  const revenue = TIERS.reduce((sum, tier) =>
                    sum + (m.revenueByTierProduct?.[tier]?.potencializar ?? 0) + (m.expansionRevenue?.[tier]?.potencializar ?? 0), 0);
                  return <SpreadsheetCell key={i} value={revenue} format="currency" className="font-semibold" />;
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.revenueByTierProduct?.[tier]?.potencializar ?? 0) + (m.expansionRevenue?.[tier]?.potencializar ?? 0), 0), 0)}
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

              {/* Macros solicitadas: Aquisição, Renovação, Expansão */}
              <div className="flex row-hover bg-muted/10">
                <RowHeader label="$ Receita Aquisição" className="font-semibold" tooltip="Total de receita de aquisição (nova)" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.totalNewRevenue}
                    format="currency"
                    className="font-semibold"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((s, m) => s + m.totalNewRevenue, 0)}
                  format="currency"
                  className="bg-muted/20 font-semibold"
                />
              </div>

              <div className="flex row-hover bg-muted/10">
                <RowHeader label="$ Receita Renew" className="font-semibold" tooltip="Total de receita de renovação" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={m.totalRenewalRevenue}
                    format="currency"
                    className="font-semibold"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((s, m) => s + m.totalRenewalRevenue, 0)}
                  format="currency"
                  className="bg-muted/20 font-semibold"
                />
              </div>

              <div className="flex row-hover bg-muted/10">
                <RowHeader label="$ Receita Expansão" className="font-semibold" tooltip="Total de receita de expansão (aquisição + legada)" />
                {monthlyData.map((m, i) => {
                  const legacyExp = TIERS.reduce((sum, tier) => sum + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                  const totalExp = (m.totalExpansionRevenue ?? 0) + legacyExp;
                  return (
                    <SpreadsheetCell
                      key={i}
                      value={totalExp}
                      format="currency"
                      className="font-semibold"
                    />
                  );
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((s, m) => {
                    const legacyExp = TIERS.reduce((sum, tier) => sum + (m.legacyExpansionRevenue?.[tier] ?? 0), 0);
                    return s + (m.totalExpansionRevenue ?? 0) + legacyExp;
                  }, 0)}
                  format="currency"
                  className="bg-muted/20 font-semibold"
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
                    value={TIERS.reduce((sum, tier) => sum + (m.activeClients?.[tier]?.executarNoLoyalty ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeClients?.[tier]?.executarNoLoyalty ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Total Clientes Aq. Executar L" tooltip="Clientes Executar Loyalty (aquisição direta)" className="pl-4" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.activeClients?.[tier]?.executarLoyalty ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeClients?.[tier]?.executarLoyalty ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Total Clientes Saber > Executar NL" tooltip="Clientes convertidos de Saber para Executar No-Loyalty" className="pl-4" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.conversions?.[tier]?.noLoyalty ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].conversions?.[tier]?.noLoyalty ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Total Clientes Saber > Executar L" tooltip="Clientes convertidos de Saber para Executar Loyalty" className="pl-4" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.conversions?.[tier]?.loyalty ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].conversions?.[tier]?.loyalty ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="Total Clientes Base Legada Executar" tooltip="Clientes da base legada (todos os tiers)" className="pl-4" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.legacyClients?.[tier] ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].legacyClients?.[tier] ?? 0), 0) : 0}
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
                    value={TIERS.reduce((sum, tier) => sum + (m.activeClients?.[tier]?.saber ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeClients?.[tier]?.saber ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-muted/20">
                <RowHeader label="Total Clientes Aq. Ter" tooltip="Clientes Ter (aquisição direta)" className="pl-4 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.activeClients?.[tier]?.ter ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeClients?.[tier]?.ter ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-muted/20">
                <RowHeader label="Total Clientes Exp. Saber" tooltip="Clientes de expansão da base ativa (Saber)" className="pl-4 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.activeBaseExpansions?.[tier]?.saber ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeBaseExpansions?.[tier]?.saber ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/10"
                />
              </div>

              <div className="flex row-hover bg-muted/20">
                <RowHeader label="Total Clientes Exp. Ter" tooltip="Clientes de expansão da base ativa (Ter)" className="pl-4 font-semibold" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.activeBaseExpansions?.[tier]?.ter ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].activeBaseExpansions?.[tier]?.ter ?? 0), 0) : 0}
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

              <div className="flex row-hover bg-primary/10">
                <RowHeader label="# Total Clientes Potencializar (All)" tooltip="Total de clientes do produto Potencializar (aquisição + expansão)" className="pl-4 font-bold" />
                {monthlyData.map((m, i) => {
                  const total = TIERS.reduce((sum, tier) =>
                    sum + (m.activeClients?.[tier]?.potencializar ?? 0) + (m.activeBaseExpansions?.[tier]?.potencializar ?? 0), 0);
                  return <SpreadsheetCell key={i} value={total} format="number" className="font-semibold" />;
                })}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) =>
                    sum + (monthlyData[11].activeClients?.[tier]?.potencializar ?? 0) + (monthlyData[11].activeBaseExpansions?.[tier]?.potencializar ?? 0), 0) : 0}
                  format="number"
                  className="bg-primary/20 font-bold"
                />
              </div>

              <div className="flex row-hover bg-primary/5">
                <RowHeader label="# CLIENTES ATIVOS TOTAL" tooltip="Todos os clientes ativos (legada + aquisição)" className="font-bold text-primary" />
                {monthlyData.map((m, i) => {
                  const totalActive = TIERS.reduce((sum, tier) =>
                    sum +
                    PRODUCTS.reduce((s, p) => s + (m.activeClients[tier]?.[p] ?? 0), 0) +
                    PRODUCTS.reduce((s, p) => s + (m.activeBaseExpansions[tier]?.[p] ?? 0), 0) +
                    (m.legacyClients[tier] ?? 0)
                    , 0);

                  return (
                    <SpreadsheetCell
                      key={i}
                      value={totalActive}
                      format="number"
                      className="font-bold text-primary"
                    />
                  );
                })}
                <SpreadsheetCell
                  value={monthlyData.reduce((acc, m) => {
                    const monthTotal = TIERS.reduce((sum, tier) =>
                      sum +
                      PRODUCTS.reduce((s, p) => s + (m.activeClients[tier]?.[p] ?? 0), 0) +
                      PRODUCTS.reduce((s, p) => s + (m.activeBaseExpansions[tier]?.[p] ?? 0), 0) +
                      (m.legacyClients[tier] ?? 0)
                      , 0);
                    return acc + monthTotal;
                  }, 0)}
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
                      sum + PRODUCTS.reduce((s, product) => s + (m.activeClients?.[tier]?.[product] ?? 0), 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) =>
                    sum + TIERS.reduce((tierSum, tier) =>
                      tierSum + PRODUCTS.reduce((s, product) => s + (m.activeClients?.[tier]?.[product] ?? 0), 0), 0), 0)}
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
                      sum + PRODUCTS.reduce((s, product) => s + (m.expansions?.[tier]?.[product] ?? 0), 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) =>
                    sum + TIERS.reduce((tierSum, tier) =>
                      tierSum + PRODUCTS.reduce((s, product) => s + (m.expansions?.[tier]?.[product] ?? 0), 0), 0), 0)}
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
                      sum + (m.conversions?.[tier]?.loyalty ?? 0) + (m.conversions?.[tier]?.noLoyalty ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) =>
                    sum + TIERS.reduce((tierSum, tier) =>
                      tierSum + (m.conversions?.[tier]?.loyalty ?? 0) + (m.conversions?.[tier]?.noLoyalty ?? 0), 0), 0)}
                  format="number"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="# Base Legada" tooltip="Clientes da base legada (diminui com churn)" className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell
                    key={i}
                    value={TIERS.reduce((sum, tier) => sum + (m.legacyClients?.[tier] ?? 0), 0)}
                    format="number"
                  />
                ))}
                <SpreadsheetCell
                  value={monthlyData[11] ? TIERS.reduce((sum, tier) => sum + (monthlyData[11].legacyClients?.[tier] ?? 0), 0) : 0}
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
                      value={TIERS.reduce((sum, tier) => sum + (m.activeClients?.[tier]?.[product] ?? 0), 0)}
                      format="number"
                    />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) =>
                      sum + TIERS.reduce((s, tier) => s + (m.activeClients?.[tier]?.[product] ?? 0), 0), 0)}
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
                      value={PRODUCTS.reduce((sum, product) => sum + (m.activeClients?.[tier]?.[product] ?? 0), 0)}
                      format="number"
                    />
                  ))}
                  <SpreadsheetCell
                    value={monthlyData.reduce((sum, m) =>
                      sum + PRODUCTS.reduce((s, product) => s + (m.activeClients?.[tier]?.[product] ?? 0), 0), 0)}
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
              <div className="flex row-hover">
                <RowHeader
                  label="# Accounts (carteira)"
                  tooltip="Clientes por account: Ent 15, Large 33, Medium 50, Small/Tiny 100"
                  className="pl-6 font-semibold"
                />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.capacityPlan.accountsRequired ?? 0} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.accountsRequired ?? 0), 0)}
                  format="number"
                  className="bg-primary/10 font-semibold"
                />
              </div>

              <div className="flex row-hover">
                <RowHeader label="# Sales: SDR Required" tooltip="Estimativa simples (200 MQL por SDR)" className="pl-6" />
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
                <RowHeader label="# Sales: Closers Required" tooltip="Estimativa simples (50 SAL por Closer)" className="pl-6" />
                {monthlyData.map((m, i) => (
                  <SpreadsheetCell key={i} value={m.capacityPlan.salesClosersRequired ?? 0} format="number" />
                ))}
                <SpreadsheetCell
                  value={monthlyData.reduce((sum, m) => sum + (m.capacityPlan.salesClosersRequired ?? 0), 0)}
                  format="number"
                  className="bg-primary/10"
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
