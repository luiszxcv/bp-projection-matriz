const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const csvPath = path.join(repoRoot, "2026-01_export.csv");

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

const MONTH_NAMES = inputs.defaultInputs.MONTHS || [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseCsvMonthsIndexes(lines) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes(",Month,") || l.includes(",Month,,")) {
      const parts = l.split(",");
      const idxs = [];
      for (let j = 0; j < parts.length; j++) {
        const v = parts[j].trim();
        if (v && !isNaN(Number(v))) {
          idxs.push(j);
        }
      }
      // try to find contiguous 12 months (1..12)
      if (idxs.length >= 12) return idxs.slice(0, 12);
    }
  }
  return null;
}

function parseCsvRowNumbers(parts, monthIdxs) {
  const out = [];
  for (let k = 0; k < 12; k++) {
    const idx = monthIdxs[k];
    const raw = parts[idx] || "";
    const v = Number(raw.replace(/[^0-9eE+\-.]/g, "")) || 0;
    out.push(v);
  }
  return out;
}

function loadVm8Rows() {
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const monthIdxs = parseCsvMonthsIndexes(lines);
  if (!monthIdxs) throw new Error("Could not locate month columns in CSV");
  // We'll walk the CSV keeping track of the current tier section (Enterprise, Large, Medium, Small, Tiny)
  const tierNames = ["Enterprise", "Large", "Medium", "Small", "Tiny"];
  const mappingProd = {
    saber: [
      "[Saber]",
      "Cross-sell [Saber]",
      "Revenue Cross-sell [Saber]",
      "Revenue Cross-sell [Saber]",
    ],
    ter: [
      "[Ter]",
      "Cross-sell [Ter]",
      "Revenue Cross-sell [Ter]",
      "Revenue Cross-sell [Ter]",
    ],
    executarNoLoyalty: [
      "Executar-no loyalty",
      "Revenue Upsell [Executar-no loyalty]",
      "[Executar-no loyalty]",
    ],
    executarLoyalty: [
      "Executar-loyalty",
      "Revenue Upsell [Executar-loyalty]",
      "[Executar-loyalty]",
    ],
    potencializar: [
      "Potencializar",
      "Revenue Upsell [Potencializar]",
      "[Potencializar]",
    ],
  };

  // initialize structure: results[tier][product] = Array(12)
  const results = {};
  for (const t of tierNames) {
    results[t.toLowerCase()] = {};
    for (const p of Object.keys(mappingProd))
      results[t.toLowerCase()][p] = Array(12).fill(0);
  }

  let currentTier = null;
  for (const line of lines) {
    const parts = line.split(",");
    // detect tier headings like ',,,Enterprise' (third column)
    const third = (parts[3] || "").trim();
    if (tierNames.includes(third)) currentTier = third.toLowerCase();

    if (!line.includes(",VM8,")) continue;
    const label = (parts[3] || "").trim();

    // try to determine product token from label
    for (const prod of Object.keys(mappingProd)) {
      for (const token of mappingProd[prod]) {
        if (label.includes(token)) {
          // if no explicit currentTier, try to fallback to global aggregate row (use key 'all')
          const targetTier = currentTier || "all";
          const vals = parseCsvRowNumbers(parts, monthIdxs);
          if (targetTier === "all") {
            // create 'all' bucket if needed
            results["all"] = results["all"] || {};
            results["all"][prod] = vals;
          } else {
            results[targetTier][prod] = vals;
          }
        }
      }
    }
  }

  return results;
}

function runEngine() {
  const months = calc.calculateMonthlyData(inputs.defaultInputs);
  const monthsWithWTP = wtp.applyWTP(months, inputs.defaultInputs);
  // produce per-tier, per-product totals
  const tierNames = ["enterprise", "large", "medium", "small", "tiny"];
  const PRODUCTS = [
    "saber",
    "ter",
    "executarNoLoyalty",
    "executarLoyalty",
    "potencializar",
  ];
  const out = {};
  for (const t of tierNames) {
    out[t] = {};
    for (const p of PRODUCTS) out[t][p] = Array(12).fill(0);
  }

  for (const m of monthsWithWTP) {
    const mi = m.month - 1;
    for (const tier of Object.keys(m.wtpData || {})) {
      const eb =
        (m.wtpData && m.wtpData[tier] && m.wtpData[tier].expansionByProduct) ||
        {};
      for (const p of PRODUCTS) {
        out[tier] = out[tier] || {};
        out[tier][p] = out[tier][p] || Array(12).fill(0);
        out[tier][p][mi] += eb[p] || 0;
      }
    }
  }
  return out;
}

function compare() {
  const csv = loadVm8Rows();
  const engine = runEngine();
  const months = MONTH_NAMES.slice(0, 12);

  const tierNames = Object.keys(engine);
  const PRODUCTS = [
    "saber",
    "ter",
    "executarNoLoyalty",
    "executarLoyalty",
    "potencializar",
  ];

  const report = { tiers: {}, totalAbsDiff: 0 };
  for (const tier of tierNames) {
    report.tiers[tier] = { products: {} };
    for (const p of PRODUCTS) {
      const earr = (engine[tier] && engine[tier][p]) || Array(12).fill(0);
      // csv might have per-tier bucket or an 'all' aggregate
      const carr =
        (csv[tier] && csv[tier][p]) ||
        (csv["all"] && csv["all"][p]) ||
        Array(12).fill(0);
      const diffs = [];
      let sumAbs = 0,
        sumCsv = 0,
        sumEng = 0;
      for (let i = 0; i < 12; i++) {
        const d = earr[i] - (carr[i] || 0);
        diffs.push(d);
        sumAbs += Math.abs(d);
        sumCsv += carr[i] || 0;
        sumEng += earr[i];
      }
      report.tiers[tier].products[p] = {
        engine: earr,
        csv: carr,
        diff: diffs,
        sumCsv,
        sumEng,
        sumAbs,
      };
      report.totalAbsDiff += sumAbs;
    }
  }

  // write JSON and CSV summary
  const outJson = path.join(
    repoRoot,
    "scripts",
    "vm8_engine_diff_by_tier.json"
  );
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");

  // simple CSV lines: tier,product,month,engine,csv,diff
  const outCsv = path.join(repoRoot, "scripts", "vm8_engine_diff_by_tier.csv");
  const header =
    ["tier", "product", "month", "engine", "csv", "diff"].join(",") + "\n";
  const sb = [header];
  for (const tier of Object.keys(report.tiers)) {
    for (const p of Object.keys(report.tiers[tier].products)) {
      const rec = report.tiers[tier].products[p];
      for (let i = 0; i < 12; i++) {
        sb.push(
          [
            tier,
            p,
            months[i],
            rec.engine[i] || 0,
            rec.csv[i] || 0,
            rec.diff[i] || 0,
          ].join(",") + "\n"
        );
      }
    }
  }
  fs.writeFileSync(outCsv, sb.join(""), "utf8");

  console.log(
    "Wrote",
    outJson,
    "and",
    outCsv,
    "totalAbsDiff=",
    report.totalAbsDiff
  );
}

try {
  compare();
} catch (e) {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
