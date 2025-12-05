import { SimulationInputs, MonthlyData, Tier, ProductDistribution, TierDistribution, Product, CapacityPlanData } from '@/types/simulation';

const TIERS: Tier[] = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS: Product[] = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];

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
  totalUC: 0,
  executarUC: 0,
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
  revenuePerHC: 0,
  ucUtilization: 0,
  executarUtilization: 0,
});

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
  
  // Legacy base tracking
  let legacyClients = { ...inputs.legacyBase };
  
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
      legacyClients: createEmptyTierDistribution(),
      legacyRevenue: createEmptyTierDistribution(),
      legacyExpansionRevenue: createEmptyTierDistribution(),
      legacyExpansionByProduct: createEmptyTierProductRecord(),
      renewals: createEmptyTierProductRecord(),
      renewalRevenue: createEmptyTierProductRecord(),
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
      totalRevenue: 0,
      totalActiveClients: 0,
      capacityPlan: createEmptyCapacityPlanData(),
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
      
      // Activations
      const activations = Math.round(wons * activationRate);
      monthData.activations[tier] = activations;
      
      // Distribute WONs across products
      let remainingWons = wons;
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
      
      // Distribute clients and calculate revenue
      for (let i = 0; i < PRODUCTS.length; i++) {
        const product = PRODUCTS[i];
        const distribution = metrics.productDistribution[product][idx];
        const ticket = metrics.productTickets[product][idx];
        
        let clients: number;
        if (i === lowestTicketIndex) {
          clients = remainingWons;
        } else {
          clients = Math.floor(wons * distribution);
          remainingWons -= clients;
        }
        
        const activatedClients = Math.round(clients * activationRate);
        
        // Calcular receita: Executar usa ticket mensal × duração do contrato
        let revenue: number;
        if (product === 'executarNoLoyalty') {
          // NoLoyalty: ticket mensal × 2 meses (sem revenueActivationRate - já aplicado nos clientes)
          revenue = activatedClients * ticket * inputs.conversionRates.noLoyaltyDuration;
        } else if (product === 'executarLoyalty') {
          // Loyalty: ticket mensal × 7 meses (sem revenueActivationRate - já aplicado nos clientes)
          revenue = activatedClients * ticket * inputs.conversionRates.loyaltyDuration;
        } else {
          // Outros produtos (Saber, Ter, Potencializar): ticket direto
          revenue = activatedClients * ticket * revenueActivationRate;
        }
        
        monthData.revenueByTierProduct[tier][product] = revenue;
        monthData.activeClients[tier][product] = activatedClients;
        
        // Track for renewals
        if (product === 'saber' && activatedClients > 0) {
          pendingSaberConversions[tier].push({ clients: activatedClients, month });
        } else if (product === 'executarLoyalty' && activatedClients > 0) {
          activeExecutarLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        } else if (product === 'executarNoLoyalty' && activatedClients > 0) {
          activeExecutarNoLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        }
        
        monthData.totalNewRevenue += revenue;
      }
    }
    
    // Process Saber → Executar conversions (after 2 months / 60 days)
    for (const tier of TIERS) {
      const conversionsToProcess = pendingSaberConversions[tier].filter(c => month - c.month >= 2);
      const metrics = inputs.tierMetrics[tier];
      
      for (const conv of conversionsToProcess) {
        const convertingClients = Math.round(conv.clients * inputs.conversionRates.saberToExecutar);
        const loyaltyClients = Math.round(convertingClients * inputs.conversionRates.executarLoyaltyRatio);
        const noLoyaltyClients = convertingClients - loyaltyClients;
        
        // Registrar conversões no monthData
        monthData.conversions[tier].loyalty += loyaltyClients;
        monthData.conversions[tier].noLoyalty += noLoyaltyClients;
        
        // Calcular receita da conversão
        if (loyaltyClients > 0) {
          const loyaltyRevenue = loyaltyClients * metrics.productTickets.executarLoyalty[idx] * inputs.conversionRates.loyaltyDuration;
          monthData.revenueByTierProduct[tier].executarLoyalty += loyaltyRevenue;
          monthData.totalNewRevenue += loyaltyRevenue;
          activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
        }
        if (noLoyaltyClients > 0) {
          const noLoyaltyRevenue = noLoyaltyClients * metrics.productTickets.executarNoLoyalty[idx] * inputs.conversionRates.noLoyaltyDuration;
          monthData.revenueByTierProduct[tier].executarNoLoyalty += noLoyaltyRevenue;
          monthData.totalNewRevenue += noLoyaltyRevenue;
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
    
    // Calculate expansion from active Executar clients
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
          
          monthData.expansions[tier][product] += clients;
          monthData.expansionRevenue[tier][product] += revenue;
          monthData.totalExpansionRevenue += revenue;
        }
      }
    }
    
    // Calculate legacy base
    for (const tier of TIERS) {
      const tierLegacy = legacyClients[tier];
      
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
    
    // Calculate total revenue
    monthData.totalRevenue = 
      monthData.totalNewRevenue + 
      monthData.totalRenewalRevenue + 
      monthData.totalExpansionRevenue + 
      monthData.totalLegacyRevenue;
    
    // Calculate Capacity Plan
    // Saber: clientes NOVOS no mês (projeto pontual, não empilha) - SEM TER
    // Executar: clientes legados + novos acumulados mês a mês
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
    
    // Calcular clientes Executar por tier (legados + novos acumulados)
    // Base: clientes legados (já são Executar) por tier
    for (const tier of TIERS) {
      monthData.capacityPlan.clientsExecutarByTier[tier] = monthData.legacyClients[tier];
      monthData.capacityPlan.totalClientsExecutar += monthData.legacyClients[tier];
    }
    // Novos Executar do mês por tier
    for (const tier of TIERS) {
      const newExecutarLoyalty = monthData.activeClients[tier].executarLoyalty;
      const newExecutarNoLoyalty = monthData.activeClients[tier].executarNoLoyalty;
      monthData.capacityPlan.clientsExecutarByTier[tier] += newExecutarLoyalty + newExecutarNoLoyalty;
      monthData.capacityPlan.totalClientsExecutar += newExecutarLoyalty + newExecutarNoLoyalty;
    }
    // Adicionar novos Executar de meses anteriores (acumulado) por tier
    if (prevMonthCapacity) {
      for (const tier of TIERS) {
        // Subtrair legados do mês anterior (para não duplicar) e somar o acumulado de novos
        const prevLegacy = months[months.length - 1].legacyClients[tier];
        const prevNewExecutar = prevMonthCapacity.clientsExecutarByTier[tier] - prevLegacy;
        monthData.capacityPlan.clientsExecutarByTier[tier] += prevNewExecutar;
        monthData.capacityPlan.totalClientsExecutar += prevNewExecutar;
      }
    }
    
    // Calcular Unidades de Capacidade necessárias para Saber (sem Ter)
    let totalUC = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsSaberByTier[tier];
      const weight = capacityConfig.saberSquad.tierWeights[tier];
      totalUC += clients * weight;
    }
    monthData.capacityPlan.totalUC = totalUC;
    
    // Calcular Unidades de Capacidade necessárias para Executar
    let executarUC = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsExecutarByTier[tier];
      // Usar tierWeights do executarSquad se existir, senão fallback para peso 1
      const weight = capacityConfig.executarSquad.tierWeights?.[tier] ?? 1;
      executarUC += clients * weight;
    }
    monthData.capacityPlan.executarUC = executarUC;
    
    // Calcular squads necessárias
    monthData.capacityPlan.squadsSaber = Math.ceil(totalUC / capacityConfig.saberSquad.capacityUC);
    // Usar capacityUC do executarSquad se existir, senão fallback para clientsPerSquad
    const executarCapacityUC = capacityConfig.executarSquad.capacityUC ?? capacityConfig.executarSquad.clientsPerSquad;
    monthData.capacityPlan.squadsExecutar = Math.ceil(executarUC / executarCapacityUC);
    monthData.capacityPlan.totalSquads = monthData.capacityPlan.squadsSaber + monthData.capacityPlan.squadsExecutar;
    
    // Calcular headcount necessário
    monthData.capacityPlan.hcSaber = monthData.capacityPlan.squadsSaber * capacityConfig.saberSquad.headcount;
    monthData.capacityPlan.hcExecutar = monthData.capacityPlan.squadsExecutar * capacityConfig.executarSquad.headcount;
    monthData.capacityPlan.totalHC = monthData.capacityPlan.hcSaber + monthData.capacityPlan.hcExecutar;
    
    // Calcular Turnover e Contratações (7% ao mês)
    const turnoverRate = 0.07;
    monthData.capacityPlan.turnoverRate = turnoverRate;
    
    // HC do mês anterior (para calcular turnover)
    const prevHCSaber = prevMonthCapacity?.hcSaber || 0;
    const prevHCExecutar = prevMonthCapacity?.hcExecutar || 0;
    
    // Turnover = pessoas que saem (7% do HC atual)
    monthData.capacityPlan.turnoverSaber = Math.round(prevHCSaber * turnoverRate);
    monthData.capacityPlan.turnoverExecutar = Math.round(prevHCExecutar * turnoverRate);
    monthData.capacityPlan.totalTurnover = monthData.capacityPlan.turnoverSaber + monthData.capacityPlan.turnoverExecutar;
    
    // Contratações = crescimento de HC + reposição de turnover
    const hcGrowthSaber = monthData.capacityPlan.hcSaber - prevHCSaber;
    const hcGrowthExecutar = monthData.capacityPlan.hcExecutar - prevHCExecutar;
    
    monthData.capacityPlan.hiresSaber = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber);
    monthData.capacityPlan.hiresExecutar = Math.max(0, hcGrowthExecutar + monthData.capacityPlan.turnoverExecutar);
    monthData.capacityPlan.totalHires = monthData.capacityPlan.hiresSaber + monthData.capacityPlan.hiresExecutar;
    
    // Calcular métricas
    if (monthData.capacityPlan.totalHC > 0) {
      monthData.capacityPlan.revenuePerHC = monthData.totalRevenue / monthData.capacityPlan.totalHC;
    }
    
    // Taxa de utilização
    const maxUC = monthData.capacityPlan.squadsSaber * capacityConfig.saberSquad.capacityUC;
    if (maxUC > 0) {
      monthData.capacityPlan.ucUtilization = totalUC / maxUC;
    }
    
    const maxExecutarUC = monthData.capacityPlan.squadsExecutar * executarCapacityUC;
    if (maxExecutarUC > 0) {
      monthData.capacityPlan.executarUtilization = executarUC / maxExecutarUC;
    }
    
    months.push(monthData);
  }
  
  return months;
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
