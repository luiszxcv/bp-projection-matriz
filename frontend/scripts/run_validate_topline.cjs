const { spawnSync } = require("child_process");

console.log("Running TypeScript validator via npx tsx...");
const res = spawnSync(
  "npx",
  ["-y", "tsx", "scripts/validate_topline_clean.ts"],
  {
    stdio: "inherit",
    shell: true,
  }
);
if (res.error) {
  console.error("Failed to run validator:", res.error);
  process.exit(1);
}
process.exit(res.status || 0);
