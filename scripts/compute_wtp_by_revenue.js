const path = require('path');
const calc = require(path.join(__dirname, '..', 'frontend', 'temp_test', 'calculations.js'));
const inputsMod = require(path.join(__dirname, '..', 'frontend', 'temp_test', 'defaultInputs.cjs'));
const inputs = inputsMod.defaultInputs;
const months = calc.calculateMonthlyData(inputs);

const TIERS = ['enterprise','large','medium','small','tiny'];
let total=0;
for (let i=0;i<months.length;i++){
  const m = months[i];
  for (const tier of TIERS){
    const revenueAtGoLive = Object.values(m.revenueByTierProduct[tier]||{}).reduce((s,v)=>s+v,0);
    if (revenueAtGoLive<=0) continue;
    // create cohort
    for (let future= i+1; future<months.length; future++){
      const age = future - i; // age 1 for next month
      const desiredArr = (inputs.wtpConfig && inputs.wtpConfig[tier] && inputs.wtpConfig[tier].shareOfWalletDesired) || Array(12).fill(0);
      const desired = desiredArr[age] || 0;
      total += revenueAtGoLive * desired;
    }
  }
}
console.log('total_by_revenue_base=', total);
