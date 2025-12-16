"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calculations_1 = require("../src/lib/calculations");
const defaultInputs_1 = require("../src/data/defaultInputs");
async function run() {
    try {
        const months = (0, calculations_1.calculateMonthlyData)(defaultInputs_1.defaultInputs);
        // Prepare summary: for each month, show revenueByTierProduct and wtpData
        const summary = months.map(m => ({
            month: defaultInputs_1.MONTHS[m.month - 1],
            revenueByTierProduct: m.revenueByTierProduct,
            totalNewRevenue: m.totalNewRevenue,
            totalExpansionRevenue: m.totalExpansionRevenue,
            wtpData: m.wtpData,
        }));
        console.log(JSON.stringify(summary, null, 2));
    }
    catch (err) {
        console.error('Error running calculation:', err);
        process.exit(1);
    }
}
run();
