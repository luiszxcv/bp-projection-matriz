import { SimulationInputs, MonthlyData, Tier, ProductDistribution, TierDistribution, Product, CapacityPlanData, DREData, DREConfig, SalesMetrics, PendingRevenueTracking } from '@/types/simulation';

const TIERS: Tier[] = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS: Product[] = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];

// Helper: get value from number or array (for monthly CSP salaries with ramp)
const getMonthlyValue = (value: number | number[], monthIndex: number): number => {
  return Array.isArray(value) ? value[monthIndex] : value;
};

const createEmptyTierDistribution = (): TierDistribution => ({
  enterprise: 0,
  large: 0,
  medium: 0,
  small: 0,
  tiny: 0,
});

const createEmptyProductDistribution = (): ProductDistribution => ({
  saber: 0,
  ter: 0,
  executarNoLoyalty: 0,
  executarLoyalty: 0,
  potencializar: 0,
});

const createEmptyTierProductRecord = (): Record<Tier, ProductDistribution> => ({
  enterprise: createEmptyProductDistribution(),
  large: createEmptyProductDistribution(),
  medium: createEmptyProductDistribution(),
  small: createEmptyProductDistribution(),
  tiny: createEmptyProductDistribution(),
});

const createEmptyCapacityPlanData = (): CapacityPlanData => ({
  clientsSaberByTier: createEmptyTierDistribution(),
  totalClientsSaber: 0,
  clientsExecutarByTier: createEmptyTierDistribution(),
  totalClientsExecutar: 0,
  totalHoursSaber: 0,
  totalHoursExecutar: 0,
  squadsSaber: 0,
  squadsExecutar: 0,
  totalSquads: 0,
  hcSaber: 0,
  hcExecutar: 0,
  totalHC: 0,
  turnoverRate: 0.07, // 7% default
  turnoverSaber: 0,
  turnoverExecutar: 0,
  totalTurnover: 0,
  hiresSaber: 0,
  hiresExecutar: 0,
  totalHires: 0,
  redeployableFromExecutar: 0,
  hiresSaberWithRedeployment: 0,
  totalHiresWithRedeployment: 0,
  revenuePerHC: 0,
  hoursUtilizationSaber: 0,
  hoursUtilizationExecutar: 0,
});

const createEmptyDREData = (month: number): DREData => ({
  month,
  revenue: 0,
  activationRevenue: 0,
  renewalRevenue: 0,
  expansionRevenue: 0,
  legacyRevenue: 0,
  activationRevenueDFC: 0,
  activationExecutarLoyaltyDFC: 0,
  activationExecutarNoLoyaltyDFC: 0,
  activationSaberConvLoyaltyDFC: 0,
  activationSaberConvNoLoyaltyDFC: 0,
  activationOutrosProdutos: 0,
  inadimplencia: 0,
  churnM0Falcons: 0,
  churnRecebimentoOPS: 0,
  devolucoesSaber: 0,
  performanceConversao: 0,
  receitaBrutaRecebida: 0,
  royalties: 0,
  iss: 0,
  irrf: 0,
  pis: 0,
  cofins: 0,
  totalImpostos: 0,
  receitaLiquida: 0,
  cspExecutar: 0,
  cspExecutarDireto: 0,
  cspExecutarOverhead: 0,
  cspSaber: 0,
  cspSaberDireto: 0,
  cspSaberOverhead: 0,
  cspTer: 0,
  cspTotal: 0,
  percentualCSP: 0,
  margemOperacional: 0,
  percentualMargemOperacional: 0,
  salesMetrics: {} as SalesMetrics, // Será calculado depois
  totalMarketingVendas: 0,
  investimentoMarketingAmortizado: 0,
  margemContribuicao: 0,
  percentualMargemContribuicao: 0,
  despesasTimeAdm: 0,
  despesasCustosAdm: 0,
  despesasTech: 0,
  despesasUtilities: 0,
  despesasPessoas: 0,
  viagensAdmin: 0,
  despesasSoftwares: 0,
  despesasServicosTerceirizados: 0,
  totalDespesasAdm: 0,
  ebitda: 0,
  percentualEBITDA: 0,
  despesasFinanceiras: 0,
  receitasFinanceiras: 0,
  ebit: 0,
  irpj: 0,
  csll: 0,
  lucroLiquido: 0,
  percentualLucroLiquido: 0,
  lucroPeríodo: 0,
  contasAReceberBookado: 0,
  taxasRoyaltiesBookado: 0,
  depreciacao: 0,
  caixaOperacional: 0,
  compraAtivoIntangivel: 0,
  caixaInvestimento: 0,
  pagamentoFinanciamento: 0,
  distribuicaoDividendos: 0,
  caixaFinanciamento: 0,
  saldoCaixaMes: 0,
  caixaInicial: 0,
  caixaFinal: 0,
  caixaEfetivo: 0,
  cac: 0,
  clv: 0,
  roi: 0,
  quantidadeClientes: 0,
});

// Retorna o valor amortizado do investimento de marketing para um mês específico
export function getAmortizedInvestment(investments: number[], monthIndex: number, duration = 6): number {
  if (!investments || investments.length === 0) return 0;
  let sum = 0;
  for (let j = 0; j < investments.length; j++) {
    const start = j;
    const end = j + duration - 1; // inclusive
    if (monthIndex >= start && monthIndex <= end) {
      sum += investments[j] / duration;
    }
  }
  return sum;
}

export function calculateMonthlyData(inputs: SimulationInputs): MonthlyData[] {
  const months: MonthlyData[] = [];
  
  // Validate inputs
  if (!inputs.topline.investmentMonthly || inputs.topline.investmentMonthly.length !== 12) {
    throw new Error('`topline.investmentMonthly` must be an array of 12 numbers.');
  }
  if (!inputs.topline.cplMonthly || inputs.topline.cplMonthly.length !== 12) {
    throw new Error('`topline.cplMonthly` must be an array of 12 numbers.');
  }
  for (const tier of TIERS) {
    const m = inputs.tierMetrics[tier];
    if (!m.mqlDistribution || m.mqlDistribution.length !== 12) {
      throw new Error(`\`tierMetrics.${tier}.mqlDistribution\` must be an array of 12 numbers.`);
    }
  }
  
  // Track active clients over time for renewals and expansions
  let activeExecutarLoyalty: Record<Tier, { clients: number; month: number; renewals: number }[]> = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: [],
  };
  
  let activeExecutarNoLoyalty: Record<Tier, { clients: number; month: number; renewals: number }[]> = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: [],
  };
  
  let pendingSaberConversions: Record<Tier, { clients: number; month: number }[]> = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: [],
  };
  
  // Track pending revenue for DFC view
  let pendingDFCRevenue: PendingRevenueTracking[] = [];
  
  // Legacy base tracking
  let legacyClients = { ...inputs.legacyBase };
  // Sales running headcount (contratações persistem entre meses)
  let runningSDR = inputs.dreConfig.currentSDR ?? 1;
  let runningClosers = inputs.dreConfig.currentClosers ?? 2;
  // Hires scheduled this month that will onboard next month
  let pendingHiresSDR = 0;
  let pendingHiresClosers = 0;
  

  for (let month = 1; month <= 12; month++) {
    const idx = month - 1;
    const monthData: MonthlyData = {
      month,
      mqls: createEmptyTierDistribution(),
      sqls: createEmptyTierDistribution(),
      sals: createEmptyTierDistribution(),
      wons: createEmptyTierDistribution(),
      activations: createEmptyTierDistribution(),
      revenueByTierProduct: createEmptyTierProductRecord(),
      activeClients: createEmptyTierProductRecord(),
      directActivations: createEmptyTierProductRecord(),
      activationBreakdown: createEmptyTierProductRecord(),
      legacyClients: createEmptyTierDistribution(),
      legacyRevenueBeforeChurn: createEmptyTierDistribution(),
      legacyRevenue: createEmptyTierDistribution(),
      legacyExpansionRevenue: createEmptyTierDistribution(),
      legacyExpansionByProduct: createEmptyTierProductRecord(),
      renewals: createEmptyTierProductRecord(),
      renewalRevenue: createEmptyTierProductRecord(),
      activeBaseExpansions: createEmptyTierProductRecord(),
      activeBaseExpansionRevenue: createEmptyTierProductRecord(),
      expansions: createEmptyTierProductRecord(),
      expansionRevenue: createEmptyTierProductRecord(),
      conversions: {
        enterprise: { loyalty: 0, noLoyalty: 0 },
        large: { loyalty: 0, noLoyalty: 0 },
        medium: { loyalty: 0, noLoyalty: 0 },
        small: { loyalty: 0, noLoyalty: 0 },
        tiny: { loyalty: 0, noLoyalty: 0 },
      },
      totalNewRevenue: 0,
      totalRenewalRevenue: 0,
      totalExpansionRevenue: 0,
      totalLegacyRevenue: 0,
      totalLegacyRenewalRevenue: 0,
      totalLegacyExpansionRevenue: 0,
      totalRevenue: 0,
      totalActiveClients: 0,
      capacityPlan: createEmptyCapacityPlanData(),
      dre: {} as any, // Será preenchido posteriormente
    };
    
    // Get monthly values
    const investmentForMonth = inputs.topline.investmentMonthly[idx];
    const cplForMonth = inputs.topline.cplMonthly[idx];
    
    if (!cplForMonth || cplForMonth <= 0) {
      throw new Error(`\`topline.cplMonthly[${idx}]\` must be a positive number.`);
    }
    
    const totalMQLsForMonth = Math.round(investmentForMonth / cplForMonth);
    
    // Calculate funnel for each tier
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      
      // Get monthly metrics
      const mqlDistribution = metrics.mqlDistribution[idx];
      const mqlToSqlRate = metrics.mqlToSqlRate[idx];
      const sqlToSalRate = metrics.sqlToSalRate[idx];
      const salToWonRate = metrics.salToWonRate[idx];
      const activationRate = metrics.activationRate[idx];
      const revenueActivationRate = metrics.revenueActivationRate[idx];
      
      // MQLs
      const mqls = Math.round(totalMQLsForMonth * mqlDistribution);
      monthData.mqls[tier] = mqls;
      
      // SQLs
      const sqls = Math.round(mqls * mqlToSqlRate);
      monthData.sqls[tier] = sqls;
      
      // SALs
      const sals = Math.round(sqls * sqlToSalRate);
      monthData.sals[tier] = sals;
      
      // WONs
      const wons = Math.round(sals * salToWonRate);
      monthData.wons[tier] = wons;
      
      // Activations - usar floor para garantir que não ultrapasse
      const activations = Math.floor(wons * activationRate);
      
      // Distribute activations across products (not WONs)
      let remainingActivations = activations;
      let lowestTicketIndex = 2; // Default to executarNoLoyalty
      let lowestTicket = Infinity;
      
      // Find lowest non-zero ticket
      for (let pi = 0; pi < PRODUCTS.length; pi++) {
        const product = PRODUCTS[pi];
        const ticket = metrics.productTickets[product][idx];
        const dist = metrics.productDistribution[product][idx];
        if (ticket > 0 && ticket < lowestTicket && dist > 0) {
          lowestTicket = ticket;
          lowestTicketIndex = pi;
        }
      }
      
      // Track total distributed to verify sum
      let totalDistributedActivations = 0;
      
      // Distribute activated clients and calculate revenue
      for (let i = 0; i < PRODUCTS.length; i++) {
        const product = PRODUCTS[i];
        const distribution = metrics.productDistribution[product][idx];
        const ticket = metrics.productTickets[product][idx];
        
        let activatedClients: number;
        if (i === lowestTicketIndex) {
          // Lowest ticket product gets remaining activations
          activatedClients = remainingActivations;
          remainingActivations = 0; // Zero out to prevent subsequent products from getting extra clients
        } else {
          // Distribute proportionally and use floor
          activatedClients = Math.floor(activations * distribution);
          remainingActivations -= activatedClients;
        }
        
        totalDistributedActivations += activatedClients;
        
        // Calcular receita: todos os produtos aplicam revenueActivationRate
        let revenue: number;
        let revenueWithoutBreakdown: number;
        
        if (product === 'executarNoLoyalty') {
          // NoLoyalty: ticket mensal × 2 meses × revenueActivationRate (93%)
          revenueWithoutBreakdown = activatedClients * ticket * inputs.conversionRates.noLoyaltyDuration;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        } else if (product === 'executarLoyalty') {
          // Loyalty: ticket mensal × 7 meses × revenueActivationRate (93%)
          revenueWithoutBreakdown = activatedClients * ticket * inputs.conversionRates.loyaltyDuration;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        } else {
          // Outros produtos (Saber, Ter, Potencializar): ticket direto × revenueActivationRate
          revenueWithoutBreakdown = activatedClients * ticket;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        }
        
        // Calcular valor debitado pela quebra de ativação
        const breakdownAmount = revenueWithoutBreakdown - revenue;
        
        monthData.revenueByTierProduct[tier][product] = revenue;
        monthData.activeClients[tier][product] = activatedClients;
        monthData.directActivations[tier][product] = activatedClients;
        monthData.activationBreakdown[tier][product] = breakdownAmount;
        
        // Track for renewals and DFC
        if (product === 'saber' && activatedClients > 0) {
          pendingSaberConversions[tier].push({ clients: activatedClients, month });
        } else if (product === 'executarLoyalty' && activatedClients > 0) {
          // Registrar para DFC tracking
          const monthlyTicket = metrics.productTickets.executarLoyalty[idx];
          const duration = inputs.conversionRates.loyaltyDuration; // 7 meses
          
          pendingDFCRevenue.push({
            tier,
            product: 'executarLoyalty',
            source: 'acquisition',
            monthlyAmount: activatedClients * monthlyTicket * revenueActivationRate,
            startMonth: month,
            remainingMonths: duration,
            totalAmount: revenue
          });
          
          activeExecutarLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        } else if (product === 'executarNoLoyalty' && activatedClients > 0) {
          // Registrar para DFC tracking
          const monthlyTicket = metrics.productTickets.executarNoLoyalty[idx];
          const duration = inputs.conversionRates.noLoyaltyDuration; // 2 meses
          
          pendingDFCRevenue.push({
            tier,
            product: 'executarNoLoyalty',
            source: 'acquisition',
            monthlyAmount: activatedClients * monthlyTicket * revenueActivationRate,
            startMonth: month,
            remainingMonths: duration,
            totalAmount: revenue
          });
          
          activeExecutarNoLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        }
        
        monthData.totalNewRevenue += revenue;
      }
      
      // Update activations with actual distributed sum
      monthData.activations[tier] = totalDistributedActivations;
    }
    
    // Process Saber → Executar conversions (after 2 months / 60 days)
    for (const tier of TIERS) {
      const conversionsToProcess = pendingSaberConversions[tier].filter(c => month - c.month >= 2);
      const metrics = inputs.tierMetrics[tier];
      const revenueActivationRate = metrics.revenueActivationRate[idx];
      
      for (const conv of conversionsToProcess) {
        const convertingClients = Math.round(conv.clients * inputs.conversionRates.saberToExecutar);
        const loyaltyClients = Math.round(convertingClients * inputs.conversionRates.executarLoyaltyRatio);
        const noLoyaltyClients = convertingClients - loyaltyClients;
        
        // Registrar conversões no monthData
        monthData.conversions[tier].loyalty += loyaltyClients;
        monthData.conversions[tier].noLoyalty += noLoyaltyClients;
        
        // Calcular receita da conversão
        if (loyaltyClients > 0) {
          const monthlyTicket = metrics.productTickets.executarLoyalty[idx];
          const duration = inputs.conversionRates.loyaltyDuration;
          const loyaltyRevenue = loyaltyClients * monthlyTicket * duration;
          
          monthData.revenueByTierProduct[tier].executarLoyalty += loyaltyRevenue;
          monthData.activeClients[tier].executarLoyalty += loyaltyClients;
          monthData.totalNewRevenue += loyaltyRevenue;
          
          // Registrar conversão Loyalty para DFC
          pendingDFCRevenue.push({
            tier,
            product: 'executarLoyalty',
            source: 'conversion',
            monthlyAmount: loyaltyClients * monthlyTicket * revenueActivationRate,
            startMonth: month,
            remainingMonths: duration,
            totalAmount: loyaltyRevenue
          });
          
          activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
        }
        if (noLoyaltyClients > 0) {
          const monthlyTicket = metrics.productTickets.executarNoLoyalty[idx];
          const duration = inputs.conversionRates.noLoyaltyDuration;
          const noLoyaltyRevenue = noLoyaltyClients * monthlyTicket * duration;
          
          monthData.revenueByTierProduct[tier].executarNoLoyalty += noLoyaltyRevenue;
          monthData.activeClients[tier].executarNoLoyalty += noLoyaltyClients;
          monthData.totalNewRevenue += noLoyaltyRevenue;
          
          // Registrar conversão No-Loyalty para DFC
          pendingDFCRevenue.push({
            tier,
            product: 'executarNoLoyalty',
            source: 'conversion',
            monthlyAmount: noLoyaltyClients * monthlyTicket * revenueActivationRate,
            startMonth: month,
            remainingMonths: duration,
            totalAmount: noLoyaltyRevenue
          });
          
          activeExecutarNoLoyalty[tier].push({ clients: noLoyaltyClients, month, renewals: 0 });
        }
      }
      pendingSaberConversions[tier] = pendingSaberConversions[tier].filter(c => month - c.month < 2);
    }
    
    // Process Loyalty renewals (every 7 months, max 2 renewals)
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      for (const cohort of activeExecutarLoyalty[tier]) {
        const monthsSinceStart = month - cohort.month;
        if (monthsSinceStart > 0 && monthsSinceStart % inputs.conversionRates.loyaltyDuration === 0) {
          if (cohort.renewals < inputs.conversionRates.loyaltyMaxRenewals) {
            const renewingClients = Math.round(cohort.clients * inputs.conversionRates.loyaltyRenewalRate);
            // Loyalty: ticket mensal × 7 meses
            const renewalRevenue = renewingClients * metrics.productTickets.executarLoyalty[idx] * inputs.conversionRates.loyaltyDuration;
            
            monthData.renewals[tier].executarLoyalty += renewingClients;
            monthData.renewalRevenue[tier].executarLoyalty += renewalRevenue;
            monthData.totalRenewalRevenue += renewalRevenue;
            
            cohort.renewals++;
          }
        }
      }
    }
    
    // Process No-Loyalty renewals (every 2 months, max 5 renewals)
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      for (const cohort of activeExecutarNoLoyalty[tier]) {
        const monthsSinceStart = month - cohort.month;
        if (monthsSinceStart > 0 && monthsSinceStart % inputs.conversionRates.noLoyaltyDuration === 0) {
          if (cohort.renewals < inputs.conversionRates.noLoyaltyMaxRenewals) {
            const renewingClients = Math.round(cohort.clients * inputs.conversionRates.noLoyaltyRenewalRate);
            // NoLoyalty: ticket mensal × 2 meses
            const renewalRevenue = renewingClients * metrics.productTickets.executarNoLoyalty[idx] * inputs.conversionRates.noLoyaltyDuration;
            
            monthData.renewals[tier].executarNoLoyalty += renewingClients;
            monthData.renewalRevenue[tier].executarNoLoyalty += renewalRevenue;
            monthData.totalRenewalRevenue += renewalRevenue;
            
            cohort.renewals++;
          }
        }
      }
    }
    
    // Calculate expansion from active Executar clients (base ativa)
    for (const tier of TIERS) {
      const totalActiveExecutar = 
        activeExecutarLoyalty[tier].reduce((sum, c) => sum + c.clients, 0) +
        activeExecutarNoLoyalty[tier].reduce((sum, c) => sum + c.clients, 0);
      
      const expandingClients = Math.round(totalActiveExecutar * inputs.conversionRates.expansionRate);
      
      if (expandingClients > 0) {
        const expDist = tier === 'enterprise' || tier === 'large' 
          ? inputs.expansionDistribution.largeEnterprise
          : tier === 'medium' 
            ? inputs.expansionDistribution.medium
            : inputs.expansionDistribution.smallTiny;
        
        const metrics = inputs.tierMetrics[tier];
        
        for (const product of PRODUCTS) {
          const clients = Math.round(expandingClients * expDist[product]);
          const ticket = metrics.productTickets[product][idx];
          
          // Calcular receita: Executar usa ticket mensal × duração do contrato
          let revenue: number;
          if (product === 'executarNoLoyalty') {
            revenue = clients * ticket * inputs.conversionRates.noLoyaltyDuration;
          } else if (product === 'executarLoyalty') {
            revenue = clients * ticket * inputs.conversionRates.loyaltyDuration;
          } else {
            revenue = clients * ticket;
          }
          
          // Registrar expansão da base ativa separadamente
          monthData.activeBaseExpansions[tier][product] += clients;
          monthData.activeBaseExpansionRevenue[tier][product] += revenue;
          
          // Também adicionar ao total combinado (para compatibilidade)
          monthData.expansions[tier][product] += clients;
          monthData.expansionRevenue[tier][product] += revenue;
          monthData.totalExpansionRevenue += revenue;
        }
      }
    }
    
    // Calculate legacy base
    for (const tier of TIERS) {
      const tierLegacy = legacyClients[tier];
      
      // Store revenue before churn
      monthData.legacyRevenueBeforeChurn[tier] = tierLegacy.revenue;
      
      // Apply churn
      const remainingClients = Math.round(tierLegacy.clients * (1 - inputs.legacyBase.churnRate));
      const remainingRevenue = tierLegacy.revenue * (1 - inputs.legacyBase.churnRate);
      
      // Apply expansion
      const expansionRevenue = remainingRevenue * inputs.legacyBase.expansionRate;
      
      // Distribuir expansão por produtos usando expansionDistribution
      const expDist = tier === 'enterprise' || tier === 'large' 
        ? inputs.expansionDistribution.largeEnterprise
        : tier === 'medium' 
          ? inputs.expansionDistribution.medium
          : inputs.expansionDistribution.smallTiny;
      
      // Calcular receita de expansão por produto
      for (const product of PRODUCTS) {
        const productExpansion = expansionRevenue * expDist[product];
        monthData.legacyExpansionByProduct[tier][product] = productExpansion;
      }
      
      monthData.legacyClients[tier] = remainingClients;
      monthData.legacyRevenue[tier] = remainingRevenue + expansionRevenue;
      monthData.legacyExpansionRevenue[tier] = expansionRevenue;
      monthData.totalLegacyRevenue += remainingRevenue + expansionRevenue;
      monthData.totalLegacyExpansionRevenue += expansionRevenue;
      
      // Update for next month
      legacyClients[tier] = {
        clients: remainingClients,
        revenue: remainingRevenue + expansionRevenue,
      };
    }
    
    // Calculate total active clients
    for (const tier of TIERS) {
      for (const product of PRODUCTS) {
        monthData.totalActiveClients += monthData.activeClients[tier][product];
      }
      monthData.totalActiveClients += monthData.legacyClients[tier];
    }
    
    // Separar renewal legado de expansion legado
    monthData.totalLegacyRenewalRevenue = monthData.totalLegacyRevenue - monthData.totalLegacyExpansionRevenue;
    
    // Calculate total revenue
    monthData.totalRevenue = 
      monthData.totalNewRevenue + 
      monthData.totalRenewalRevenue + 
      monthData.totalExpansionRevenue + 
      monthData.totalLegacyRevenue;
    
    // Calculate Capacity Plan
    // Saber: clientes NOVOS no mês (projeto pontual, não empilha) - SEM TER
    // Executar: clientes legados + novos acumulados mês a mês (INCLUI TER)
    const prevMonthCapacity = months.length > 0 ? months[months.length - 1].capacityPlan : null;
    const capacityConfig = inputs.capacityPlan;
    
    // Calcular clientes Saber por tier (apenas novos do mês, NÃO acumula) - SEM TER
    for (const tier of TIERS) {
      // Clientes novos Saber deste mês apenas (projeto pontual)
      const newSaber = monthData.activeClients[tier].saber;
      
      // Saber NÃO acumula - são projetos pontuais
      monthData.capacityPlan.clientsSaberByTier[tier] = newSaber;
      monthData.capacityPlan.totalClientsSaber += newSaber;
    }
    
    // Calcular clientes Executar por tier (legados + novos acumulados + TER)
    // activeClients de Executar JÁ inclui conversões acumuladas de meses anteriores
    for (const tier of TIERS) {
      // Base legada
      const legacy = monthData.legacyClients[tier];
      // Executar ativos (loyalty + no-loyalty) - JÁ inclui conversões acumuladas
      const executarActive = monthData.activeClients[tier].executarLoyalty + monthData.activeClients[tier].executarNoLoyalty;
      // Ter agora vai para Executar
      const ter = monthData.activeClients[tier].ter;
      
      monthData.capacityPlan.clientsExecutarByTier[tier] = legacy + executarActive + ter;
      monthData.capacityPlan.totalClientsExecutar += legacy + executarActive + ter;
    }
    
    // Calcular horas totais necessárias para Saber (baseado em horas por cargo por tier)
    let totalHoursSaber = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsSaberByTier[tier];
      if (clients > 0) {
        // Somar horas de todos os cargos para este tier
        let hoursPerClient = 0;
        for (const role in capacityConfig.saberSquad.roleHours) {
          const roleHours = capacityConfig.saberSquad.roleHours[role];
          hoursPerClient += roleHours[tier] || 0;
        }
        totalHoursSaber += clients * hoursPerClient;
      }
    }
    monthData.capacityPlan.totalHoursSaber = totalHoursSaber;
    
    // Calcular horas totais necessárias para Executar
    let totalHoursExecutar = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsExecutarByTier[tier];
      if (clients > 0) {
        // Somar horas de todos os cargos para este tier
        let hoursPerClient = 0;
        for (const role in capacityConfig.executarSquad.roleHours) {
          const roleHours = capacityConfig.executarSquad.roleHours[role];
          hoursPerClient += roleHours[tier] || 0;
        }
        totalHoursExecutar += clients * hoursPerClient;
      }
    }
    monthData.capacityPlan.totalHoursExecutar = totalHoursExecutar;
    
    // Calcular headcount necessário a partir de horas necessárias e horas efetivas por pessoa
    // Usa-se um fator de disponibilidade para converter horas produtivas em capacidade efetiva
    const hoursPerSquadSaber = capacityConfig.saberSquad.headcount * capacityConfig.saberSquad.productiveHoursPerPerson;
    const hoursPerSquadExecutar = capacityConfig.executarSquad.headcount * capacityConfig.executarSquad.productiveHoursPerPerson;

    const availability = capacityConfig.availabilityFactor ?? 0.85;
    const effectiveHoursPerPersonSaber = capacityConfig.saberSquad.productiveHoursPerPerson * availability;
    const effectiveHoursPerPersonExecutar = capacityConfig.executarSquad.productiveHoursPerPerson * availability;

    const peopleGrossSaber = effectiveHoursPerPersonSaber > 0 ? Math.ceil(totalHoursSaber / effectiveHoursPerPersonSaber) : 0;
    const peopleGrossExecutar = effectiveHoursPerPersonExecutar > 0 ? Math.ceil(totalHoursExecutar / effectiveHoursPerPersonExecutar) : 0;

    // Headcount requerido (bruto) por área
    monthData.capacityPlan.hcSaber = peopleGrossSaber;
    monthData.capacityPlan.hcExecutar = peopleGrossExecutar;
    monthData.capacityPlan.totalHC = monthData.capacityPlan.hcSaber + monthData.capacityPlan.hcExecutar;

    // Para manter compatibilidade com métricas existentes, derivamos squads a partir do HC requerido
    monthData.capacityPlan.squadsSaber = capacityConfig.saberSquad.headcount > 0 ? Math.ceil(monthData.capacityPlan.hcSaber / capacityConfig.saberSquad.headcount) : 0;
    monthData.capacityPlan.squadsExecutar = capacityConfig.executarSquad.headcount > 0 ? Math.ceil(monthData.capacityPlan.hcExecutar / capacityConfig.executarSquad.headcount) : 0;
    monthData.capacityPlan.totalSquads = monthData.capacityPlan.squadsSaber + monthData.capacityPlan.squadsExecutar;
    
    // Calcular Turnover e Contratações (7% ao mês)
    const turnoverRate = 0.07;
    monthData.capacityPlan.turnoverRate = turnoverRate;
    
    // HC do mês anterior (para calcular turnover e crescimento)
    // Mês 1: usar HC inicial das premissas (3 Saber + 160 Executar)
    // Demais meses: usar HC do mês anterior
    const prevHCSaber = prevMonthCapacity?.hcSaber || inputs.capacityPlan.initialHCSaber;
    const prevHCExecutar = prevMonthCapacity?.hcExecutar || inputs.capacityPlan.initialHCExecutar;
    
    // Turnover = pessoas que saem (7% do HC do mês anterior, ou inicial se for mês 1)
    monthData.capacityPlan.turnoverSaber = Math.round(prevHCSaber * turnoverRate);
    monthData.capacityPlan.turnoverExecutar = Math.round(prevHCExecutar * turnoverRate);
    monthData.capacityPlan.totalTurnover = monthData.capacityPlan.turnoverSaber + monthData.capacityPlan.turnoverExecutar;

    // Contratações = (HC necessário - HC anterior) + reposição de turnover
    // Isso garante que consideramos o HC inicial no mês 1
    const hcGrowthSaber = monthData.capacityPlan.hcSaber - prevHCSaber;
    const hcGrowthExecutar = monthData.capacityPlan.hcExecutar - prevHCExecutar;

    // Contratações sem considerar realocação interna
    monthData.capacityPlan.hiresSaber = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber);
    monthData.capacityPlan.hiresExecutar = Math.max(0, hcGrowthExecutar + monthData.capacityPlan.turnoverExecutar);
    monthData.capacityPlan.totalHires = monthData.capacityPlan.hiresSaber + monthData.capacityPlan.hiresExecutar;

    // === NOVO: Calcular gap / potencial de realocação de Executar para Saber ===
    // Pessoas disponíveis para realocação = pessoas que permanecem (prevHC - turnover) menos o HC agora requerido
    const remainingAfterTurnoverExecutar = Math.max(0, prevHCExecutar - monthData.capacityPlan.turnoverExecutar);
    const redeployableFromExecutar = Math.max(0, remainingAfterTurnoverExecutar - monthData.capacityPlan.hcExecutar);
    monthData.capacityPlan.redeployableFromExecutar = redeployableFromExecutar;

    // Contratações Saber considerando realocação (usamos o pool de Executar antes de contratar)
    monthData.capacityPlan.hiresSaberWithRedeployment = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber - redeployableFromExecutar);

    // Total de contratações considerando realocação interna (aplica redução apenas ao Saber)
    monthData.capacityPlan.totalHiresWithRedeployment = monthData.capacityPlan.hiresSaberWithRedeployment + monthData.capacityPlan.hiresExecutar;

    // ===== Sales sizing guidance (SDR / Closers) - não contam no totalHC =====
    // Regras: 200 MQL por SDR, 50 SAL por Closer
    const totalMQLs = Object.values(monthData.mqls).reduce((s, v) => s + v, 0);
    const totalSALs = Object.values(monthData.sals).reduce((s, v) => s + v, 0);

    // Primeiro, aplicar contratações agendadas no mês anterior (essas onboardam agora)
    if (pendingHiresSDR > 0) {
      runningSDR += pendingHiresSDR;
    }
    if (pendingHiresClosers > 0) {
      runningClosers += pendingHiresClosers;
    }

    const requiredSDR = Math.ceil(totalMQLs / 200);
    const requiredClosers = Math.ceil(totalSALs / 50);

    // Contratações necessárias PARA ATENDER o mês seguinte.
    // Política: contratar 1 mês antes do onboarding — ou seja, quando detectamos falta
    // no mês corrente, agendamos a contratação que só entra na base no próximo mês.
    const hiresToScheduleSDR = Math.max(0, requiredSDR - runningSDR);
    const hiresToScheduleClosers = Math.max(0, requiredClosers - runningClosers);

    // Agendar contratações que irão onboardar no próximo mês
    pendingHiresSDR = hiresToScheduleSDR;
    pendingHiresClosers = hiresToScheduleClosers;

    monthData.capacityPlan.salesSDRRequired = requiredSDR;
    monthData.capacityPlan.salesClosersRequired = requiredClosers;
    // salesCurrent* representa o HC disponível NESTE MÊS (antes das contratações agendadas)
    monthData.capacityPlan.salesCurrentSDR = runningSDR;
    monthData.capacityPlan.salesCurrentClosers = runningClosers;
    // salesHires representa as contratações que devem ocorrer/agendar este mês (embarcam no próximo)
    monthData.capacityPlan.salesHires = hiresToScheduleSDR + hiresToScheduleClosers;
    
    // SALES METRICS: moved to DRE calculation to ensure metrics use DRE revenue view (DFC vs competência)
    
    // Calcular métricas
    if (monthData.capacityPlan.totalHC > 0) {
      monthData.capacityPlan.revenuePerHC = monthData.totalRevenue / monthData.capacityPlan.totalHC;
    }
    
    // Taxa de utilização (horas utilizadas / horas disponíveis)
    const maxHoursSaber = monthData.capacityPlan.squadsSaber * hoursPerSquadSaber;
    if (maxHoursSaber > 0) {
      monthData.capacityPlan.hoursUtilizationSaber = totalHoursSaber / maxHoursSaber;
    }
    
    const maxHoursExecutar = monthData.capacityPlan.squadsExecutar * hoursPerSquadExecutar;
    if (maxHoursExecutar > 0) {
      monthData.capacityPlan.hoursUtilizationExecutar = totalHoursExecutar / maxHoursExecutar;
    }
    
    months.push(monthData);
  }
  
  // Calcular DRE para cada mês
  let caixaAcumulado = inputs.dreConfig.caixaInicial;
  for (let i = 0; i < months.length; i++) {
    months[i].dre = calculateDRE(months[i], inputs, caixaAcumulado, pendingDFCRevenue);
    caixaAcumulado = months[i].dre.caixaFinal;
  }
  
  return months;
}

/**
 * Calcula a receita DFC (recebimento mensal) para um mês específico
 * baseado no tracking de receitas futuras
 */
function calculateDFCRevenueForMonth(
  month: number,
  pendingRevenues: PendingRevenueTracking[]
): {
  dfcTotal: number;
  executarLoyaltyAcq: number;
  executarNoLoyaltyAcq: number;
  executarLoyaltyConv: number;
  executarNoLoyaltyConv: number;
} {
  let executarLoyaltyAcq = 0;
  let executarNoLoyaltyAcq = 0;
  let executarLoyaltyConv = 0;
  let executarNoLoyaltyConv = 0;
  
  // Percorrer todas as receitas pendentes
  for (const pending of pendingRevenues) {
    const monthsElapsed = month - pending.startMonth;
    
    // Se este mês está dentro do período de recebimento
    if (monthsElapsed >= 0 && monthsElapsed < pending.remainingMonths) {
      if (pending.product === 'executarLoyalty' && pending.source === 'acquisition') {
        executarLoyaltyAcq += pending.monthlyAmount;
      } else if (pending.product === 'executarNoLoyalty' && pending.source === 'acquisition') {
        executarNoLoyaltyAcq += pending.monthlyAmount;
      } else if (pending.product === 'executarLoyalty' && pending.source === 'conversion') {
        executarLoyaltyConv += pending.monthlyAmount;
      } else if (pending.product === 'executarNoLoyalty' && pending.source === 'conversion') {
        executarNoLoyaltyConv += pending.monthlyAmount;
      }
    }
  }
  
  const dfcTotal = executarLoyaltyAcq + executarNoLoyaltyAcq + 
                   executarLoyaltyConv + executarNoLoyaltyConv;
  
  return {
    dfcTotal,
    executarLoyaltyAcq,
    executarNoLoyaltyAcq,
    executarLoyaltyConv,
    executarNoLoyaltyConv
  };
}

// Função auxiliar para calcular DRE de um mês
function calculateDRE(
  monthData: MonthlyData,
  inputs: SimulationInputs,
  caixaInicialMes: number,
  pendingDFCRevenue: PendingRevenueTracking[]
): DREData {
  const config = inputs.dreConfig;
  const dre = createEmptyDREData(monthData.month);
  const idx = monthData.month - 1;
  
  // Calcular métricas necessárias para Sales Metrics e KPIs
  const totalWons = TIERS.reduce((sum, tier) => sum + monthData.wons[tier], 0);
  const totalSQLs = TIERS.reduce((sum, tier) => sum + monthData.sqls[tier], 0);
  const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;
  
  
  // ========== RECEITA ==========
  // Se usarLinhasGerenciais = true, usar DFC para Executar
  // Se false, usar competência total
  if (config.usarLinhasGerenciais) {
    // Calcular DFC para este mês
    const dfcData = calculateDFCRevenueForMonth(monthData.month, pendingDFCRevenue);
    
    // Receita de outros produtos (Saber, Ter, Potencializar) - sem mudança
    dre.activationOutrosProdutos = TIERS.reduce((sum, tier) => {
      return sum + 
        monthData.revenueByTierProduct[tier].saber +
        monthData.revenueByTierProduct[tier].ter +
        monthData.revenueByTierProduct[tier].potencializar;
    }, 0);
    
    // Receita DFC detalhada
    dre.activationExecutarLoyaltyDFC = dfcData.executarLoyaltyAcq;
    dre.activationExecutarNoLoyaltyDFC = dfcData.executarNoLoyaltyAcq;
    dre.activationSaberConvLoyaltyDFC = dfcData.executarLoyaltyConv;
    dre.activationSaberConvNoLoyaltyDFC = dfcData.executarNoLoyaltyConv;
    dre.activationRevenueDFC = dfcData.dfcTotal;
    
    // Activation total = DFC + outros produtos
    dre.activationRevenue = dre.activationRevenueDFC + dre.activationOutrosProdutos;
    
    // Outras receitas
    dre.renewalRevenue = monthData.totalRenewalRevenue;
    dre.expansionRevenue = monthData.totalExpansionRevenue;
    dre.legacyRevenue = monthData.totalLegacyRevenue;
    
    // Revenue total = Activation DFC + Renewals + Expansions + Legacy
    dre.revenue = dre.activationRevenue + dre.renewalRevenue + dre.expansionRevenue + dre.legacyRevenue;
  } else {
    // Visão de competência (atual)
    dre.activationRevenue = monthData.totalNewRevenue;
    dre.renewalRevenue = monthData.totalRenewalRevenue;
    dre.expansionRevenue = monthData.totalExpansionRevenue;
    dre.legacyRevenue = monthData.totalLegacyRevenue;
    dre.revenue = monthData.totalRevenue;
    
    // Zerar campos DFC
    dre.activationRevenueDFC = 0;
    dre.activationExecutarLoyaltyDFC = 0;
    dre.activationExecutarNoLoyaltyDFC = 0;
    dre.activationSaberConvLoyaltyDFC = 0;
    dre.activationSaberConvNoLoyaltyDFC = 0;
    dre.activationOutrosProdutos = 0;
  }
  
  // ========== DEDUCÕES ==========
  // Devoluções Saber: sempre aplicadas (percentual sobre receita de aquisição do produto Saber)
  const totalSaberAcquisitionRevenue = TIERS.reduce((sum, tier) => sum + monthData.revenueByTierProduct[tier].saber, 0);
  dre.devolucoesSaber = totalSaberAcquisitionRevenue * (config.devolucoesSaberRate ?? 0);

  // Linhas gerenciais (inadimplência e churns) só são aplicadas se usarLinhasGerenciais = true
  if (config.usarLinhasGerenciais) {
    dre.inadimplencia = dre.revenue * config.inadimplenciaRate;
    dre.churnM0Falcons = dre.revenue * config.churnM0FalconsRate;
    dre.churnRecebimentoOPS = dre.revenue * config.churnRecebimentoOPSRate;
  } else {
    dre.inadimplencia = 0;
    dre.churnM0Falcons = 0;
    dre.churnRecebimentoOPS = 0;
  }

  // Receita bruta recebida considera devoluções sempre, e também inadimplência/churns quando ativadas
  dre.receitaBrutaRecebida = dre.revenue - dre.inadimplencia - dre.churnM0Falcons - dre.churnRecebimentoOPS - dre.devolucoesSaber;

  // Performance conversão: proporção efetivamente recebida sobre a receita (inclui devoluções e deduções aplicadas)
  dre.performanceConversao = dre.revenue > 0 ? dre.receitaBrutaRecebida / dre.revenue : 1;
  
  // ========== TRIBUTOS ==========
  dre.royalties = dre.receitaBrutaRecebida * config.royaltiesRate;
  dre.iss = dre.receitaBrutaRecebida * config.issRate;
  dre.irrf = dre.receitaBrutaRecebida * config.irrfRate;
  dre.pis = dre.receitaBrutaRecebida * config.pisRate;
  dre.cofins = dre.receitaBrutaRecebida * config.cofinsRate;
  dre.totalImpostos = dre.iss + dre.irrf + dre.pis + dre.cofins;
  dre.receitaLiquida = dre.receitaBrutaRecebida - dre.royalties - dre.totalImpostos;
  
  // ========== CSP (Custo de Serviço Prestado) ==========
  // Modelo: CSP baseado em Squads Necessárias do Capacity Plan
  // CSP = Número de Squads × Custo Total do Squad
  
  // Calcular custo total de cada squad baseado nos salários dos cargos (suporta arrays mensais)
  const custoSquadExecutar = 
    getMonthlyValue(config.cspExecutarCoordenador, idx) +
    (getMonthlyValue(config.cspExecutarAccountSr, idx) * 2) + // 2 Account Sr
    getMonthlyValue(config.cspExecutarGestorTrafegoSr, idx) +
    getMonthlyValue(config.cspExecutarGestorTrafegoPl, idx) +
    getMonthlyValue(config.cspExecutarCopywriter, idx) +
    getMonthlyValue(config.cspExecutarDesignerSr, idx) +
    getMonthlyValue(config.cspExecutarDesignerPl, idx) +
    getMonthlyValue(config.cspExecutarSocialMedia, idx);

  const custoSquadSaber = 
    getMonthlyValue(config.cspSaberCoordenador, idx) +
    getMonthlyValue(config.cspSaberAccountSr, idx) +
    getMonthlyValue(config.cspSaberAccountPl, idx) +
    getMonthlyValue(config.cspSaberAccountJr, idx) +
    getMonthlyValue(config.cspSaberGestorTrafegoPl, idx) +
    getMonthlyValue(config.cspSaberCopywriter, idx) +
    getMonthlyValue(config.cspSaberDesignerSr, idx) +
    getMonthlyValue(config.cspSaberTech, idx) +
    getMonthlyValue(config.cspSaberSalesEnablement, idx);
  
  // CSP EXECUTAR
  const squadsExecutarNecessarias = monthData.capacityPlan.squadsExecutar;
  dre.cspExecutar = squadsExecutarNecessarias * custoSquadExecutar;
  
  // Divisão: Coordenador = Overhead, Resto = Operacional
  dre.cspExecutarOverhead = squadsExecutarNecessarias * getMonthlyValue(config.cspExecutarCoordenador, idx);
  dre.cspExecutarDireto = dre.cspExecutar - dre.cspExecutarOverhead;
  
  // CSP SABER
  const squadsSaberNecessarias = monthData.capacityPlan.squadsSaber;
  dre.cspSaber = squadsSaberNecessarias * custoSquadSaber;
  
  // Divisão: Coordenador = Overhead, Resto = Operacional
  dre.cspSaberOverhead = squadsSaberNecessarias * getMonthlyValue(config.cspSaberCoordenador, idx);
  dre.cspSaberDireto = dre.cspSaber - dre.cspSaberOverhead;
  
  // CSP TER
  // Ter usa estrutura Saber (já está incluído no cálculo de squadsExecutar do Capacity Plan)
  // Não precisa adicionar separadamente pois Ter já foi contabilizado em Executar
  dre.cspTer = 0;
  
  // Outros CSP
  const cspCssWebProducts = getMonthlyValue(config.cspCssWebProducts, idx);
  const cspGerentes = getMonthlyValue(config.cspGerentes, idx);
  
  dre.cspTotal = dre.cspExecutar + dre.cspSaber + dre.cspTer + cspCssWebProducts + cspGerentes;
  dre.percentualCSP = dre.receitaLiquida > 0 ? dre.cspTotal / dre.receitaLiquida : 0;
  
  // ========== MARGEM OPERACIONAL ==========
  dre.margemOperacional = dre.receitaLiquida - dre.cspTotal;
  dre.percentualMargemOperacional = dre.receitaLiquida > 0 ? dre.margemOperacional / dre.receitaLiquida : 0;
  
  // ========== DESPESAS MARKETING E VENDAS ==========
  // === SALES METRICS (calcular aqui para usar a mesma base de receita do DRE) ===
  const salesMetrics = {
    closersRequired: Math.ceil(totalWons / inputs.salesConfig.closerProductivity),
    sdrsRequired: Math.ceil(totalSQLs / inputs.salesConfig.sdrProductivity),
    farmersRequired: Math.ceil(clientesAtivos / inputs.salesConfig.farmerProductivity),
    remuneracaoCloser: 0,
    remuneracaoSDR: 0,
    remuneracaoFarmer: 0,
    comissaoVendasActivation: 0,
    comissaoFarmerExpansion: 0,
    folhaGestaoComercial: inputs.salesConfig.folhaGestaoComercial,
    bonusCampanhasActivation: inputs.salesConfig.bonusCampanhasActivation,
    estruturaSuporte: inputs.salesConfig.estruturaSuporte[idx],
    despesasVisitasActivation: inputs.salesConfig.despesasVisitasActivation,
    bonusCampanhasExpansion: inputs.salesConfig.bonusCampanhasExpansion,
    comissaoOperacao: 0,
    despesasVisitasExpansion: inputs.salesConfig.despesasVisitasExpansion,
    despesaComercialActivation: 0,
    despesaComercialExpansion: 0,
    totalDespesasMarketingVendas: 0,
  } as any;

  // Remunerações
  salesMetrics.remuneracaoCloser = salesMetrics.closersRequired * inputs.salesConfig.closerSalary;
  salesMetrics.remuneracaoSDR = salesMetrics.sdrsRequired * inputs.salesConfig.sdrSalary;
  salesMetrics.remuneracaoFarmer = salesMetrics.farmersRequired * inputs.salesConfig.farmerSalary;

  // Comissões: usar base de DRE para activation (pode ser DFC quando gerencial)
  salesMetrics.comissaoVendasActivation = dre.activationRevenue * inputs.salesConfig.comissaoActivationRate;
  const receitaExpansionTotal = monthData.totalExpansionRevenue + monthData.totalLegacyExpansionRevenue;
  salesMetrics.comissaoFarmerExpansion = receitaExpansionTotal * inputs.salesConfig.comissaoExpansionRate;

  // Comissão Operação (Monetização Ops) — percentual sobre expansão (legacy+expansion)
  salesMetrics.comissaoOperacao = receitaExpansionTotal * (inputs.salesConfig.comissaoMonetizacaoOpsRate ?? inputs.salesConfig.comissaoExpansionRate);

  // Totais
  salesMetrics.despesaComercialActivation =
    salesMetrics.bonusCampanhasActivation +
    salesMetrics.comissaoVendasActivation +
    salesMetrics.estruturaSuporte +
    salesMetrics.remuneracaoCloser +
    salesMetrics.remuneracaoSDR +
    salesMetrics.despesasVisitasActivation;

  salesMetrics.despesaComercialExpansion =
    salesMetrics.remuneracaoFarmer +
    salesMetrics.comissaoFarmerExpansion +
    salesMetrics.comissaoOperacao +
    salesMetrics.bonusCampanhasExpansion +
    salesMetrics.despesasVisitasExpansion;

  salesMetrics.totalDespesasMarketingVendas =
    salesMetrics.despesaComercialActivation +
    salesMetrics.despesaComercialExpansion +
    salesMetrics.folhaGestaoComercial;

  dre.salesMetrics = salesMetrics as any;
  // também armazenar em monthData para compatibilidade com UI/export
  monthData.dre.salesMetrics = salesMetrics as any;
  // Total = somente despesas comerciais (Activation + Expansion + Folha Gestão)
  // Sempre incluir investimento no total de Marketing e Vendas.
  // - Se usarLinhasGerenciais: incluir a parcela amortizada (6 meses)
  // - Se não usar: incluir o investimento mensal integral
  const amortized = getAmortizedInvestment(inputs.topline.investmentMonthly, idx, 6);
  dre.investimentoMarketingAmortizado = amortized;
  const investimentoAplicado = config.usarLinhasGerenciais ? amortized : (inputs.topline.investmentMonthly[idx] || 0);
  // guardar para exibição/debug
  (dre as any).investimentoMarketingAplicado = investimentoAplicado;
  dre.totalMarketingVendas = monthData.dre.salesMetrics.totalDespesasMarketingVendas + investimentoAplicado;
  
  // ========== MARGEM DE CONTRIBUIÇÃO ==========
  dre.margemContribuicao = dre.margemOperacional - dre.totalMarketingVendas;
  dre.percentualMargemContribuicao = dre.receitaLiquida > 0 ? dre.margemContribuicao / dre.receitaLiquida : 0;
  
  // ========== DESPESAS ADMINISTRATIVAS ==========
  dre.despesasTimeAdm = config.despesasTimeAdm;
  dre.despesasCustosAdm = config.despesasCustosAdm;
  dre.despesasTech = config.despesasTech;
  dre.despesasUtilities = config.despesasUtilities;
  // Despesas de pessoas crescem R$ 1.750/mês
  dre.despesasPessoas = config.despesasPessoasInicial + (idx * config.despesasPessoasIncremento);
  dre.viagensAdmin = config.viagensAdmin;
  dre.despesasSoftwares = config.despesasSoftwares;
  dre.despesasServicosTerceirizados = config.despesasServicosTerceirizados;
  
  dre.totalDespesasAdm = 
    dre.despesasTimeAdm + 
    dre.despesasCustosAdm + 
    dre.despesasTech + 
    dre.despesasUtilities + 
    dre.despesasPessoas + 
    dre.viagensAdmin + 
    dre.despesasSoftwares + 
    dre.despesasServicosTerceirizados;
  
  // ========== EBITDA ==========
  dre.ebitda = dre.margemContribuicao - dre.totalDespesasAdm;
  dre.percentualEBITDA = dre.receitaLiquida > 0 ? dre.ebitda / dre.receitaLiquida : 0;
  
  // ========== EBIT ==========
  dre.despesasFinanceiras = dre.receitaBrutaRecebida * config.despesasFinanceirasRate;
  dre.receitasFinanceiras = 0; // Pode ser implementado futuramente (rendimento de caixa)
  dre.ebit = dre.ebitda - dre.despesasFinanceiras + dre.receitasFinanceiras;
  
  // ========== LUCRO LÍQUIDO ==========
  // IRPJ e CSLL zerados se EBIT negativo
  dre.irpj = dre.ebit > 0 ? dre.ebit * config.irpjRate : 0;
  dre.csll = dre.ebit > 0 ? dre.ebit * config.csllRate : 0;
  dre.lucroLiquido = dre.ebit - dre.irpj - dre.csll;
  dre.percentualLucroLiquido = dre.receitaLiquida > 0 ? dre.lucroLiquido / dre.receitaLiquida : 0;
  
  // ========== CAIXA EFETIVO (Resumo) ==========
  // Caixa Efetivo = Lucro Líquido - Compra Ativo Intangível - Pagamento Financiamento - Distribuição Dividendos
  dre.caixaEfetivo = dre.lucroLiquido - config.compraAtivoIntangivel - config.pagamentoFinanciamento - config.distribuicaoDividendos;
  
  // ========== FLUXO DE CAIXA ==========
  dre.lucroPeríodo = dre.lucroLiquido;
  
  // Contas a receber bookado (simplificado: 5% da receita won fica pendente)
  dre.contasAReceberBookado = dre.revenue * 0.05;
  dre.taxasRoyaltiesBookado = dre.contasAReceberBookado * (config.royaltiesRate + config.issRate + config.irrfRate + config.pisRate + config.cofinsRate);
  
  dre.depreciacao = config.depreciacao;
  dre.caixaOperacional = dre.lucroPeríodo + dre.depreciacao - dre.contasAReceberBookado - dre.taxasRoyaltiesBookado;
  
  // Atividades de Investimento
  dre.compraAtivoIntangivel = config.compraAtivoIntangivel;
  dre.caixaInvestimento = -dre.compraAtivoIntangivel;
  
  // Atividades de Financiamento
  dre.pagamentoFinanciamento = config.pagamentoFinanciamento;
  dre.distribuicaoDividendos = config.distribuicaoDividendos;
  dre.caixaFinanciamento = -dre.pagamentoFinanciamento - dre.distribuicaoDividendos;
  
  // Saldo de Caixa
  dre.saldoCaixaMes = dre.caixaOperacional + dre.caixaInvestimento + dre.caixaFinanciamento;
  dre.caixaInicial = caixaInicialMes;
  dre.caixaFinal = dre.caixaInicial + dre.saldoCaixaMes;
  
  // ========== KPIS ==========
  // CAC: Investimento em Marketing e Vendas / Clientes Won
  dre.cac = totalWons > 0 ? dre.totalMarketingVendas / totalWons : 0;
  
  // CLV: Valor médio por cliente × lifetime esperado (simplificado)
  dre.quantidadeClientes = monthData.totalActiveClients;
  const revenueMediaPorCliente = dre.quantidadeClientes > 0 ? dre.revenue / dre.quantidadeClientes : 0;
  // Lifetime médio ponderado: 7 meses (Loyalty) + 2 meses (No-Loyalty) = ~4-5 meses médio
  const lifetimeMedio = 5;
  dre.clv = revenueMediaPorCliente * lifetimeMedio * dre.performanceConversao;
  
  // ROI
  dre.roi = dre.cac > 0 ? (dre.clv / dre.cac) - 1 : 0;
  
  return dre;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
