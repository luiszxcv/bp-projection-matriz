const { spawnSync } = require("child_process");

console.log("Running TypeScript validator via ts-node-esm...");
const res = spawnSync("npx", ["ts-node-esm", "scripts/validate_topline.ts"], {
  stdio: "inherit",
  shell: true,
});
if (res.error) {
  console.error("Failed to run validator:", res.error);
  process.exit(1);
}
process.exit(res.status || 0);
