const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  try {
    const repoRoot = path.resolve(__dirname);
    const calcPath = path.join(
      repoRoot,
      "frontend",
      "temp_test",
      "calculations.js"
    );
    const inputsPath = path.join(
      repoRoot,
      "frontend",
      "temp_test",
      "defaultInputs.cjs"
    );

    // Dynamic import supports ESM and CJS transpiled files
    const calculationsMod = await import(pathToFileURL(calcPath).href);
    const inputsMod = await import(pathToFileURL(inputsPath).href);

    const calculations = calculationsMod.calculateMonthlyData
      ? calculationsMod
      : calculationsMod.default || calculationsMod;
    const defaultInputs = inputsMod.default || inputsMod;

    const months = calculations.calculateMonthlyData(
      defaultInputs.defaultInputs
    );

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
})();
