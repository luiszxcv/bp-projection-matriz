"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMonthlyData = calculateMonthlyData;
exports.formatCurrency = formatCurrency;
exports.formatNumber = formatNumber;
exports.formatPercentage = formatPercentage;
const TIERS = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];
// Helper: get value from number or array (for monthly CSP salaries with ramp)
const getMonthlyValue = (value, monthIndex) => {
    return Array.isArray(value) ? value[monthIndex] : value;
};
const createEmptyTierDistribution = () => ({
    enterprise: 0,
    large: 0,
    medium: 0,
    small: 0,
    tiny: 0,
});
const createEmptyProductDistribution = () => ({
    saber: 0,
    ter: 0,
    executarNoLoyalty: 0,
    executarLoyalty: 0,
    potencializar: 0,
});
const createEmptyTierProductRecord = () => ({
    enterprise: createEmptyProductDistribution(),
    large: createEmptyProductDistribution(),
    medium: createEmptyProductDistribution(),
    small: createEmptyProductDistribution(),
    tiny: createEmptyProductDistribution(),
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
const createEmptyWTPTierData = () => ({
    goLiveClients: 0,
    revenueAtGoLive: 0,
    totalShareOfWallet: 0,
    shareOfWalletActived: 0,
    shareOfWalletRemaining: 0,
    expansionGoal: 0,
    numExpansions: 0,
    revenueExpansion: 0,
    saturationIndex: 0,
    monetizationPotential: 0,
    expansionByProduct: createEmptyProductDistribution(),
});
const createEmptyWTPData = () => ({
    enterprise: createEmptyWTPTierData(),
    large: createEmptyWTPTierData(),
    medium: createEmptyWTPTierData(),
    small: createEmptyWTPTierData(),
    tiny: createEmptyWTPTierData(),
});
function calculateMonthlyData(inputs) {
    const months = [];
    // Validate inputs
    if (!inputs.topline.investmentMonthly || inputs.topline.investmentMonthly.length !== 12) {
        throw new Error('`topline.investmentMonthly` must be an array of 12 numbers.');
    }
    if (!inputs.topline.cplMonthly || inputs.topline.cplMonthly.length !== 12) {
        throw new Error('`topline.cplMonthly` must be an array of 12 numbers.');
    }
    if (!inputs.topline.leadToMqlRate || inputs.topline.leadToMqlRate.length !== 12) {
        throw new Error('`topline.leadToMqlRate` must be an array of 12 numbers.');
    }
    for (const tier of TIERS) {
        const m = inputs.tierMetrics[tier];
        if (!m.mqlDistribution || m.mqlDistribution.length !== 12) {
            throw new Error(`\`tierMetrics.${tier}.mqlDistribution\` must be an array of 12 numbers.`);
        }
    }
    // Track active clients over time for renewals and expansions
    let activeExecutarLoyalty = {
        enterprise: [],
        large: [],
        medium: [],
        small: [],
        tiny: [],
    };
    let activeExecutarNoLoyalty = {
        enterprise: [],
        large: [],
        medium: [],
        small: [],
        tiny: [],
    };
    // Legacy base tracking — only keep per-tier objects (clients/revenue)
    let legacyClients = {
        enterprise: inputs.legacyBase.enterprise,
        large: inputs.legacyBase.large,
        medium: inputs.legacyBase.medium,
        small: inputs.legacyBase.small,
        tiny: inputs.legacyBase.tiny,
    };
    // Sales running headcount (contratações persistem entre meses)
    let runningSDR = inputs.salesConfig.currentSDR ?? 1;
    let runningClosers = inputs.salesConfig.currentClosers ?? 2;
    // Hires scheduled this month that will onboard next month
    let pendingHiresSDR = 0;
    const wtpCohorts = {
        enterprise: [],
        large: [],
        medium: [],
        small: [],
        tiny: [],
    };
    // WTP percent desired array per month should come from inputs.wtp.percentDesired (12 items)
    // Fallback: use inputs.topline.percentDesiredMonthly or zeros
    // fallback empty placeholder - per-tier desired percentages are in inputs.wtpConfig[tier].shareOfWalletDesired
    const percentDesiredMonthly = Array(12).fill(0);
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
            // conversions removed - not used after removal of Saber->Executar logic
            totalLeads: 0,
            totalNewRevenue: 0,
            totalRenewalRevenue: 0,
            totalExpansionRevenue: 0,
            totalLegacyRevenue: 0,
            totalLegacyRenewalRevenue: 0,
            totalLegacyExpansionRevenue: 0,
            totalRevenue: 0,
            totalActiveClients: 0,
            capacityPlan: createEmptyCapacityPlanData(),
            // WTP (Willingness to Pay) - Expansion Line
            wtpData: createEmptyWTPData(),
            totalWTPExpansionRevenue: 0,
        };
        // Get monthly values
        const investmentForMonth = inputs.topline.investmentMonthly[idx];
        const cplForMonth = inputs.topline.cplMonthly[idx];
        if (!cplForMonth || cplForMonth <= 0) {
            throw new Error(`\`topline.cplMonthly[${idx}]\` must be a positive number.`);
        }
        const leadToMqlRateForMonth = inputs.topline.leadToMqlRate[idx] ?? 0.8; // Default 80% if missing
        // Leads = Budget / CPL
        const leadsForMonth = Math.round(investmentForMonth / cplForMonth);
        monthData.totalLeads = leadsForMonth;
        // MQLs = Leads * leadToMqlRate
        const totalMQLsForMonth = Math.round(leadsForMonth * leadToMqlRateForMonth);
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
                let activatedClients;
                if (i === lowestTicketIndex) {
                    // Lowest ticket product gets remaining activations
                    activatedClients = remainingActivations;
                    remainingActivations = 0; // Zero out to prevent subsequent products from getting extra clients
                }
                else {
                    // Distribute proportionally and use floor
                    activatedClients = Math.floor(activations * distribution);
                    remainingActivations -= activatedClients;
                }
                totalDistributedActivations += activatedClients;
                // Calcular receita: todos os produtos aplicam revenueActivationRate
                let revenue;
                let revenueWithoutBreakdown;
                if (product === 'executarNoLoyalty') {
                    // NoLoyalty: ticket mensal × 2 meses × revenueActivationRate (93%)
                    revenueWithoutBreakdown = activatedClients * ticket * inputs.conversionRates.noLoyaltyDuration;
                    revenue = revenueWithoutBreakdown * revenueActivationRate;
                }
                else if (product === 'executarLoyalty') {
                    // Loyalty: ticket mensal × duration × revenueActivationRate (93%)
                    // Need to get loyalty duration for this tier
                    const duration = inputs.conversionRates.loyaltyDuration[tier];
                    revenueWithoutBreakdown = activatedClients * ticket * duration;
                    revenue = revenueWithoutBreakdown * revenueActivationRate;
                }
                else {
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
                    // No tracking for conversions needed anymore
                }
                else if (product === 'executarLoyalty' && activatedClients > 0) {
                    activeExecutarLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
                }
                else if (product === 'executarNoLoyalty' && activatedClients > 0) {
                    activeExecutarNoLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
                }
                monthData.totalNewRevenue += revenue;
            }
            // Update activations with actual distributed sum
            monthData.activations[tier] = totalDistributedActivations;
        }
        // ==========================================================================
        // [DISABLED] Conversão Saber → Executar - Desativado para análise de impacto
        // ==========================================================================
        // Este bloco foi desativado para medir o impacto da conversão na receita.
        // Para reativar, remova os comentários abaixo.
        // Após confirmar o impacto, este bloco será substituído pelo modelo WTP.
        // ==========================================================================
        /* [DISABLED - Saber → Executar Conversion]
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
    
    
    
              activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
            }
            if (noLoyaltyClients > 0) {
              const monthlyTicket = metrics.productTickets.executarNoLoyalty[idx];
              const duration = inputs.conversionRates.noLoyaltyDuration;
              const noLoyaltyRevenue = noLoyaltyClients * monthlyTicket * duration;
    
              monthData.revenueByTierProduct[tier].executarNoLoyalty += noLoyaltyRevenue;
              monthData.activeClients[tier].executarNoLoyalty += noLoyaltyClients;
              monthData.totalNewRevenue += noLoyaltyRevenue;
    
    
    
              activeExecutarNoLoyalty[tier].push({ clients: noLoyaltyClients, month, renewals: 0 });
            }
          }
          pendingSaberConversions[tier] = pendingSaberConversions[tier].filter(c => month - c.month < 2);
        }
        */ // [END DISABLED]
        // Process Loyalty renewals (every 7 months, max 2 renewals)
        for (const tier of TIERS) {
            const metrics = inputs.tierMetrics[tier];
            for (const cohort of activeExecutarLoyalty[tier]) {
                const monthsSinceStart = month - cohort.month;
                const duration = inputs.conversionRates.loyaltyDuration[tier];
                if (monthsSinceStart > 0 && monthsSinceStart % duration === 0) {
                    if (cohort.renewals < inputs.conversionRates.loyaltyMaxRenewals) {
                        const renewingClients = Math.round(cohort.clients * inputs.conversionRates.loyaltyRenewalRate);
                        // Loyalty: ticket mensal × duration
                        const renewalRevenue = renewingClients * metrics.productTickets.executarLoyalty[idx] * duration;
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
        // ==========================================================================
        // [DISABLED] Expansão baseada em % expansionRate - SUBSTITUÍDA POR WTP
        // ==========================================================================
        // A expansão agora é calculada exclusivamente pelo modelo WTP (Share of Wallet)
        // O bloco abaixo foi desativado e substituído pelo cálculo WTP mais adiante.
        // ==========================================================================
        /* [DISABLED - Expansão antiga baseada em %]
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
    
              let revenue: number;
              if (product === 'executarNoLoyalty') {
                revenue = clients * ticket * inputs.conversionRates.noLoyaltyDuration;
              } else if (product === 'executarLoyalty') {
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
        */ // [END DISABLED - Expansão agora é feita via WTP]
        // ==========================================================================
        // [DISABLED] Base Legada - REMOVIDA DO MODELO
        // ==========================================================================
        // A base legada foi removida do modelo. Os campos permanecem zerados.
        // ==========================================================================
        /* [DISABLED - Base Legada removida]
        // Calculate legacy base
        for (const tier of TIERS) {
          const tierLegacy = legacyClients[tier];
    
          // Store revenue before churn
          monthData.legacyRevenueBeforeChurn[tier] = tierLegacy.revenue;
    
          // Apply churn (monthly value)
          const churnRateForMonth = Array.isArray(inputs.legacyBase.churnRate)
            ? inputs.legacyBase.churnRate[idx]
            : inputs.legacyBase.churnRate;
          const remainingClients = Math.round(tierLegacy.clients * (1 - churnRateForMonth));
          const remainingRevenue = tierLegacy.revenue * (1 - churnRateForMonth);
    
          // Apply expansion (monthly value)
          const expansionRateForMonth = Array.isArray(inputs.legacyBase.expansionRate)
            ? inputs.legacyBase.expansionRate[idx]
            : inputs.legacyBase.expansionRate;
          const expansionRevenue = remainingRevenue * expansionRateForMonth;
    
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
        */ // [END DISABLED - Base Legada]
        // Base legada zerada - campos mantidos para compatibilidade mas sem valores
        for (const tier of TIERS) {
            monthData.legacyClients[tier] = 0;
            monthData.legacyRevenue[tier] = 0;
            monthData.legacyExpansionRevenue[tier] = 0;
            monthData.legacyRevenueBeforeChurn[tier] = 0;
            for (const product of PRODUCTS) {
                monthData.legacyExpansionByProduct[tier][product] = 0;
            }
        }
        monthData.totalLegacyRevenue = 0;
        monthData.totalLegacyExpansionRevenue = 0;
        // Calculate total active clients
        for (const tier of TIERS) {
            for (const product of PRODUCTS) {
                monthData.totalActiveClients += monthData.activeClients[tier][product];
            }
            // Não somar legacy pois está zerado
        }
        // ==========================================================================
        // WTP (Willingness to Pay) - Expansion Line Calculation
        // ==========================================================================
        // MODELO CORRETO BASEADO NA PLANILHA EXCEL:
        // - % Desired é um INCREMENTO MENSAL sobre o Revenue Live
        // - Cada mês: Expansion = Revenue_Live × % Desired[mês]
        // - Limitado pelo Share of Wallet Remaining (bolso do cliente)
        // ==========================================================================
        // ==========================================================================
        // WTP (Willingness to Pay) - Expansion Line Calculation (MULTI-COHORT)
        // ==========================================================================
        // MODELO CORRETO - VALIDADO EM 11/12/2025:
        // 1. Multi-Safras: Cada mês cria uma safra independente.
        // 2. Multiplicadores por Tier: Enterprise/Medium (1x), Large (2x), Small/Tiny (0.5x).
        // 3. Lag de 1 Mês: Receita expande no mês M para atingir meta do mês M+1.
        // 4. % Desired: É um target INCREMENTAL sobre a receita de ativação (RevenueAtGoLive).
        // ==========================================================================
        const TIER_MULTIPLIERS = {
            enterprise: 1.0,
            large: 2.0,
            medium: 1.0,
            small: 0.5,
            tiny: 0.5,
        };
        // 1) Criar cohorts a partir da receita de ativação deste mês (revenueAtGoLive)
        for (const tier of TIERS) {
            // revenueAtGoLive: soma da receita por produtos originados por ativação neste mês
            const revenueAtGoLive = Object.values(monthData.revenueByTierProduct[tier]).reduce((s, v) => s + v, 0);
            if (revenueAtGoLive > 0) {
                wtpCohorts[tier].push({ monthOfBirth: month, revenueAtGoLive, shareOfWalletActived: 0 });
                // Update monthly WTP report fields
                monthData.wtpData[tier].goLiveClients += monthData.activations[tier] || 0;
                monthData.wtpData[tier].revenueAtGoLive += revenueAtGoLive;
            }
        }
        // 2) Para cada cohort existente, calcular Goal e aplicar lag (meta do próximo mês é atingida neste mês)
        for (const tier of TIERS) {
            const metrics = inputs.tierMetrics[tier];
            const avgTicketByTier = (metrics.productTickets?.executarLoyalty?.[idx] || metrics.productTickets?.executarNoLoyalty?.[idx] || 0);
            for (const cohort of wtpCohorts[tier]) {
                const age = month - cohort.monthOfBirth + 1; // 1-based month index for the cohort
                // Calculate Goal for this cohort for age 'age' (Goal[1] uses revenueAtGoLive * TierMultiplier)
                const tierMultiplier = TIER_MULTIPLIERS[tier] ?? 1;
                // Per-tier desired percentages live in inputs.wtpConfig[tier].shareOfWalletDesired
                const tierDesiredArray = inputs.wtpConfig?.[tier]?.shareOfWalletDesired ?? percentDesiredMonthly;
                const desiredPercent = tierDesiredArray[age - 1] ?? 0;
                const goal = age === 1
                    ? cohort.revenueAtGoLive * tierMultiplier
                    : cohort.revenueAtGoLive * desiredPercent * tierMultiplier;
                // Lag rule: Revenue expansion in month M aims to satisfy Goal of month M+1
                const nextDesiredPercent = tierDesiredArray[age] ?? 0;
                const targetGoal = (age + 1) === 1
                    ? cohort.revenueAtGoLive * tierMultiplier
                    : cohort.revenueAtGoLive * nextDesiredPercent * tierMultiplier;
                if (targetGoal <= 0)
                    continue;
                // Determine average ticket to convert Goal into discrete expansions (fallback to 1 if zero)
                const averageTicket = Math.max(1, avgTicketByTier || 1);
                // Number of expansions still possible for this cohort = floor((targetGoal - alreadyCaptured) / averageTicket)
                const remainingTarget = Math.max(0, targetGoal - cohort.shareOfWalletActived);
                const numExpansions = Math.floor(remainingTarget / averageTicket);
                if (numExpansions <= 0)
                    continue;
                const revenueExpansion = numExpansions * averageTicket;
                // accumulate reporting values
                monthData.wtpData[tier].expansionGoal += targetGoal;
                monthData.wtpData[tier].numExpansions += numExpansions;
                monthData.wtpData[tier].revenueExpansion += revenueExpansion;
                // Distribute revenueExpansion into products proportionally using expansionDistribution
                const expDist = tier === 'enterprise' || tier === 'large'
                    ? inputs.expansionDistribution.largeEnterprise
                    : tier === 'medium'
                        ? inputs.expansionDistribution.medium
                        : inputs.expansionDistribution.smallTiny;
                for (const product of PRODUCTS) {
                    const clients = Math.round(numExpansions * expDist[product]);
                    const ticket = metrics.productTickets[product][idx] || averageTicket;
                    let revenueForProduct = 0;
                    if (product === 'executarNoLoyalty') {
                        revenueForProduct = clients * ticket * inputs.conversionRates.noLoyaltyDuration;
                    }
                    else if (product === 'executarLoyalty') {
                        const duration = inputs.conversionRates.loyaltyDuration[tier];
                        revenueForProduct = clients * ticket * duration;
                    }
                    else {
                        revenueForProduct = clients * ticket;
                    }
                    monthData.activeBaseExpansions[tier][product] += clients;
                    monthData.activeBaseExpansionRevenue[tier][product] += revenueForProduct;
                    monthData.expansions[tier][product] += clients;
                    monthData.expansionRevenue[tier][product] += revenueForProduct;
                    monthData.totalExpansionRevenue += revenueForProduct;
                    monthData.wtpData[tier].expansionByProduct[product] += revenueForProduct;
                }
                cohort.shareOfWalletActived += revenueExpansion;
            }
        }
        // Inicializar array de safras se não existir (no escopo da função, fora do loop mensal)
        // Mas como estamos dentro do loop mensal, precisamos manter o estado FORA do loop 'for (let month...)'.
        // O estado 'wtpCumulativeTracking' anterior era um objeto simples acumulado.
        // Agora precisamos de um array de safras que persiste entre iterações do mês.
        // Vamos usar a variável 'wtpCohorts' declarada fora do loop.
        // NOTA: Como estou substituindo apenas este bloco, assumo que wtpCohorts foi declarado acima.
        // SE NÃO FOI (pq substitui o tracking antigo), PRECISAREI DECLARAR AQUI OU ADAPTAR.
        // O tracking antigo 'wtpCumulativeTracking' foi declarado na linha 148.
        // Vou usar uma variável nova anexada ao escopo superior via replace, mas espera...
        // O 'replace_file_content' substitui um bloco. Eu não posso declarar variáveis fora desse bloco se o bloco está dentro do loop.
        // O loop começa na linha 163. As variáveis de estado devem estar ANTES da linha 163.
        // OBLIQUE STRATEGY: Eu preciso editar as declarações de variáveis antes do loop também.
        // Como o 'replace_file_content' é um bloco contíguo, e as declarações estão nas linhas 148-159, e o loop começa na 163...
        // Eu posso fazer um replace maior que pega desde a declaração até o fim do bloco WTP.
        // As linhas 145-160 contêm a declaração do tracking antigo.
        // As linhas 163-564 contêm o início do loop e lógica antiga/desativada.
        // A linha 573 começa o bloco WTP que quero mudar.
        // Se eu mudar APENAS o bloco interno (573+), eu perco acesso ao estado persistente adequado se ele não foi alterado lá em cima.
        // Pior: 'wtpCumulativeTracking' está declarado lá em cima como objeto único, não array.
        // SOLUÇÃO: Vou usar o 'multi_replace_file_content' para alterar a declaração E a lógica.
        // Ops, eu já estou numa tool call de 'replace_file_content'.
        // Vou cancelar essa tool call e usar 'multi_replace_file_content'.
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
        // SALES METRICS
        const totalWons = Object.values(monthData.wons).reduce((s, v) => s + v, 0);
        const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;
        // Calculate sales metrics
        const salesMetrics = {
            closersRequired: Math.ceil(totalWons / inputs.salesConfig.closerProductivity),
            sdrsRequired: Math.ceil(totalMQLs / inputs.salesConfig.sdrProductivity), // Use totalMQLs computed above
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
        };
        // Remunerações
        salesMetrics.remuneracaoCloser = salesMetrics.closersRequired * inputs.salesConfig.closerSalary;
        salesMetrics.remuneracaoSDR = salesMetrics.sdrsRequired * inputs.salesConfig.sdrSalary;
        salesMetrics.remuneracaoFarmer = salesMetrics.farmersRequired * inputs.salesConfig.farmerSalary;
        // Comissões (using totalNewRevenue for activation)
        salesMetrics.comissaoVendasActivation = monthData.totalNewRevenue * inputs.salesConfig.comissaoActivationRate;
        const receitaExpansionTotal = monthData.totalExpansionRevenue + monthData.totalLegacyExpansionRevenue;
        salesMetrics.comissaoFarmerExpansion = receitaExpansionTotal * inputs.salesConfig.comissaoExpansionRate;
        // Comissão Operação (Monetização Ops)
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
                salesMetrics.bonusCampanhasExpansion +
                salesMetrics.despesasVisitasExpansion;
        salesMetrics.totalDespesasMarketingVendas =
            salesMetrics.despesaComercialActivation +
                salesMetrics.despesaComercialExpansion +
                salesMetrics.folhaGestaoComercial;
        monthData.salesMetrics = salesMetrics;
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
    return months;
}
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}
function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}
function formatPercentage(value) {
    return `${(value * 100).toFixed(1)}%`;
}
