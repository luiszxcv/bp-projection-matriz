const path = require('path');
const calc = require(path.join(__dirname, '..', 'frontend', 'temp_test', 'calculations.js'));
const inputsMod = require(path.join(__dirname, '..', 'frontend', 'temp_test', 'defaultInputs.cjs'));
const inputs = inputsMod.defaultInputs;
const months = calc.calculateMonthlyData(inputs);

let expected = 0;
const TIERS = ['enterprise','large','medium','small','tiny'];
for (let i=0;i<months.length;i++){
  const m = months[i];
  for (const t of TIERS){
    const goLives = m.activations[t] || 0;
    const annualWTP = (inputs.wtpConfig && inputs.wtpConfig[t] && inputs.wtpConfig[t].annualWTP) || 0;
    const desiredArr = (inputs.wtpConfig && inputs.wtpConfig[t] && inputs.wtpConfig[t].shareOfWalletDesired) || Array(12).fill(0);
    // sum desired excluding index 0 (age 0)
    const sumDesired = desiredArr.reduce((s,v)=>s+v,0);
    expected += goLives * annualWTP * sumDesired;
  }
}
console.log('expected_total_by_sumDesired=', expected);

// Also compute totalSOW sum
let totalSow=0;
for (let i=0;i<months.length;i++){
  const m=months[i];
  for (const t of TIERS){
    const goLives = m.activations[t]||0;
    const annualWTP = (inputs.wtpConfig && inputs.wtpConfig[t] && inputs.wtpConfig[t].annualWTP) || 0;
    totalSow += goLives*annualWTP;
  }
}
console.log('totalSow=', totalSow);
