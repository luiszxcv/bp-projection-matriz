const fs = require("fs");
const path = require("path");
const csvPath = path.resolve(__dirname, "../2026-01_export.csv");
const txt = fs.readFileSync(csvPath, "utf8");
const lines = txt.split(/\r?\n/);

// Find the line that starts with ",,VM8,$ Expansion Revenue Won" or contains "$ Expansion Revenue Won"
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("$ Expansion Revenue Won")) {
    idx = i;
    break;
  }
}
if (idx === -1) {
  console.error("VM8 Expansion line not found");
  process.exit(2);
}
const nums = (lines[idx].match(/-?\d+(?:\.\d+)?/g) || []).map((n) => Number(n));
// The CSV has some leading non-month numbers; find the first 12-month sequence by taking last 12 numbers
let months = nums.slice(-12);
if (months.length < 12) {
  console.log("Found fewer than 12 month numbers, printing all found:", nums);
} else {
  console.log("VM8 $ Expansion Revenue Won — Jan..Dez:");
  const labels = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  for (let i = 0; i < months.length; i++) {
    console.log(labels[i].padEnd(4), "\tR$", months[i].toLocaleString("pt-BR"));
  }
}
