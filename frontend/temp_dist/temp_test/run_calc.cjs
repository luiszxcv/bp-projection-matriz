"use strict";
const calculations = require("../src/lib/calculations.cjs");
const defaultInputs = require("../src/data/defaultInputs.cjs");
(async function run() {
  try {
    const months = calculations.calculateMonthlyData(
      defaultInputs.defaultInputs
    );
    const summary = months.map((m) => ({
      month: defaultInputs.MONTHS[m.month - 1],
      revenueByTierProduct: m.revenueByTierProduct,
      totalNewRevenue: m.totalNewRevenue,
      totalExpansionRevenue: m.totalExpansionRevenue,
      wtpData: m.wtpData,
    }));
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error("Error running calculation:", err);
    process.exit(1);
  }
})();
