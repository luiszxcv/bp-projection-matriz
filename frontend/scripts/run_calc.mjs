const { defaultInputs } = await import("../src/data/defaultInputs.ts");
const calc = await import("../src/lib/calculations.ts");
const months = calc.calculateMonthlyData(defaultInputs);
console.log(
  "Month 1 totalHoursExecutar:",
  months[0].capacityPlan.totalHoursExecutar
);
console.log("Month 1 HC Executar:", months[0].capacityPlan.hcExecutar);
console.log("Month 1 Squads Executar:", months[0].capacityPlan.squadsExecutar);
console.log("Month 1 totalHC:", months[0].capacityPlan.totalHC);
console.log("Month 1 squadsSaber:", months[0].capacityPlan.squadsSaber);
