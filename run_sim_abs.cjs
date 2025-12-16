const path = require("path");

try {
  const repoRoot = path.resolve(__dirname);
  const calcPath = path.join(
    repoRoot,
    "frontend",
    "temp_dist",
    "src",
    "lib",
    "calculations.cjs"
  );
  const inputsPath = path.join(
    repoRoot,
    "frontend",
    "temp_dist",
    "src",
    "data",
    "defaultInputs.cjs"
  );

  const calculations = require(calcPath);
  const defaultInputs = require(inputsPath);

  const months = calculations.calculateMonthlyData(defaultInputs.defaultInputs);

  const summary = months.map((m) => ({
    month: defaultInputs.MONTHS[m.month - 1],
    totalNewRevenue: m.totalNewRevenue,
    totalExpansionRevenue: m.totalExpansionRevenue,
    totalWTPExpansionRevenue: m.totalWTPExpansionRevenue,
    wtpData: m.wtpData,
  }));

  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  console.error("Runner error:", err && err.stack ? err.stack : err);
  process.exit(1);
}
