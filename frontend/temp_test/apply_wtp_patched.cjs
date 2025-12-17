// apply_wtp_patched.cjs
// Patched WTP application aligning with `wtp meses.md`:
// - totalSOW = goLives * annualWTP
// - index mapping: index 0 = idade 0 (go-live); idade 1 uses shareOfWalletDesired[1]
// - targetRaw uses totalSOW * desired
// - numExpansions uses Math.ceil per spec

const TIERS = ["enterprise", "large", "medium", "small", "tiny"];
const PRODUCTS = [
  "saber",
  "ter",
  "executarNoLoyalty",
  "executarLoyalty",
  "potencializar",
];

const TIER_MULTIPLIERS = {
  enterprise: 1.0,
  large: 2.0,
  medium: 1.0,
  small: 0.5,
  tiny: 0.5,
};

function applyWTP(months, inputs) {
  for (const m of months) {
    m.wtpData = m.wtpData || {};
    for (const t of TIERS) {
      m.wtpData[t] = m.wtpData[t] || {
        goLiveClients: 0,
        revenueAtGoLive: 0,
        totalShareOfWallet: 0,
        expansionGoal: 0,
        numExpansions: 0,
        revenueExpansion: 0,
        expansionByProduct: {
          saber: 0,
          ter: 0,
          executarNoLoyalty: 0,
          executarLoyalty: 0,
          potencializar: 0,
        },
        shareOfWalletActived: 0,
      };
    }
    m.totalWTPExpansionRevenue = 0;
  }

  const wtpCohorts = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: [],
  };

  for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
    const month = months[monthIndex];
    const monthNum = month.month; // 1-based

    // create cohorts from this month's activations/revenue
    for (const tier of TIERS) {
      const revenueAtGoLive = Object.values(month.revenueByTierProduct[tier] || {}).reduce((s, v) => s + (v || 0), 0);
      const goLives = month.activations[tier] || 0;
      const annualWTP = (inputs.wtpConfig && inputs.wtpConfig[tier] && inputs.wtpConfig[tier].annualWTP) || 0;
      const totalSOW = goLives * annualWTP;

      if (goLives > 0) {
        wtpCohorts[tier].push({
          monthOfBirth: monthNum,
          revenueAtGoLive,
          totalShareOfWallet: totalSOW,
          shareOfWalletActived: 0,
        });
        month.wtpData[tier].goLiveClients += goLives;
        month.wtpData[tier].revenueAtGoLive += revenueAtGoLive;
        month.wtpData[tier].totalShareOfWallet += totalSOW;
      }
    }

    for (const tier of TIERS) {
      const metrics = inputs.tierMetrics[tier];
      const expDist =
        tier === "enterprise" || tier === "large"
          ? inputs.expansionDistribution.largeEnterprise
          : tier === "medium"
          ? inputs.expansionDistribution.medium
          : inputs.expansionDistribution.smallTiny;
      const tierDesiredArray =
        (inputs.wtpConfig && inputs.wtpConfig[tier] && inputs.wtpConfig[tier].shareOfWalletDesired) ||
        Array(12).fill(0);
      const tierMultiplier = TIER_MULTIPLIERS[tier] || 1;

      for (const cohort of wtpCohorts[tier]) {
        // skip cohorts born this month (idade 0)
        if (cohort.monthOfBirth === monthNum) continue;

        // age in months: 1 = next month after birth
        const age = monthNum - cohort.monthOfBirth;
        const desiredPercent = (tierDesiredArray[age] !== undefined) ? tierDesiredArray[age] : 0;

        if (!desiredPercent || desiredPercent <= 0) continue;

        // target based on totalSOW (per spec)
        const targetRaw = cohort.totalShareOfWallet * desiredPercent * tierMultiplier;
        const remaining = Math.max(0, cohort.totalShareOfWallet - cohort.shareOfWalletActived);
        const target = Math.min(targetRaw, remaining);
        if (target <= 0) continue;

        // expected revenue per expansion unit
        let expectedRevenuePerExp = 0;
        const unitRevenueByProduct = {};
        for (const product of PRODUCTS) {
          const ticket = (metrics.productTickets && metrics.productTickets[product] && metrics.productTickets[product][monthIndex]) || 0;
          let unitRev = 0;
          if (product === "executarNoLoyalty") unitRev = ticket * (inputs.conversionRates.noLoyaltyDuration || 1);
          else if (product === "executarLoyalty") unitRev = ticket * (typeof inputs.conversionRates.loyaltyDuration === "number" ? inputs.conversionRates.loyaltyDuration : (inputs.conversionRates.loyaltyDuration && inputs.conversionRates.loyaltyDuration[tier]) || 1);
          else unitRev = ticket;
          unitRevenueByProduct[product] = unitRev;
          const weight = expDist[product] || 0;
          expectedRevenuePerExp += weight * unitRev;
        }
        if (!expectedRevenuePerExp || expectedRevenuePerExp <= 0) continue;

        const numExpansions = Math.ceil(target / expectedRevenuePerExp);

        // allocate integer clients per product
        const clientsByProduct = { saber: 0, ter: 0, executarNoLoyalty: 0, executarLoyalty: 0, potencializar: 0 };
        let totalAssigned = 0;
        for (const product of PRODUCTS) {
          const c = Math.floor(numExpansions * (expDist[product] || 0));
          clientsByProduct[product] = c;
          totalAssigned += c;
        }
        let remainder = numExpansions - totalAssigned;
        if (remainder > 0) {
          const order = PRODUCTS.slice().sort((a, b) => (unitRevenueByProduct[a] || 0) - (unitRevenueByProduct[b] || 0));
          let oi = 0;
          while (remainder > 0) {
            const p = order[oi % order.length];
            if ((expDist[p] || 0) > 0) {
              clientsByProduct[p] += 1;
              remainder -= 1;
            }
            oi += 1;
          }
        }

        // compute revenue per product (ticket as TCV)
        let revenueSum = 0;
        for (const product of PRODUCTS) {
          const clients = clientsByProduct[product] || 0;
          const ticket = (metrics.productTickets && metrics.productTickets[product] && metrics.productTickets[product][monthIndex]) || 0;
          const revenueForProduct = clients * ticket;

          month.activeBaseExpansions[tier][product] = (month.activeBaseExpansions[tier][product] || 0) + clients;
          month.activeBaseExpansionRevenue[tier][product] = (month.activeBaseExpansionRevenue[tier][product] || 0) + revenueForProduct;
          month.expansions[tier][product] = (month.expansions[tier][product] || 0) + clients;
          month.expansionRevenue[tier][product] = (month.expansionRevenue[tier][product] || 0) + revenueForProduct;
          month.totalExpansionRevenue = (month.totalExpansionRevenue || 0) + revenueForProduct;
          month.wtpData[tier].expansionByProduct[product] = (month.wtpData[tier].expansionByProduct[product] || 0) + revenueForProduct;

          revenueSum += revenueForProduct;
        }

        month.wtpData[tier].expansionGoal = (month.wtpData[tier].expansionGoal || 0) + targetRaw;
        month.wtpData[tier].numExpansions = (month.wtpData[tier].numExpansions || 0) + numExpansions;
        month.wtpData[tier].revenueExpansion = (month.wtpData[tier].revenueExpansion || 0) + revenueSum;
        month.totalWTPExpansionRevenue = (month.totalWTPExpansionRevenue || 0) + revenueSum;

        cohort.shareOfWalletActived += revenueSum;
      }
    }
  }

  return months;
}

module.exports = { applyWTP };
