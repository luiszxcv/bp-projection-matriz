const fs = require("fs");
const path = require("path");

const csvPath = path.resolve(__dirname, "../2026-01_export.csv");
const txt = fs.readFileSync(csvPath, "utf8");
const lines = txt.split(/\r?\n/);

// Find all lines with '$ Revenue Expansion', then check if the 'Medium' section
// header appears within the previous 30 lines.
function findMediumRevenueExpansion() {
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("$ Revenue Expansion")) candidates.push(i);
  }
  for (const idx of candidates) {
    // look backwards up to 30 lines for 'Medium' occurrence
    const from = Math.max(0, idx - 30);
    let foundMedium = false;
    for (let k = idx; k >= from; k--) {
      if (lines[k].includes("Medium")) {
        foundMedium = true;
        break;
      }
    }
    if (foundMedium) {
      const nums = (lines[idx].match(/-?\\d+(?:\\.\\d+)?/g) || []).map((n) =>
        Number(n)
      );
      return nums;
    }
  }
  return null;
}

const nums = findMediumRevenueExpansion();
if (!nums) {
  console.error("Could not find Medium $ Revenue Expansion row in CSV.");
  process.exit(2);
}

// Jan, Feb, Mar are the first three numeric columns on that row
const jan = nums[0] ?? 0;
const feb = nums[1] ?? 0;
const mar = nums[2] ?? 0;
console.log("Medium $ Revenue Expansion — Jan:", jan);
console.log("Medium $ Revenue Expansion — Feb:", feb);
console.log("Medium $ Revenue Expansion — Mar:", mar);
