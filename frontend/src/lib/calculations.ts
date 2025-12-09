import { SimulationInputs, MonthlyData, Tier, ProductDistribution, TierDistribution, Product, CapacityPlanData, DREData, DREConfig, SalesMetrics } from '@/types/simulation';

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
  inadimplencia: 0,
  churnM0Falcons: 0,
  churnRecebimentoOPS: 0,
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
  cac: 0,
  clv: 0,
  roi: 0,
  quantidadeClientes: 0,
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
  // Sales running headcount (contratações persistem entre meses)
  let runningSDR = inputs.dreConfig.currentSDR ?? 1;
  let runningClosers = inputs.dreConfig.currentClosers ?? 2;
  

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
      
      // Update activations with actual distributed sum
      monthData.activations[tier] = totalDistributedActivations;
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
          monthData.activeClients[tier].executarLoyalty += loyaltyClients;
          monthData.totalNewRevenue += loyaltyRevenue;
          activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
        }
        if (noLoyaltyClients > 0) {
          const noLoyaltyRevenue = noLoyaltyClients * metrics.productTickets.executarNoLoyalty[idx] * inputs.conversionRates.noLoyaltyDuration;
          monthData.revenueByTierProduct[tier].executarNoLoyalty += noLoyaltyRevenue;
          monthData.activeClients[tier].executarNoLoyalty += noLoyaltyClients;
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
    
    // Calcular squads necessárias baseado em horas disponíveis por squad
    const hoursPerSquadSaber = capacityConfig.saberSquad.headcount * capacityConfig.saberSquad.productiveHoursPerPerson;
    const hoursPerSquadExecutar = capacityConfig.executarSquad.headcount * capacityConfig.executarSquad.productiveHoursPerPerson;
    
    monthData.capacityPlan.squadsSaber = hoursPerSquadSaber > 0 ? Math.ceil(totalHoursSaber / hoursPerSquadSaber) : 0;
    monthData.capacityPlan.squadsExecutar = hoursPerSquadExecutar > 0 ? Math.ceil(totalHoursExecutar / hoursPerSquadExecutar) : 0;
    monthData.capacityPlan.totalSquads = monthData.capacityPlan.squadsSaber + monthData.capacityPlan.squadsExecutar;
    
    // Calcular headcount necessário
    monthData.capacityPlan.hcSaber = monthData.capacityPlan.squadsSaber * capacityConfig.saberSquad.headcount;
    monthData.capacityPlan.hcExecutar = monthData.capacityPlan.squadsExecutar * capacityConfig.executarSquad.headcount;
    monthData.capacityPlan.totalHC = monthData.capacityPlan.hcSaber + monthData.capacityPlan.hcExecutar;
    
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
    
    monthData.capacityPlan.hiresSaber = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber);
    monthData.capacityPlan.hiresExecutar = Math.max(0, hcGrowthExecutar + monthData.capacityPlan.turnoverExecutar);
    monthData.capacityPlan.totalHires = monthData.capacityPlan.hiresSaber + monthData.capacityPlan.hiresExecutar;

    // ===== Sales sizing guidance (SDR / Closers) - não contam no totalHC =====
    // Regras: 200 MQL por SDR, 50 SAL por Closer
    const totalMQLs = Object.values(monthData.mqls).reduce((s, v) => s + v, 0);
    const totalSALs = Object.values(monthData.sals).reduce((s, v) => s + v, 0);

    const requiredSDR = Math.ceil(totalMQLs / 200);
    const requiredClosers = Math.ceil(totalSALs / 50);

    // Calcular diferenças considerando contratações anteriores (persistem)
    const hiresThisMonthSDR = Math.max(0, requiredSDR - runningSDR);
    const hiresThisMonthClosers = Math.max(0, requiredClosers - runningClosers);

    // Atualizar running headcount para próximos meses
    runningSDR += hiresThisMonthSDR;
    runningClosers += hiresThisMonthClosers;

    monthData.capacityPlan.salesSDRRequired = requiredSDR;
    monthData.capacityPlan.salesClosersRequired = requiredClosers;
    // salesCurrent* representa o HC disponível APÓS eventuais contratações deste mês
    monthData.capacityPlan.salesCurrentSDR = runningSDR;
    monthData.capacityPlan.salesCurrentClosers = runningClosers;
    monthData.capacityPlan.salesHires = hiresThisMonthSDR + hiresThisMonthClosers; // novas contratações no mês
    
    // === SALES METRICS CALCULATION ===
    // Inicializar estrutura salesMetrics
    monthData.dre.salesMetrics = {
      closersRequired: 0,
      sdrsRequired: 0,
      farmersRequired: 0,
      remuneracaoCloser: 0,
      remuneracaoSDR: 0,
      remuneracaoFarmer: 0,
      comissaoVendasActivation: 0,
      comissaoFarmerExpansion: 0,
      folhaGestaoComercial: 0,
      bonusCampanhasActivation: 0,
      estruturaSuporte: 0,
      despesasVisitasActivation: 0,
      bonusCampanhasExpansion: 0,
      comissaoOperacao: 0,
      despesasVisitasExpansion: 0,
      despesaComercialActivation: 0,
      despesaComercialExpansion: 0,
      totalDespesasMarketingVendas: 0,
    };
    
    // 1. Calcular quantidades necessárias
    const totalWons = TIERS.reduce((sum, tier) => sum + monthData.wons[tier], 0);
    const totalSQLs = TIERS.reduce((sum, tier) => sum + monthData.sqls[tier], 0);
    const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;

    monthData.dre.salesMetrics.closersRequired = Math.ceil(totalWons / inputs.salesConfig.closerProductivity);
    monthData.dre.salesMetrics.sdrsRequired = Math.ceil(totalSQLs / inputs.salesConfig.sdrProductivity);
    monthData.dre.salesMetrics.farmersRequired = Math.ceil(clientesAtivos / inputs.salesConfig.farmerProductivity);

    // 2. Calcular remunerações
    monthData.dre.salesMetrics.remuneracaoCloser = monthData.dre.salesMetrics.closersRequired * inputs.salesConfig.closerSalary;
    monthData.dre.salesMetrics.remuneracaoSDR = monthData.dre.salesMetrics.sdrsRequired * inputs.salesConfig.sdrSalary;
    monthData.dre.salesMetrics.remuneracaoFarmer = monthData.dre.salesMetrics.farmersRequired * inputs.salesConfig.farmerSalary;

    // 3. Calcular comissões
    monthData.dre.salesMetrics.comissaoVendasActivation = monthData.totalNewRevenue * inputs.salesConfig.comissaoActivationRate;
    const receitaExpansionTotal = monthData.totalExpansionRevenue + monthData.totalLegacyExpansionRevenue;
    monthData.dre.salesMetrics.comissaoFarmerExpansion = receitaExpansionTotal * inputs.salesConfig.comissaoExpansionRate;

    // 4. Despesas fixas
    monthData.dre.salesMetrics.folhaGestaoComercial = inputs.salesConfig.folhaGestaoComercial;
    monthData.dre.salesMetrics.bonusCampanhasActivation = inputs.salesConfig.bonusCampanhasActivation;
    monthData.dre.salesMetrics.estruturaSuporte = inputs.salesConfig.estruturaSuporte[idx];
    monthData.dre.salesMetrics.despesasVisitasActivation = inputs.salesConfig.despesasVisitasActivation;
    monthData.dre.salesMetrics.bonusCampanhasExpansion = inputs.salesConfig.bonusCampanhasExpansion;
    monthData.dre.salesMetrics.comissaoOperacao = inputs.salesConfig.comissaoOperacao;
    monthData.dre.salesMetrics.despesasVisitasExpansion = inputs.salesConfig.despesasVisitasExpansion;

    // 5. Totais
    monthData.dre.salesMetrics.despesaComercialActivation = 
      monthData.dre.salesMetrics.bonusCampanhasActivation +
      monthData.dre.salesMetrics.comissaoVendasActivation +
      monthData.dre.salesMetrics.estruturaSuporte +
      monthData.dre.salesMetrics.remuneracaoCloser +
      monthData.dre.salesMetrics.remuneracaoSDR +
      monthData.dre.salesMetrics.despesasVisitasActivation;

    monthData.dre.salesMetrics.despesaComercialExpansion = 
      monthData.dre.salesMetrics.remuneracaoFarmer +
      monthData.dre.salesMetrics.comissaoFarmerExpansion +
      monthData.dre.salesMetrics.comissaoOperacao +
      monthData.dre.salesMetrics.bonusCampanhasExpansion +
      monthData.dre.salesMetrics.despesasVisitasExpansion;

    // Total Despesas Marketing e Vendas = Activation + Expansion + Folha Gestão Comercial
    monthData.dre.salesMetrics.totalDespesasMarketingVendas = 
      monthData.dre.salesMetrics.despesaComercialActivation +
      monthData.dre.salesMetrics.despesaComercialExpansion +
      monthData.dre.salesMetrics.folhaGestaoComercial;
    
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
    months[i].dre = calculateDRE(months[i], inputs, caixaAcumulado);
    caixaAcumulado = months[i].dre.caixaFinal;
  }
  
  return months;
}

// Função auxiliar para calcular DRE de um mês
function calculateDRE(
  monthData: MonthlyData,
  inputs: SimulationInputs,
  caixaInicialMes: number
): DREData {
  const config = inputs.dreConfig;
  const dre = createEmptyDREData(monthData.month);
  const idx = monthData.month - 1;
  
  // Calcular métricas necessárias para Sales Metrics e KPIs
  const totalWons = TIERS.reduce((sum, tier) => sum + monthData.wons[tier], 0);
  const totalSQLs = TIERS.reduce((sum, tier) => sum + monthData.sqls[tier], 0);
  const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;
  
  
  // ========== RECEITA ==========
  dre.revenue = monthData.totalRevenue;
  dre.activationRevenue = monthData.totalNewRevenue;
  dre.renewalRevenue = monthData.totalRenewalRevenue;
  dre.expansionRevenue = monthData.totalExpansionRevenue;
  dre.legacyRevenue = monthData.totalLegacyRevenue;
  
  // ========== DEDUÇÕES ==========
  dre.inadimplencia = dre.revenue * config.inadimplenciaRate;
  dre.churnM0Falcons = dre.revenue * config.churnM0FalconsRate;
  dre.churnRecebimentoOPS = dre.revenue * config.churnRecebimentoOPSRate;
  dre.performanceConversao = 1 - (config.inadimplenciaRate + config.churnM0FalconsRate + config.churnRecebimentoOPSRate);
  dre.receitaBrutaRecebida = dre.revenue - dre.inadimplencia - dre.churnM0Falcons - dre.churnRecebimentoOPS;
  
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
  // Use salesMetrics calculados anteriormente
  dre.salesMetrics = monthData.dre.salesMetrics;
  // Total = somente despesas comerciais (Activation + Expansion + Folha Gestão)
  dre.totalMarketingVendas = monthData.dre.salesMetrics.totalDespesasMarketingVendas;
  
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
