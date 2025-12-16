const path = require("path");

try {
  const repoRoot = path.resolve(__dirname);
  const calc = require(path.join(
    repoRoot,
    "frontend",
    "temp_test",
    "calculations.js"
  ));
  const inputs = require(path.join(
    repoRoot,
    "frontend",
    "temp_test",
    "defaultInputs.cjs"
  ));
  const wtp = require(path.join(
    repoRoot,
    "frontend",
    "temp_test",
    "apply_wtp.cjs"
  ));

  const months = calc.calculateMonthlyData(inputs.defaultInputs);
  const monthsWithWTP = wtp.applyWTP(months, inputs.defaultInputs);

  const tiers = Object.keys(inputs.defaultInputs.tierMetrics || {});
  const summary = monthsWithWTP.map((m) => {
    return {
      month: inputs.MONTHS[m.month - 1],
      totalNewRevenue: m.totalNewRevenue,
      totalExpansionRevenue: m.totalExpansionRevenue,
      totalWTPExpansionRevenue: m.totalWTPExpansionRevenue,
      wtpByTier: tiers.map((t) => ({
        tier: t,
        revenueExpansion:
          (m.wtpData && m.wtpData[t] && m.wtpData[t].revenueExpansion) || 0,
      })),
    };
  });

  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  console.error("Runner error:", err && err.stack ? err.stack : err);
  process.exit(1);
}
