/**
 * scripts/verify_audit_squad.ts
 *
 * Touchline AI — Official FPL Ground-Truth Verification Test for Squad 1482998
 *
 * Requirements Verified:
 *   1. Squad Free Transfers Calculation = exactly 4 (not 5; preserves FT across GW5 Wildcard)
 *   2. Financial Totals:
 *      - sellingValue === 97.0 (£97.0m)
 *      - inTheBank === 3.5 (£3.5m)
 *      - liquidationBudget === 100.5 (£100.5m)
 *      - teamValue === 102.2 or 102.4 (£102.2m deadline value / £102.4m live market value)
 *   3. Individual Player Selling Prices:
 *      - Tavernier: sellingPrice === 6.3 (Market 6.6)
 *      - Haaland: sellingPrice === 15.6 (Market 15.8)
 *      - Rogers: sellingPrice === 7.9 (Market 8.1 or 8.2)
 *   4. Medical Alerts:
 *      - João Pedro: status === "injured", chanceOfPlaying === 0%
 *      - Thomas: status === "doubtful", chanceOfPlaying === 50%
 *      - LatestNews squad alerts count === 2
 *   5. Input Boundary Integrity:
 *      - Rejection of invalid Entry IDs with appropriate error handling
 *
 * Execution:
 *   npx tsx --env-file=.env.local scripts/verify_audit_squad.ts
 *
 * Exit Codes:
 *   0 = All ground-truth assertions passed
 *   1 = One or more verification checks failed
 */

import { fetchManagerSquad } from "@/services/fpl";
import type { Player } from "@/types/fpl";

const TARGET_SQUAD_ID = "1482998";

interface CheckResult {
  category: string;
  item: string;
  expected: string | number;
  actual: string | number;
  status: "PASS" | "FAIL";
}

function padRight(str: string, length: number): string {
  return str.length >= length ? str : str + " ".repeat(length - str.length);
}

function renderTable(results: CheckResult[]): void {
  const colCat = 18;
  const colItem = 26;
  const colExp = 16;
  const colAct = 16;
  const colStat = 8;

  const separatorLine = `+${"-".repeat(colCat + 2)}+${"-".repeat(colItem + 2)}+${"-".repeat(colExp + 2)}+${"-".repeat(colAct + 2)}+${"-".repeat(colStat + 2)}+`;

  console.log(separatorLine);
  console.log(
    `| ${padRight("Category", colCat)} | ${padRight("Check Item", colItem)} | ${padRight("Expected", colExp)} | ${padRight("Actual", colAct)} | ${padRight("Status", colStat)} |`
  );
  console.log(separatorLine);

  for (const r of results) {
    console.log(
      `| ${padRight(r.category, colCat)} | ${padRight(r.item, colItem)} | ${padRight(String(r.expected), colExp)} | ${padRight(String(r.actual), colAct)} | ${padRight(r.status, colStat)} |`
    );
  }
  console.log(separatorLine);
}

async function runVerification(): Promise<void> {
  console.log("================================================================================");
  console.log("        TOUCHLINE AI — OFFICIAL FPL GROUND-TRUTH AUDIT VERIFIER                 ");
  console.log(`        Target Squad ID: ${TARGET_SQUAD_ID}                                     `);
  console.log("================================================================================\n");

  const results: CheckResult[] = [];
  const failures: string[] = [];

  // ---------------------------------------------------------------------------
  // 0. INPUT INTEGRITY / BOUNDARY CHECK
  // ---------------------------------------------------------------------------
  let invalidIdRejected = false;
  try {
    await fetchManagerSquad("  invalid_abc  ");
  } catch (err: any) {
    if (err?.message?.includes("Invalid FPL Entry ID")) {
      invalidIdRejected = true;
    }
  }

  results.push({
    category: "Input Integrity",
    item: "Invalid ID Rejection",
    expected: "Error Thrown",
    actual: invalidIdRejected ? "Error Thrown" : "Accepted (Invalid)",
    status: invalidIdRejected ? "PASS" : "FAIL",
  });

  if (!invalidIdRejected) {
    failures.push("Input integrity check failed: fetchManagerSquad did not reject invalid entry ID");
  }

  // ---------------------------------------------------------------------------
  // FETCH TARGET SQUAD TELEMETRY
  // ---------------------------------------------------------------------------
  let squadData: any;
  try {
    console.log(`[INFRA] Fetching squad telemetry for Entry ID ${TARGET_SQUAD_ID}...`);
    squadData = await fetchManagerSquad(TARGET_SQUAD_ID);
  } catch (err: any) {
    console.error(`[FATAL] Failed to fetch manager squad ${TARGET_SQUAD_ID}:`, err);
    process.exit(1);
  }

  const { stats, players } = squadData;
  console.log(`[INFO] Manager: ${stats.managerName} | Team: "${stats.teamName}" | GW: ${stats.currentGameweek}`);
  console.log(`[INFO] Squad Players Loaded: ${players.length}\n`);

  // ---------------------------------------------------------------------------
  // 1. FREE TRANSFERS VERIFICATION
  // ---------------------------------------------------------------------------
  const actualFt = stats.freeTransfers ?? stats.ftAvailable ?? stats.ft_available ?? squadData.ftAvailable ?? squadData.ft_available;
  const expectedFt = 4;
  const ftPassed = actualFt === expectedFt;

  results.push({
    category: "Free Transfers",
    item: "Banked FT (GW10)",
    expected: expectedFt,
    actual: actualFt !== undefined ? actualFt : "undefined",
    status: ftPassed ? "PASS" : "FAIL",
  });

  if (!ftPassed) {
    failures.push(`Free Transfers calculation failed: expected ${expectedFt}, got ${actualFt}`);
  }

  // ---------------------------------------------------------------------------
  // 2. FINANCIAL TOTALS VERIFICATION
  // ---------------------------------------------------------------------------
  const rawSellingValue = stats.sellingValue ?? squadData.sellingValue;
  const rawBank = stats.inTheBank;
  const rawLiquidationBudget = stats.liquidationBudget ?? squadData.liquidationBudget;
  const rawTeamValue = stats.teamValue;

  const sellingValue = rawSellingValue !== undefined ? Number(rawSellingValue.toFixed(1)) : undefined;
  const inTheBank = rawBank !== undefined ? Number(rawBank.toFixed(1)) : undefined;
  const liquidationBudget = rawLiquidationBudget !== undefined ? Number(rawLiquidationBudget.toFixed(1)) : undefined;
  const teamValue = rawTeamValue !== undefined ? Number(rawTeamValue.toFixed(1)) : undefined;

  const financialChecks: Array<{
    item: string;
    expected: number | number[];
    actual: number | undefined;
    key: string;
  }> = [
    { item: "sellingValue (£m)", expected: 97.0, actual: sellingValue, key: "sellingValue" },
    { item: "inTheBank (£m)", expected: 3.5, actual: inTheBank, key: "inTheBank" },
    { item: "liquidationBudget (£m)", expected: 100.5, actual: liquidationBudget, key: "liquidationBudget" },
    { item: "teamValue (£m)", expected: [102.2, 102.4], actual: teamValue, key: "teamValue" },
  ];

  for (const fc of financialChecks) {
    const passed =
      fc.actual !== undefined &&
      (Array.isArray(fc.expected) ? fc.expected.includes(fc.actual) : fc.actual === fc.expected);
    const expectedStr = Array.isArray(fc.expected)
      ? fc.expected.map((v) => `£${v.toFixed(1)}m`).join("/")
      : `£${fc.expected.toFixed(1)}m`;

    results.push({
      category: "Financials",
      item: fc.item,
      expected: expectedStr,
      actual: fc.actual !== undefined ? `£${fc.actual.toFixed(1)}m` : "undefined",
      status: passed ? "PASS" : "FAIL",
    });
    if (!passed) {
      const expMsg = Array.isArray(fc.expected) ? fc.expected.join(" or ") : String(fc.expected);
      failures.push(`Financial metric ${fc.key} failed: expected ${expMsg}, got ${fc.actual}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. INDIVIDUAL PLAYER SELLING PRICES VERIFICATION
  // ---------------------------------------------------------------------------
  const targetPlayers: Array<{
    name: string;
    idMatch: string;
    expectedSell: number;
    expectedMarket: number | number[];
  }> = [
    { name: "Tavernier", idMatch: "68", expectedSell: 6.3, expectedMarket: 6.6 },
    { name: "Haaland", idMatch: "355", expectedSell: 15.6, expectedMarket: 15.8 },
    { name: "Rogers", idMatch: "40", expectedSell: 7.9, expectedMarket: [8.1, 8.2] },
  ];

  for (const tp of targetPlayers) {
    const player = players.find(
      (p: Player) =>
        p.webName === tp.name ||
        p.id === tp.idMatch ||
        p.name === tp.name ||
        p.fullName?.includes(tp.name)
    );

    if (!player) {
      results.push({
        category: "Player Pricing",
        item: `${tp.name} Found`,
        expected: "Present",
        actual: "Not Found",
        status: "FAIL",
      });
      failures.push(`Player ${tp.name} not found in squad picks`);
      continue;
    }

    const actualSell = player.sellingPrice !== undefined ? Number(player.sellingPrice.toFixed(1)) : undefined;
    const actualMarket = player.price !== undefined ? Number(player.price.toFixed(1)) : undefined;

    const sellPassed = actualSell === tp.expectedSell;
    const marketPassed =
      actualMarket !== undefined &&
      (Array.isArray(tp.expectedMarket)
        ? tp.expectedMarket.includes(actualMarket)
        : actualMarket === tp.expectedMarket);

    const expectedMarketStr = Array.isArray(tp.expectedMarket)
      ? tp.expectedMarket.map((v) => `£${v.toFixed(1)}m`).join("/")
      : `£${tp.expectedMarket.toFixed(1)}m`;

    results.push({
      category: "Player Pricing",
      item: `${tp.name} Selling Price`,
      expected: `£${tp.expectedSell.toFixed(1)}m`,
      actual: actualSell !== undefined ? `£${actualSell.toFixed(1)}m` : "undefined",
      status: sellPassed ? "PASS" : "FAIL",
    });

    results.push({
      category: "Player Pricing",
      item: `${tp.name} Market Price`,
      expected: expectedMarketStr,
      actual: actualMarket !== undefined ? `£${actualMarket.toFixed(1)}m` : "undefined",
      status: marketPassed ? "PASS" : "FAIL",
    });

    if (!sellPassed) {
      failures.push(`${tp.name} selling price failed: expected ${tp.expectedSell}, got ${actualSell}`);
    }
    if (!marketPassed) {
      const expMsg = Array.isArray(tp.expectedMarket) ? tp.expectedMarket.join(" or ") : String(tp.expectedMarket);
      failures.push(`${tp.name} market price failed: expected ${expMsg}, got ${actualMarket}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. MEDICAL ALERTS VERIFICATION
  // ---------------------------------------------------------------------------
  const joaoPedro = players.find(
    (p: Player) =>
      p.webName === "João Pedro" ||
      p.webName?.includes("Pedro") ||
      p.id === "169" ||
      p.name?.includes("Pedro")
  );

  const thomas = players.find(
    (p: Player) =>
      p.webName === "Thomas" ||
      p.id === "206" ||
      p.name === "Thomas"
  );

  // João Pedro: injured, 0%
  const jpStatusPassed = joaoPedro?.status === "injured";
  const jpChancePassed = joaoPedro?.chanceOfPlaying === 0;

  results.push({
    category: "Medical Status",
    item: "João Pedro Status",
    expected: "injured",
    actual: joaoPedro?.status ?? "undefined",
    status: jpStatusPassed ? "PASS" : "FAIL",
  });

  results.push({
    category: "Medical Status",
    item: "João Pedro Chance",
    expected: "0%",
    actual:
      joaoPedro?.chanceOfPlaying !== undefined && joaoPedro?.chanceOfPlaying !== null
        ? `${joaoPedro.chanceOfPlaying}%`
        : "null/undefined",
    status: jpChancePassed ? "PASS" : "FAIL",
  });

  if (!jpStatusPassed || !jpChancePassed) {
    failures.push(
      `João Pedro medical mismatch: status=${joaoPedro?.status} (expected 'injured'), chance=${joaoPedro?.chanceOfPlaying} (expected 0)`
    );
  }

  // Thomas: doubtful, 50%
  const thStatusPassed = thomas?.status === "doubtful";
  const thChancePassed = thomas?.chanceOfPlaying === 50;

  results.push({
    category: "Medical Status",
    item: "Thomas Status",
    expected: "doubtful",
    actual: thomas?.status ?? "undefined",
    status: thStatusPassed ? "PASS" : "FAIL",
  });

  results.push({
    category: "Medical Status",
    item: "Thomas Chance",
    expected: "50%",
    actual:
      thomas?.chanceOfPlaying !== undefined && thomas?.chanceOfPlaying !== null
        ? `${thomas.chanceOfPlaying}%`
        : "null/undefined",
    status: thChancePassed ? "PASS" : "FAIL",
  });

  if (!thStatusPassed || !thChancePassed) {
    failures.push(
      `Thomas medical mismatch: status=${thomas?.status} (expected 'doubtful'), chance=${thomas?.chanceOfPlaying} (expected 50)`
    );
  }

  // LatestNews squad alerts count
  const squadAlerts = players.filter(
    (p: Player) => p.status && p.status !== "available" && Boolean(p.news)
  );

  const alertsCountPassed = squadAlerts.length === 2;
  results.push({
    category: "Medical Status",
    item: "LatestNews Squad Alerts",
    expected: 2,
    actual: squadAlerts.length,
    status: alertsCountPassed ? "PASS" : "FAIL",
  });

  if (!alertsCountPassed) {
    failures.push(`Squad alerts count mismatch: expected 2 alerts, got ${squadAlerts.length}`);
  }

  // ---------------------------------------------------------------------------
  // TABULAR DIAGNOSTIC OUTPUT
  // ---------------------------------------------------------------------------
  console.log("[DIAGNOSTIC REPORT]");
  renderTable(results);
  console.log("");

  // ---------------------------------------------------------------------------
  // PASS / FAIL VERDICT
  // ---------------------------------------------------------------------------
  console.log("================================================================================");
  if (failures.length === 0) {
    console.log(" [SUCCESS] ALL GROUND-TRUTH VERIFICATION CHECKS PASSED!");
    console.log(`           Squad ${TARGET_SQUAD_ID} is 100% compliant with Official FPL 2024/25.`);
    console.log("================================================================================\n");
    process.exit(0);
  } else {
    console.log(` [FAILURE] ${failures.length} GROUND-TRUTH ASSERTION(S) FAILED:`);
    for (let i = 0; i < failures.length; i++) {
      console.log(`   ${i + 1}. ${failures[i]}`);
    }
    console.log("================================================================================\n");
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("[FATAL] Unhandled verification error:", err);
  process.exit(1);
});
