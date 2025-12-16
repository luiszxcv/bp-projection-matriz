import { defaultInputs } from '../src/data/defaultInputs';
import { calculateMonthlyData } from '../src/lib/calculations';

function sumTier(dist: Record<string, number>) {
  return Object.values(dist).reduce((s, v) => s + (v || 0), 0);
}

(async () => {
  try {
    const months = calculateMonthlyData(defaultInputs as any);
    const m0 = months[0];

    const leads = m0.totalLeads;
    const totalMQLs = sumTier(m0.mqls);
    const totalSQLs = sumTier(m0.sqls);
    const inboundSALs = sumTier(m0.salsInbound || {enterprise:0,large:0,medium:0,small:0,tiny:0});
    const outboundSALs = sumTier(m0.salsOutbound || {enterprise:0,large:0,medium:0,small:0,tiny:0});
    const totalSALs = sumTier(m0.sals);
    const wons = sumTier(m0.wons);
    const activations = sumTier(m0.activations);

    const products = ['saber','ter','executarNoLoyalty','executarLoyalty','potencializar'];
    const revenueByProduct: Record<string, number> = {} as any;
    for (const p of products) revenueByProduct[p] = 0;

    for (const tier of Object.keys(m0.revenueByTierProduct)) {
      const prod = (m0.revenueByTierProduct as any)[tier];
      for (const p of products) {
        revenueByProduct[p] += prod[p] ?? 0;
      }
    }

    console.log('=== Topline Validation - Janeiro ===');
    console.log('$ Media Budget:', defaultInputs.topline.investmentMonthly[0]);
    console.log('$ CPL:', defaultInputs.topline.cplMonthly[0]);
    console.log('# Leads:', leads);
    console.log('# Total MQLs:', totalMQLs);
    console.log('# Total SQLs:', totalSQLs);
    console.log('# Total SALs (inbound+outbound):', totalSALs);
    console.log('  - Inbound SALs:', inboundSALs);
    console.log('  - Outbound SALs:', outboundSALs);
    console.log('# WONs:', wons);
    console.log('# Ativações:', activations);

    console.log('\nPer-tier breakdown:');
    for (const tier of Object.keys(m0.mqls)) {
      const w = (m0.wons as any)[tier] || 0;
      const a = (m0.activations as any)[tier] || 0;
      const ar = (defaultInputs.tierMetrics as any)[tier].activationRate[0];
      const dist = (defaultInputs.tierMetrics as any)[tier].productDistribution;
      console.log(` ${tier}: wons=${w}, activationRate=${ar}, activations=${a}, prodDist=${JSON.stringify(dist)}`);
    }

    console.log('\n$ Receita Aquisição por produto (Revenue Won - TCV):');
    for (const k of Object.keys(revenueByProduct)) {
      console.log(`  ${k}:`, revenueByProduct[k]);
    }

    const totalRevenueWon = Object.values(revenueByProduct).reduce((s,n) => s + n, 0);
    console.log('\n$ Total Revenue Won (TCV):', totalRevenueWon);

    // Expected values from sheet (Jan)
    const expected = {
      leads: 13826,
      mqls: 11058,
      sqls: 3237,
      sals: 3476,
      wons: 1042,
      activations: 965,
      revenueWon: 21834800,
    };

    console.log('\n--- Comparison to expected (Jan) ---');
    for (const k of Object.keys(expected)) {
      let actual: number;
      if (k === 'leads') actual = leads;
      else if (k === 'revenueWon') actual = totalRevenueWon;
      else if (k === 'mqls') actual = totalMQLs;
      else if (k === 'sqls') actual = totalSQLs;
      else if (k === 'sals') actual = totalSALs;
      else if (k === 'wons') actual = wons;
      else if (k === 'activations') actual = activations;
      else actual = 0;
      console.log(k, 'expected=', (expected as any)[k], 'actual=', actual, 'diff=', actual - (expected as any)[k]);
    }

  } catch (e) {
    console.error('Error running validation:', e);
    process.exit(1);
  }
})();
import { defaultInputs } from '../src/data/defaultInputs';
import { calculateMonthlyData } from '../src/lib/calculations';

function sumTierValues(month: any, key: string) {
  const TIERS = ['enterprise','large','medium','small','tiny'] as const;
  return TIERS.reduce((s, t) => s + (month[key]?.[t] ?? 0), 0);
}

function sumRevenueByProduct(month: any) {
  const products = ['saber','ter','executarNoLoyalty','executarLoyalty','potencializar'];
  const totals: Record<string, number> = {};
  for (const p of products) {
    totals[p] = Object.values(month.revenueByTierProduct).reduce((s: number, tierRec: any) => s + (tierRec?.[p] ?? 0), 0);
  }
  return totals;
}

const months = calculateMonthlyData(defaultInputs as any);
const jan = months[0];

console.log('=== Topline Validation - Janeiro ===');
console.log('$ Media Budget:', defaultInputs.topline.investmentMonthly[0]);
import { defaultInputs } from '../src/data/defaultInputs';
import { calculateMonthlyData } from '../src/lib/calculations';

function sumTier(dist: Record<string, number>) {
  return Object.values(dist).reduce((s, v) => s + (v || 0), 0);
}

(async () => {
  try {
    const months = calculateMonthlyData(defaultInputs as any);
    const m0 = months[0];

    const leads = m0.totalLeads;
    const totalMQLs = sumTier(m0.mqls);
    const totalSQLs = sumTier(m0.sqls);
    const inboundSALs = sumTier(m0.salsInbound || {enterprise:0,large:0,medium:0,small:0,tiny:0});
    const outboundSALs = sumTier(m0.salsOutbound || {enterprise:0,large:0,medium:0,small:0,tiny:0});
    const totalSALs = sumTier(m0.sals);
    const wons = sumTier(m0.wons);
    const activations = sumTier(m0.activations);

    const products = ['saber','ter','executarNoLoyalty','executarLoyalty','potencializar'];
    const revenueByProduct: Record<string, number> = {} as any;
    for (const p of products) revenueByProduct[p] = 0;

    for (const tier of Object.keys(m0.revenueByTierProduct)) {
      const prod = (m0.revenueByTierProduct as any)[tier];
      for (const p of products) {
        revenueByProduct[p] += prod[p] ?? 0;
      }
    }

    console.log('=== Topline Validation - Janeiro ===');
    console.log('$ Media Budget:', defaultInputs.topline.investmentMonthly[0]);
    console.log('$ CPL:', defaultInputs.topline.cplMonthly[0]);
    console.log('# Leads:', leads);
    console.log('# Total MQLs:', totalMQLs);
    console.log('# Total SQLs:', totalSQLs);
    console.log('# Total SALs (inbound+outbound):', totalSALs);
    console.log('  - Inbound SALs:', inboundSALs);
    console.log('  - Outbound SALs:', outboundSALs);
    console.log('# WONs:', wons);
    console.log('# Ativações:', activations);

    console.log('\nPer-tier breakdown:');
    for (const tier of Object.keys(m0.mqls)) {
      const w = (m0.wons as any)[tier] || 0;
      const a = (m0.activations as any)[tier] || 0;
      const ar = (defaultInputs.tierMetrics as any)[tier].activationRate[0];
      const dist = (defaultInputs.tierMetrics as any)[tier].productDistribution;
      console.log(` ${tier}: wons=${w}, activationRate=${ar}, activations=${a}, prodDist=${JSON.stringify(dist)}`);
    }

    console.log('\n$ Receita Aquisição por produto (Revenue Won - TCV):');
    for (const k of Object.keys(revenueByProduct)) {
      console.log(`  ${k}:`, revenueByProduct[k]);
    }

    const totalRevenueWon = Object.values(revenueByProduct).reduce((s,n) => s + n, 0);
    console.log('\n$ Total Revenue Won (TCV):', totalRevenueWon);

    // Expected values from sheet (Jan)
    const expected = {
      leads: 13826,
      mqls: 11058,
      sqls: 3237,
      sals: 3476,
      wons: 1042,
      activations: 965,
      revenueWon: 21834800,
    };

    console.log('\n--- Comparison to expected (Jan) ---');
    for (const k of Object.keys(expected)) {
      let actual: number;
      if (k === 'leads') actual = leads;
      else if (k === 'revenueWon') actual = totalRevenueWon;
      else if (k === 'mqls') actual = totalMQLs;
      else if (k === 'sqls') actual = totalSQLs;
      else if (k === 'sals') actual = totalSALs;
      else if (k === 'wons') actual = wons;
      else if (k === 'activations') actual = activations;
      else actual = 0;
      console.log(k, 'expected=', (expected as any)[k], 'actual=', actual, 'diff=', actual - (expected as any)[k]);
    }

  } catch (e) {
    console.error('Error running validation:', e);
    process.exit(1);
  }
})();
    })();
