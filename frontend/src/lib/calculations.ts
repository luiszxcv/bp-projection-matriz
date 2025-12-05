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
  clientsSaberTerByTier: createEmptyTierDistribution(),
  totalClientsSaberTer: 0,
  totalClientsExecutar: 0,
  totalUC: 0,
  squadsSaber: 0,
  squadsExecutar: 0,
  totalSquads: 0,
  hcSaber: 0,
  hcExecutar: 0,
  totalHC: 0,
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
        const revenue = activatedClients * ticket * revenueActivationRate;
        
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
      for (const conv of conversionsToProcess) {
        const convertingClients = Math.round(conv.clients * inputs.conversionRates.saberToExecutar);
        const loyaltyClients = Math.round(convertingClients * inputs.conversionRates.executarLoyaltyRatio);
        const noLoyaltyClients = convertingClients - loyaltyClients;
        
        // Registrar conversões no monthData
        monthData.conversions[tier].loyalty += loyaltyClients;
        monthData.conversions[tier].noLoyalty += noLoyaltyClients;
        
        if (loyaltyClients > 0) {
          activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
        }
        if (noLoyaltyClients > 0) {
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
            const renewalRevenue = renewingClients * metrics.productTickets.executarLoyalty[idx];
            
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
            const renewalRevenue = renewingClients * metrics.productTickets.executarNoLoyalty[idx];
            
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
          const revenue = clients * metrics.productTickets[product][idx];
          
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
      
      monthData.legacyClients[tier] = remainingClients;
      monthData.legacyRevenue[tier] = remainingRevenue + expansionRevenue;
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
    // Saber+Ter: clientes NOVOS no mês (projeto pontual, não empilha)
    // Executar: clientes legados + novos acumulados mês a mês
    const prevMonthCapacity = months.length > 0 ? months[months.length - 1].capacityPlan : null;
    const capacityConfig = inputs.capacityPlan;
    
    // Calcular clientes Saber+Ter por tier (apenas novos do mês, NÃO acumula)
    for (const tier of TIERS) {
      // Clientes novos deste mês apenas (projeto pontual)
      const newSaber = monthData.activeClients[tier].saber;
      const newTer = monthData.activeClients[tier].ter;
      
      // Saber+Ter NÃO acumula - são projetos pontuais
      monthData.capacityPlan.clientsSaberTerByTier[tier] = newSaber + newTer;
      monthData.capacityPlan.totalClientsSaberTer += monthData.capacityPlan.clientsSaberTerByTier[tier];
    }
    
    // Calcular clientes Executar (legados + novos acumulados)
    // Base: clientes legados (já são Executar)
    for (const tier of TIERS) {
      monthData.capacityPlan.totalClientsExecutar += monthData.legacyClients[tier];
    }
    // Novos Executar do mês
    for (const tier of TIERS) {
      const newExecutarLoyalty = monthData.activeClients[tier].executarLoyalty;
      const newExecutarNoLoyalty = monthData.activeClients[tier].executarNoLoyalty;
      monthData.capacityPlan.totalClientsExecutar += newExecutarLoyalty + newExecutarNoLoyalty;
    }
    // Adicionar novos Executar de meses anteriores (acumulado)
    if (prevMonthCapacity) {
      // Subtrair legados do mês anterior (para não duplicar) e somar o acumulado de novos
      const prevLegacyTotal = months[months.length - 1].legacyClients 
        ? Object.values(months[months.length - 1].legacyClients).reduce((sum, val) => sum + val, 0)
        : 0;
      const prevNewExecutar = prevMonthCapacity.totalClientsExecutar - prevLegacyTotal;
      monthData.capacityPlan.totalClientsExecutar += prevNewExecutar;
    }
    
    // Calcular Unidades de Capacidade necessárias para Saber+Ter
    let totalUC = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsSaberTerByTier[tier];
      const weight = capacityConfig.saberSquad.tierWeights[tier];
      totalUC += clients * weight;
    }
    monthData.capacityPlan.totalUC = totalUC;
    
    // Calcular squads necessárias
    monthData.capacityPlan.squadsSaber = Math.ceil(totalUC / capacityConfig.saberSquad.capacityUC);
    monthData.capacityPlan.squadsExecutar = Math.ceil(
      monthData.capacityPlan.totalClientsExecutar / capacityConfig.executarSquad.clientsPerSquad
    );
    monthData.capacityPlan.totalSquads = monthData.capacityPlan.squadsSaber + monthData.capacityPlan.squadsExecutar;
    
    // Calcular headcount
    monthData.capacityPlan.hcSaber = monthData.capacityPlan.squadsSaber * capacityConfig.saberSquad.headcount;
    monthData.capacityPlan.hcExecutar = monthData.capacityPlan.squadsExecutar * capacityConfig.executarSquad.headcount;
    monthData.capacityPlan.totalHC = monthData.capacityPlan.hcSaber + monthData.capacityPlan.hcExecutar;
    
    // Calcular métricas
    if (monthData.capacityPlan.totalHC > 0) {
      monthData.capacityPlan.revenuePerHC = monthData.totalRevenue / monthData.capacityPlan.totalHC;
    }
    
    // Taxa de utilização
    const maxUC = monthData.capacityPlan.squadsSaber * capacityConfig.saberSquad.capacityUC;
    if (maxUC > 0) {
      monthData.capacityPlan.ucUtilization = totalUC / maxUC;
    }
    
    const maxExecutar = monthData.capacityPlan.squadsExecutar * capacityConfig.executarSquad.clientsPerSquad;
    if (maxExecutar > 0) {
      monthData.capacityPlan.executarUtilization = monthData.capacityPlan.totalClientsExecutar / maxExecutar;
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
