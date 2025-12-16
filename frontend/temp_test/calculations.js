const TIERS = ["enterprise", "large", "medium", "small", "tiny"];
const PRODUCTS = ["saber", "ter", "executarNoLoyalty", "executarLoyalty", "potencializar"];
const getMonthlyValue = (value, monthIndex) => {
  return Array.isArray(value) ? value[monthIndex] : value;
};
const createEmptyTierDistribution = () => ({
  enterprise: 0,
  large: 0,
  medium: 0,
  small: 0,
  tiny: 0
});
const createEmptyProductDistribution = () => ({
  saber: 0,
  ter: 0,
  executarNoLoyalty: 0,
  executarLoyalty: 0,
  potencializar: 0
});
const createEmptyTierProductRecord = () => ({
  enterprise: createEmptyProductDistribution(),
  large: createEmptyProductDistribution(),
  medium: createEmptyProductDistribution(),
  small: createEmptyProductDistribution(),
  tiny: createEmptyProductDistribution()
});
const createEmptyCapacityPlanData = () => ({
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
  turnoverRate: 0.07,
  // 7% default
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
  hoursUtilizationExecutar: 0
});
function calculateMonthlyData(inputs) {
  const months = [];
  if (!inputs.topline.investmentMonthly || inputs.topline.investmentMonthly.length !== 12) {
    throw new Error("`topline.investmentMonthly` must be an array of 12 numbers.");
  }
  if (!inputs.topline.cplMonthly || inputs.topline.cplMonthly.length !== 12) {
    throw new Error("`topline.cplMonthly` must be an array of 12 numbers.");
  }
  for (const tier of TIERS) {
    const m = inputs.tierMetrics[tier];
    if (!m.mqlDistribution || m.mqlDistribution.length !== 12) {
      throw new Error(`\`tierMetrics.${tier}.mqlDistribution\` must be an array of 12 numbers.`);
    }
  }
  let activeExecutarLoyalty = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: []
  };
  let activeExecutarNoLoyalty = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: []
  };
  let pendingSaberConversions = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: []
  };
  let legacyClients = {
    enterprise: inputs.legacyBase.enterprise,
    large: inputs.legacyBase.large,
    medium: inputs.legacyBase.medium,
    small: inputs.legacyBase.small,
    tiny: inputs.legacyBase.tiny
  };
  let runningSDR = inputs.salesConfig.currentSDR ?? 1;
  let runningClosers = inputs.salesConfig.currentClosers ?? 2;
  let pendingHiresSDR = 0;
  let pendingHiresClosers = 0;
  for (let month = 1; month <= 12; month++) {
    const idx = month - 1;
    const monthData = {
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
        tiny: { loyalty: 0, noLoyalty: 0 }
      },
      totalNewRevenue: 0,
      totalRenewalRevenue: 0,
      totalExpansionRevenue: 0,
      totalLegacyRevenue: 0,
      totalLegacyRenewalRevenue: 0,
      totalLegacyExpansionRevenue: 0,
      totalRevenue: 0,
      totalActiveClients: 0,
      capacityPlan: createEmptyCapacityPlanData()
    };
    const investmentForMonth = inputs.topline.investmentMonthly[idx];
    const cplForMonth = inputs.topline.cplMonthly[idx];
    if (!cplForMonth || cplForMonth <= 0) {
      throw new Error(`\`topline.cplMonthly[${idx}]\` must be a positive number.`);
    }
    const totalMQLsForMonth = Math.round(investmentForMonth / cplForMonth);
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      const mqlDistribution = metrics.mqlDistribution[idx];
      const mqlToSqlRate = metrics.mqlToSqlRate[idx];
      const sqlToSalRate = metrics.sqlToSalRate[idx];
      const salToWonRate = metrics.salToWonRate[idx];
      const activationRate = metrics.activationRate[idx];
      const revenueActivationRate = metrics.revenueActivationRate[idx];
      const mqls = Math.round(totalMQLsForMonth * mqlDistribution);
      monthData.mqls[tier] = mqls;
      const sqls = Math.round(mqls * mqlToSqlRate);
      monthData.sqls[tier] = sqls;
      const sals = Math.round(sqls * sqlToSalRate);
      monthData.sals[tier] = sals;
      const wons = Math.round(sals * salToWonRate);
      monthData.wons[tier] = wons;
      const activations = Math.floor(wons * activationRate);
      let remainingActivations = activations;
      let lowestTicketIndex = 2;
      let lowestTicket = Infinity;
      for (let pi = 0; pi < PRODUCTS.length; pi++) {
        const product = PRODUCTS[pi];
        const ticket = metrics.productTickets[product][idx];
        const dist = metrics.productDistribution[product][idx];
        if (ticket > 0 && ticket < lowestTicket && dist > 0) {
          lowestTicket = ticket;
          lowestTicketIndex = pi;
        }
      }
      let totalDistributedActivations = 0;
      for (let i = 0; i < PRODUCTS.length; i++) {
        const product = PRODUCTS[i];
        const distribution = metrics.productDistribution[product][idx];
        const ticket = metrics.productTickets[product][idx];
        let activatedClients;
        if (i === lowestTicketIndex) {
          activatedClients = remainingActivations;
          remainingActivations = 0;
        } else {
          activatedClients = Math.floor(activations * distribution);
          remainingActivations -= activatedClients;
        }
        totalDistributedActivations += activatedClients;
        let revenue;
        let revenueWithoutBreakdown;
        if (product === "executarNoLoyalty") {
          revenueWithoutBreakdown = activatedClients * ticket * inputs.conversionRates.noLoyaltyDuration;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        } else if (product === "executarLoyalty") {
          revenueWithoutBreakdown = activatedClients * ticket * inputs.conversionRates.loyaltyDuration;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        } else {
          revenueWithoutBreakdown = activatedClients * ticket;
          revenue = revenueWithoutBreakdown * revenueActivationRate;
        }
        const breakdownAmount = revenueWithoutBreakdown - revenue;
        monthData.revenueByTierProduct[tier][product] = revenue;
        monthData.activeClients[tier][product] = activatedClients;
        monthData.directActivations[tier][product] = activatedClients;
        monthData.activationBreakdown[tier][product] = breakdownAmount;
        if (product === "saber" && activatedClients > 0) {
          pendingSaberConversions[tier].push({ clients: activatedClients, month });
        } else if (product === "executarLoyalty" && activatedClients > 0) {
          activeExecutarLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        } else if (product === "executarNoLoyalty" && activatedClients > 0) {
          activeExecutarNoLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
        }
        monthData.totalNewRevenue += revenue;
      }
      monthData.activations[tier] = totalDistributedActivations;
    }
    for (const tier of TIERS) {
      pendingSaberConversions[tier] = pendingSaberConversions[tier].filter((c) => month - c.month < 2);
    }
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      for (const cohort of activeExecutarLoyalty[tier]) {
        const monthsSinceStart = month - cohort.month;
        if (monthsSinceStart > 0 && monthsSinceStart % inputs.conversionRates.loyaltyDuration === 0) {
          if (cohort.renewals < inputs.conversionRates.loyaltyMaxRenewals) {
            const renewingClients = Math.round(cohort.clients * inputs.conversionRates.loyaltyRenewalRate);
            const renewalRevenue = renewingClients * metrics.productTickets.executarLoyalty[idx] * inputs.conversionRates.loyaltyDuration;
            monthData.renewals[tier].executarLoyalty += renewingClients;
            monthData.renewalRevenue[tier].executarLoyalty += renewalRevenue;
            monthData.totalRenewalRevenue += renewalRevenue;
            cohort.renewals++;
          }
        }
      }
    }
    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      for (const cohort of activeExecutarNoLoyalty[tier]) {
        const monthsSinceStart = month - cohort.month;
        if (monthsSinceStart > 0 && monthsSinceStart % inputs.conversionRates.noLoyaltyDuration === 0) {
          if (cohort.renewals < inputs.conversionRates.noLoyaltyMaxRenewals) {
            const renewingClients = Math.round(cohort.clients * inputs.conversionRates.noLoyaltyRenewalRate);
            const renewalRevenue = renewingClients * metrics.productTickets.executarNoLoyalty[idx] * inputs.conversionRates.noLoyaltyDuration;
            monthData.renewals[tier].executarNoLoyalty += renewingClients;
            monthData.renewalRevenue[tier].executarNoLoyalty += renewalRevenue;
            monthData.totalRenewalRevenue += renewalRevenue;
            cohort.renewals++;
          }
        }
      }
    }
    for (const tier of TIERS) {
      const totalActiveExecutar = activeExecutarLoyalty[tier].reduce((sum, c) => sum + c.clients, 0) + activeExecutarNoLoyalty[tier].reduce((sum, c) => sum + c.clients, 0);
      const expandingClients = Math.round(totalActiveExecutar * inputs.conversionRates.expansionRate);
      if (expandingClients > 0) {
        const expDist = tier === "enterprise" || tier === "large" ? inputs.expansionDistribution.largeEnterprise : tier === "medium" ? inputs.expansionDistribution.medium : inputs.expansionDistribution.smallTiny;
        const metrics = inputs.tierMetrics[tier];
        for (const product of PRODUCTS) {
          const clients = Math.round(expandingClients * expDist[product]);
          const ticket = metrics.productTickets[product][idx];
          let revenue;
          if (product === "executarNoLoyalty") {
            revenue = clients * ticket * inputs.conversionRates.noLoyaltyDuration;
          } else if (product === "executarLoyalty") {
            revenue = clients * ticket * inputs.conversionRates.loyaltyDuration;
          } else {
            revenue = clients * ticket;
          }
          monthData.activeBaseExpansions[tier][product] += clients;
          monthData.activeBaseExpansionRevenue[tier][product] += revenue;
          monthData.expansions[tier][product] += clients;
          monthData.expansionRevenue[tier][product] += revenue;
          monthData.totalExpansionRevenue += revenue;
        }
      }
    }
    for (const tier of TIERS) {
      const tierLegacy = legacyClients[tier];
      monthData.legacyRevenueBeforeChurn[tier] = tierLegacy.revenue;
      const churnRateForMonth = Array.isArray(inputs.legacyBase.churnRate) ? inputs.legacyBase.churnRate[idx] : inputs.legacyBase.churnRate;
      const remainingClients = Math.round(tierLegacy.clients * (1 - churnRateForMonth));
      const remainingRevenue = tierLegacy.revenue * (1 - churnRateForMonth);
      const expansionRateForMonth = Array.isArray(inputs.legacyBase.expansionRate) ? inputs.legacyBase.expansionRate[idx] : inputs.legacyBase.expansionRate;
      const expansionRevenue = remainingRevenue * expansionRateForMonth;
      const expDist = tier === "enterprise" || tier === "large" ? inputs.expansionDistribution.largeEnterprise : tier === "medium" ? inputs.expansionDistribution.medium : inputs.expansionDistribution.smallTiny;
      for (const product of PRODUCTS) {
        const productExpansion = expansionRevenue * expDist[product];
        monthData.legacyExpansionByProduct[tier][product] = productExpansion;
      }
      monthData.legacyClients[tier] = remainingClients;
      monthData.legacyRevenue[tier] = remainingRevenue + expansionRevenue;
      monthData.legacyExpansionRevenue[tier] = expansionRevenue;
      monthData.totalLegacyRevenue += remainingRevenue + expansionRevenue;
      monthData.totalLegacyExpansionRevenue += expansionRevenue;
      legacyClients[tier] = {
        clients: remainingClients,
        revenue: remainingRevenue + expansionRevenue
      };
    }
    for (const tier of TIERS) {
      for (const product of PRODUCTS) {
        monthData.totalActiveClients += monthData.activeClients[tier][product];
      }
      monthData.totalActiveClients += monthData.legacyClients[tier];
    }
    monthData.totalLegacyRenewalRevenue = monthData.totalLegacyRevenue - monthData.totalLegacyExpansionRevenue;
    monthData.totalRevenue = monthData.totalNewRevenue + monthData.totalRenewalRevenue + monthData.totalExpansionRevenue + monthData.totalLegacyRevenue;
    const prevMonthCapacity = months.length > 0 ? months[months.length - 1].capacityPlan : null;
    const capacityConfig = inputs.capacityPlan;
    for (const tier of TIERS) {
      const newSaber = monthData.activeClients[tier].saber;
      monthData.capacityPlan.clientsSaberByTier[tier] = newSaber;
      monthData.capacityPlan.totalClientsSaber += newSaber;
    }
    for (const tier of TIERS) {
      const legacy = monthData.legacyClients[tier];
      const executarActive = monthData.activeClients[tier].executarLoyalty + monthData.activeClients[tier].executarNoLoyalty;
      const ter = monthData.activeClients[tier].ter;
      monthData.capacityPlan.clientsExecutarByTier[tier] = legacy + executarActive + ter;
      monthData.capacityPlan.totalClientsExecutar += legacy + executarActive + ter;
    }
    let totalHoursSaber = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsSaberByTier[tier];
      if (clients > 0) {
        let hoursPerClient = 0;
        for (const role in capacityConfig.saberSquad.roleHours) {
          const roleHours = capacityConfig.saberSquad.roleHours[role];
          hoursPerClient += roleHours[tier] || 0;
        }
        totalHoursSaber += clients * hoursPerClient;
      }
    }
    monthData.capacityPlan.totalHoursSaber = totalHoursSaber;
    let totalHoursExecutar = 0;
    for (const tier of TIERS) {
      const clients = monthData.capacityPlan.clientsExecutarByTier[tier];
      if (clients > 0) {
        let hoursPerClient = 0;
        for (const role in capacityConfig.executarSquad.roleHours) {
          const roleHours = capacityConfig.executarSquad.roleHours[role];
          hoursPerClient += roleHours[tier] || 0;
        }
        totalHoursExecutar += clients * hoursPerClient;
      }
    }
    monthData.capacityPlan.totalHoursExecutar = totalHoursExecutar;
    const hoursPerSquadSaber = capacityConfig.saberSquad.headcount * capacityConfig.saberSquad.productiveHoursPerPerson;
    const hoursPerSquadExecutar = capacityConfig.executarSquad.headcount * capacityConfig.executarSquad.productiveHoursPerPerson;
    const availability = capacityConfig.availabilityFactor ?? 0.85;
    const effectiveHoursPerPersonSaber = capacityConfig.saberSquad.productiveHoursPerPerson * availability;
    const effectiveHoursPerPersonExecutar = capacityConfig.executarSquad.productiveHoursPerPerson * availability;
    const peopleGrossSaber = effectiveHoursPerPersonSaber > 0 ? Math.ceil(totalHoursSaber / effectiveHoursPerPersonSaber) : 0;
    const peopleGrossExecutar = effectiveHoursPerPersonExecutar > 0 ? Math.ceil(totalHoursExecutar / effectiveHoursPerPersonExecutar) : 0;
    monthData.capacityPlan.hcSaber = peopleGrossSaber;
    monthData.capacityPlan.hcExecutar = peopleGrossExecutar;
    monthData.capacityPlan.totalHC = monthData.capacityPlan.hcSaber + monthData.capacityPlan.hcExecutar;
    monthData.capacityPlan.squadsSaber = capacityConfig.saberSquad.headcount > 0 ? Math.ceil(monthData.capacityPlan.hcSaber / capacityConfig.saberSquad.headcount) : 0;
    monthData.capacityPlan.squadsExecutar = capacityConfig.executarSquad.headcount > 0 ? Math.ceil(monthData.capacityPlan.hcExecutar / capacityConfig.executarSquad.headcount) : 0;
    monthData.capacityPlan.totalSquads = monthData.capacityPlan.squadsSaber + monthData.capacityPlan.squadsExecutar;
    const turnoverRate = 0.07;
    monthData.capacityPlan.turnoverRate = turnoverRate;
    const prevHCSaber = prevMonthCapacity?.hcSaber || inputs.capacityPlan.initialHCSaber;
    const prevHCExecutar = prevMonthCapacity?.hcExecutar || inputs.capacityPlan.initialHCExecutar;
    monthData.capacityPlan.turnoverSaber = Math.round(prevHCSaber * turnoverRate);
    monthData.capacityPlan.turnoverExecutar = Math.round(prevHCExecutar * turnoverRate);
    monthData.capacityPlan.totalTurnover = monthData.capacityPlan.turnoverSaber + monthData.capacityPlan.turnoverExecutar;
    const hcGrowthSaber = monthData.capacityPlan.hcSaber - prevHCSaber;
    const hcGrowthExecutar = monthData.capacityPlan.hcExecutar - prevHCExecutar;
    monthData.capacityPlan.hiresSaber = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber);
    monthData.capacityPlan.hiresExecutar = Math.max(0, hcGrowthExecutar + monthData.capacityPlan.turnoverExecutar);
    monthData.capacityPlan.totalHires = monthData.capacityPlan.hiresSaber + monthData.capacityPlan.hiresExecutar;
    const remainingAfterTurnoverExecutar = Math.max(0, prevHCExecutar - monthData.capacityPlan.turnoverExecutar);
    const redeployableFromExecutar = Math.max(0, remainingAfterTurnoverExecutar - monthData.capacityPlan.hcExecutar);
    monthData.capacityPlan.redeployableFromExecutar = redeployableFromExecutar;
    monthData.capacityPlan.hiresSaberWithRedeployment = Math.max(0, hcGrowthSaber + monthData.capacityPlan.turnoverSaber - redeployableFromExecutar);
    monthData.capacityPlan.totalHiresWithRedeployment = monthData.capacityPlan.hiresSaberWithRedeployment + monthData.capacityPlan.hiresExecutar;
    const totalMQLs = Object.values(monthData.mqls).reduce((s, v) => s + v, 0);
    const totalSALs = Object.values(monthData.sals).reduce((s, v) => s + v, 0);
    if (pendingHiresSDR > 0) {
      runningSDR += pendingHiresSDR;
    }
    if (pendingHiresClosers > 0) {
      runningClosers += pendingHiresClosers;
    }
    const requiredSDR = Math.ceil(totalMQLs / 200);
    const requiredClosers = Math.ceil(totalSALs / 50);
    const hiresToScheduleSDR = Math.max(0, requiredSDR - runningSDR);
    const hiresToScheduleClosers = Math.max(0, requiredClosers - runningClosers);
    pendingHiresSDR = hiresToScheduleSDR;
    pendingHiresClosers = hiresToScheduleClosers;
    monthData.capacityPlan.salesSDRRequired = requiredSDR;
    monthData.capacityPlan.salesClosersRequired = requiredClosers;
    monthData.capacityPlan.salesCurrentSDR = runningSDR;
    monthData.capacityPlan.salesCurrentClosers = runningClosers;
    monthData.capacityPlan.salesHires = hiresToScheduleSDR + hiresToScheduleClosers;
    const totalWons = Object.values(monthData.wons).reduce((s, v) => s + v, 0);
    const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;
    const salesMetrics = {
      closersRequired: Math.ceil(totalWons / inputs.salesConfig.closerProductivity),
      sdrsRequired: Math.ceil(totalMQLs / inputs.salesConfig.sdrProductivity),
      // Use totalMQLs computed above
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
      totalDespesasMarketingVendas: 0
    };
    salesMetrics.remuneracaoCloser = salesMetrics.closersRequired * inputs.salesConfig.closerSalary;
    salesMetrics.remuneracaoSDR = salesMetrics.sdrsRequired * inputs.salesConfig.sdrSalary;
    salesMetrics.remuneracaoFarmer = salesMetrics.farmersRequired * inputs.salesConfig.farmerSalary;
    salesMetrics.comissaoVendasActivation = monthData.totalNewRevenue * inputs.salesConfig.comissaoActivationRate;
    const receitaExpansionTotal = monthData.totalExpansionRevenue + monthData.totalLegacyExpansionRevenue;
    salesMetrics.comissaoFarmerExpansion = receitaExpansionTotal * inputs.salesConfig.comissaoExpansionRate;
    salesMetrics.comissaoOperacao = receitaExpansionTotal * (inputs.salesConfig.comissaoMonetizacaoOpsRate ?? inputs.salesConfig.comissaoExpansionRate);
    salesMetrics.despesaComercialActivation = salesMetrics.bonusCampanhasActivation + salesMetrics.comissaoVendasActivation + salesMetrics.estruturaSuporte + salesMetrics.remuneracaoCloser + salesMetrics.remuneracaoSDR + salesMetrics.despesasVisitasActivation;
    salesMetrics.despesaComercialExpansion = salesMetrics.remuneracaoFarmer + salesMetrics.comissaoFarmerExpansion + salesMetrics.bonusCampanhasExpansion + salesMetrics.despesasVisitasExpansion;
    salesMetrics.totalDespesasMarketingVendas = salesMetrics.despesaComercialActivation + salesMetrics.despesaComercialExpansion + salesMetrics.folhaGestaoComercial;
    monthData.salesMetrics = salesMetrics;
    if (monthData.capacityPlan.totalHC > 0) {
      monthData.capacityPlan.revenuePerHC = monthData.totalRevenue / monthData.capacityPlan.totalHC;
    }
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
  return months;
}
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
function formatPercentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}
export {
  calculateMonthlyData,
  formatCurrency,
  formatNumber,
  formatPercentage
};
