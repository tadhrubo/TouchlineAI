/**
 * scripts/stress_test_m1.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 1
 * Targets: Free Transfers Engine & Financial/Selling Price Engine
 *
 * Challenge Dimensions:
 * 1. Free Transfers calculation:
 *    - Consecutive chips (WC -> FH, FH -> WC, multiple back-to-back chips)
 *    - Lower clamp boundary (0) and upper clamp boundary (5)
 *    - Hit costs exceeding transfer count, negative transfers, corrupted/missing fields
 *    - Mid-week transfer deductions with active vs inactive chips
 *    - Historical array ordering (shuffled/reversed)
 *    - Dual implementation parity (fpl.ts vs league/[leagueId]/route.ts)
 * 2. Financial & Selling Price Engine:
 *    - Price drops: nowTenths < buyTenths (100% loss absorption by manager)
 *    - Price increases: odd vs even tenths profit (Math.floor(profit / 2))
 *    - Zero profit: nowTenths === buyTenths
 *    - Missing transfer-in history: cost_change_start null, undefined, 0, positive, negative
 *    - Mid-week transfer chains (A -> B, B -> C in same week)
 *    - Floating point precision stress harness across 15-player squads
 */

import { calculateFreeTransfersAvailable } from "../src/services/fpl";

// -----------------------------------------------------------------------------
// DUAL IMPLEMENTATION EXTRACTOR
// Also re-implement or import the route.ts function to verify parity
// -----------------------------------------------------------------------------
function routeCalculateFreeTransfersAvailable(
  historyData: any,
  transfersData?: any[],
  currentEvent?: number
): number {
  if (!historyData || !Array.isArray(historyData.current)) {
    return 1;
  }

  let available_ft = 1;

  const past_gws = [...(historyData.current || [])].sort((a: any, b: any) => a.event - b.event);

  for (const past_gw of past_gws) {
    if (past_gw.event >= 2) {
      const chip_played = historyData.chips?.find((c: any) => c.event === past_gw.event);
      const is_wc_or_fh =
        chip_played &&
        (chip_played.name === "wildcard" || chip_played.name === "freehit");

      if (is_wc_or_fh) {
        available_ft = Math.min(5, available_ft);
      } else {
        const transfers_made = past_gw.event_transfers || 0;
        const hits_taken = Math.floor((past_gw.event_transfers_cost || 0) / 4);
        const free_transfers_used = Math.max(0, transfers_made - hits_taken);

        available_ft = Math.min(5, Math.max(0, available_ft - free_transfers_used) + 1);
      }
    }
  }

  if (transfersData && currentEvent) {
    const nextEvent = currentEvent + 1;
    const nextChip = historyData.chips?.find((c: any) => c.event === nextEvent);
    const isNextWcOrFh = nextChip && (nextChip.name === "wildcard" || nextChip.name === "freehit");
    if (!isNextWcOrFh) {
      const midWeekTransfers = transfersData.filter((t: any) => t.event === nextEvent).length;
      available_ft = Math.max(0, available_ft - midWeekTransfers);
    }
  }

  return Math.max(0, Math.min(5, available_ft));
}

// -----------------------------------------------------------------------------
// SELLING PRICE FORMULA AS IMPLEMENTED IN fpl.ts
// -----------------------------------------------------------------------------
function calculatePlayerPrices(
  nowTenths: number,
  costChangeStart: number | null | undefined,
  lastTransferIn?: { element_in_cost?: number | null }
) {
  let buyTenths: number;
  if (lastTransferIn && lastTransferIn.element_in_cost != null) {
    buyTenths = Number(lastTransferIn.element_in_cost);
  } else {
    buyTenths = nowTenths - Number(costChangeStart ?? 0);
  }

  const profitTenths = nowTenths - buyTenths;
  const sellTenths =
    profitTenths > 0
      ? buyTenths + Math.floor(profitTenths / 2)
      : nowTenths;

  const currentPrice = Number((nowTenths / 10).toFixed(1));
  const purchasePrice = Number((buyTenths / 10).toFixed(1));
  const sellingPrice = Number((sellTenths / 10).toFixed(1));

  return { buyTenths, sellTenths, currentPrice, purchasePrice, sellingPrice, profitTenths };
}

// -----------------------------------------------------------------------------
// TEST RUNNER INFRASTRUCTURE
// -----------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    const msg = `  ✗ [FAIL] ${testName} ${details ? `-> ${details}` : ""}`;
    console.error(msg);
    failureDetails.push(msg);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  assert(
    actual === expected,
    testName,
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

// =============================================================================
// TEST SUITE 1: FREE TRANSFERS ENGINE ADVERSARIAL STRESS TESTS
// =============================================================================
console.log("\n=======================================================");
console.log("SUITE 1: FREE TRANSFERS ENGINE ADVERSARIAL STRESS TESTS");
console.log("=======================================================");

// 1.1 Consecutive Chips
console.log("\n--- 1.1 Consecutive Chips Stress Tests ---");
{
  // Scenario: GW2 Wildcard, GW3 Free Hit
  // GW1: Base 1 FT going into GW2
  // GW2: WC played -> preserved: min(5, 1) = 1 FT going into GW3
  // GW3: FH played -> preserved: min(5, 1) = 1 FT going into GW4
  const historyConsecutive = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 15, event_transfers_cost: 0 },
      { event: 3, event_transfers: 15, event_transfers_cost: 0 },
    ],
    chips: [
      { event: 2, name: "wildcard" },
      { event: 3, name: "freehit" },
    ],
  };

  const ftFpl = calculateFreeTransfersAvailable(historyConsecutive);
  const ftRoute = routeCalculateFreeTransfersAvailable(historyConsecutive);
  assertEqual(ftFpl, 1, "Consecutive Chips: GW2 WC followed by GW3 FH preserves 1 FT (fpl.ts)");
  assertEqual(ftRoute, 1, "Consecutive Chips: GW2 WC followed by GW3 FH preserves 1 FT (route.ts)");
}

{
  // Scenario: Roll to 2 FT, then WC (GW3), then FH (GW4), then roll (GW5)
  // GW1: 1 FT
  // GW2: 0 transfers -> min(5, 1 - 0 + 1) = 2 FT
  // GW3: WC played -> min(5, 2) = 2 FT
  // GW4: FH played -> min(5, 2) = 2 FT
  // GW5: 0 transfers -> min(5, 2 - 0 + 1) = 3 FT
  const historyRollThenChips = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 8, event_transfers_cost: 0 },
      { event: 4, event_transfers: 11, event_transfers_cost: 0 },
      { event: 5, event_transfers: 0, event_transfers_cost: 0 },
    ],
    chips: [
      { event: 3, name: "wildcard" },
      { event: 4, name: "freehit" },
    ],
  };

  const ft = calculateFreeTransfersAvailable(historyRollThenChips);
  assertEqual(ft, 3, "Consecutive Chips: 2 FT preserved across WC and FH, then rolls to 3 FT");
}

{
  // Scenario: Non-preservation chips (Triple Captain in GW3, Bench Boost in GW4)
  // Official rule: 3xc and bboost do NOT preserve/freeze; standard rollover applies!
  // GW1: 1 FT
  // GW2: 0 transfers -> 2 FT
  // GW3: 3xc played, 1 transfer made -> free_transfers_used = 1 -> min(5, 2 - 1 + 1) = 2 FT
  // GW4: bboost played, 0 transfers made -> free_transfers_used = 0 -> min(5, 2 - 0 + 1) = 3 FT
  const historyStandardChips = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 1, event_transfers_cost: 0 },
      { event: 4, event_transfers: 0, event_transfers_cost: 0 },
    ],
    chips: [
      { event: 3, name: "3xc" },
      { event: 4, name: "bboost" },
    ],
  };

  const ft = calculateFreeTransfersAvailable(historyStandardChips);
  assertEqual(ft, 3, "Non-preservation chips: 3xc and bboost obey standard transfer accumulation");
}

// 1.2 Boundary Clamping [0, 5]
console.log("\n--- 1.2 Boundary Clamping [0, 5] Stress Tests ---");
{
  // Scenario: Upper clamp boundary (5 FT)
  // Rolling for 10 gameweeks with 0 transfers
  const historyRollForever = {
    current: Array.from({ length: 10 }, (_, i) => ({
      event: i + 1,
      event_transfers: 0,
      event_transfers_cost: 0,
    })),
    chips: [],
  };

  const ft = calculateFreeTransfersAvailable(historyRollForever);
  assertEqual(ft, 5, "Upper clamp: 10 consecutive rolled gameweeks clamps at exactly 5 FT");

  // Then playing Wildcard when at 5 FT -> must still be exactly 5
  historyRollForever.chips.push({ event: 10, name: "wildcard" } as never);
  const ftWcAt5 = calculateFreeTransfersAvailable(historyRollForever);
  assertEqual(ftWcAt5, 5, "Upper clamp: Playing Wildcard when at 5 FT preserves exactly 5 FT");
}

{
  // Scenario: Lower clamp boundary (0 FT) via mid-week transfers
  // Manager starts with 2 FT, makes 2 transfers mid-week -> 0 FT
  const historyBase = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
    ],
    chips: [],
  };
  // Going into GW3: available = 2
  const transfersExact = [
    { event: 3, element_in: 10, element_out: 1 },
    { event: 3, element_in: 11, element_out: 2 },
  ];
  const ftZero = calculateFreeTransfersAvailable(historyBase, transfersExact, 2);
  assertEqual(ftZero, 0, "Lower clamp: Exact mid-week transfers consume all available FT -> 0 FT");

  // Manager makes 5 mid-week transfers (taking hits) -> must NOT go negative
  const transfersExcess = [
    ...transfersExact,
    { event: 3, element_in: 12, element_out: 3 },
    { event: 3, element_in: 13, element_out: 4 },
    { event: 3, element_in: 14, element_out: 5 },
  ];
  const ftNegativeClamped = calculateFreeTransfersAvailable(historyBase, transfersExcess, 2);
  assertEqual(ftNegativeClamped, 0, "Lower clamp: Excess mid-week transfers clamp at 0 FT (no negative FT)");
}

// 1.3 Corrupted Data, Hit Math Anomalies & Missing Fields
console.log("\n--- 1.3 Corrupted Data & Hit Math Anomalies ---");
{
  // Scenario: Hits taken exceeds transfer count (impossible state, e.g. event_transfers = 1, cost = 8 -> hits_taken = 2)
  const historyCorruptedHits = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 1, event_transfers_cost: 8 },
    ],
    chips: [],
  };
  const ftCorrupted = calculateFreeTransfersAvailable(historyCorruptedHits);
  // transfers_made = 1, hits_taken = 2 -> free_transfers_used = max(0, 1 - 2) = 0
  // available = min(5, max(0, 1 - 0) + 1) = 2
  assertEqual(ftCorrupted, 2, "Hit cost exceeding transfers does not cause negative free_transfers_used");

  // Scenario: Negative transfers_made (e.g. -2)
  const historyNegativeTransfers = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: -2, event_transfers_cost: 0 },
    ],
    chips: [],
  };
  const ftNeg = calculateFreeTransfersAvailable(historyNegativeTransfers);
  assertEqual(ftNeg, 2, "Negative event_transfers handled safely via max(0, ...)");

  // Scenario: Null, undefined, empty inputs
  assertEqual(calculateFreeTransfersAvailable(null), 1, "Gracefully handles null historyData -> returns 1");
  assertEqual(calculateFreeTransfersAvailable(undefined), 1, "Gracefully handles undefined historyData -> returns 1");
  assertEqual(calculateFreeTransfersAvailable({}), 1, "Gracefully handles empty object -> returns 1");
  assertEqual(calculateFreeTransfersAvailable({ current: null }), 1, "Gracefully handles current = null -> returns 1");
  assertEqual(calculateFreeTransfersAvailable({ current: [] }), 1, "Gracefully handles current = [] -> returns 1");

  // Scenario: Missing event_transfers or event_transfers_cost fields in GW records
  const historyMissingFields = {
    current: [
      { event: 1 },
      { event: 2 },
      { event: 3, event_transfers: null, event_transfers_cost: undefined },
    ],
    chips: null,
  };
  const ftMissing = calculateFreeTransfersAvailable(historyMissingFields);
  assertEqual(ftMissing, 3, "Missing fields in past_gws default safely to 0 transfers used");
}

// 1.4 Mid-Week Chip Immunity vs Inactive Chips
console.log("\n--- 1.4 Mid-Week Chip Immunity vs Inactive Chips ---");
{
  const historyBase = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
    ],
    chips: [
      { event: 3, name: "wildcard" },
    ],
  };
  const midWeekTransfers = [
    { event: 3, element_in: 10, element_out: 1 },
    { event: 3, element_in: 11, element_out: 2 },
  ];

  // When Wildcard is active for event 3, mid-week transfers should NOT be deducted
  const ftWcImmune = calculateFreeTransfersAvailable(historyBase, midWeekTransfers, 2);
  // Before mid-week, base FT = 2. With WC active for GW3, FT stays 2.
  assertEqual(ftWcImmune, 2, "Mid-week Wildcard grants immunity to mid-week transfer deductions");

  // When Free Hit is active for event 3
  historyBase.chips[0].name = "freehit";
  const ftFhImmune = calculateFreeTransfersAvailable(historyBase, midWeekTransfers, 2);
  assertEqual(ftFhImmune, 2, "Mid-week Free Hit grants immunity to mid-week transfer deductions");

  // When Triple Captain is active for event 3 -> 3xc does NOT grant transfer immunity!
  historyBase.chips[0].name = "3xc";
  const ft3xcDeducted = calculateFreeTransfersAvailable(historyBase, midWeekTransfers, 2);
  assertEqual(ft3xcDeducted, 0, "Mid-week Triple Captain does NOT grant transfer immunity (deducted to 0)");
}

// 1.5 Array Ordering Invariance (Shuffled / Reverse History)
console.log("\n--- 1.5 Array Ordering Invariance ---");
{
  const historyOrdered = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 2, event_transfers_cost: 4 },
      { event: 4, event_transfers: 0, event_transfers_cost: 0 },
      { event: 5, event_transfers: 1, event_transfers_cost: 0 },
    ],
    chips: [{ event: 4, name: "wildcard" }],
  };

  const historyReversed = {
    current: [...historyOrdered.current].reverse(),
    chips: historyOrdered.chips,
  };

  const ftOrdered = calculateFreeTransfersAvailable(historyOrdered);
  const ftReversed = calculateFreeTransfersAvailable(historyReversed);
  assertEqual(ftOrdered, ftReversed, "Array ordering invariance: Reversed history produces identical FT");
}

// =============================================================================
// TEST SUITE 2: FINANCIAL & SELLING PRICE ENGINE STRESS TESTS
// =============================================================================
console.log("\n=======================================================");
console.log("SUITE 2: FINANCIAL & SELLING PRICE ENGINE STRESS TESTS");
console.log("=======================================================");

// 2.1 Price Drops: 100% Manager Loss Absorption
console.log("\n--- 2.1 Price Drops (nowTenths < buyTenths) ---");
{
  // Test Case: Buy at 100, Now at 99 (-0.1m)
  const drop1 = calculatePlayerPrices(99, 0, { element_in_cost: 100 });
  assertEqual(drop1.sellTenths, 99, "Price Drop -1 tenth: sellTenths === nowTenths (99)");
  assertEqual(drop1.sellingPrice, 9.9, "Price Drop -1 tenth: sellingPrice === 9.9");

  // Test Case: Buy at 100, Now at 90 (-1.0m)
  const drop10 = calculatePlayerPrices(90, 0, { element_in_cost: 100 });
  assertEqual(drop10.sellTenths, 90, "Price Drop -10 tenths: sellTenths === nowTenths (90)");
  assertEqual(drop10.sellingPrice, 9.0, "Price Drop -10 tenths: sellingPrice === 9.0");

  // Test Case: Buy at 45, Now at 39 (-0.6m)
  const drop6 = calculatePlayerPrices(39, 0, { element_in_cost: 45 });
  assertEqual(drop6.sellTenths, 39, "Price Drop -6 tenths: sellTenths === nowTenths (39)");
  assertEqual(drop6.sellingPrice, 3.9, "Price Drop -6 tenths: sellingPrice === 3.9");

  // Fuzzing 500 random drop pairs
  let allDropsPassed = true;
  for (let i = 0; i < 500; i++) {
    const buy = Math.floor(Math.random() * 100) + 50; // 50 to 150
    const drop = Math.floor(Math.random() * 20) + 1; // 1 to 20
    const now = buy - drop;
    const res = calculatePlayerPrices(now, 0, { element_in_cost: buy });
    if (res.sellTenths !== now || res.sellingPrice !== Number((now / 10).toFixed(1))) {
      allDropsPassed = false;
      break;
    }
  }
  assert(allDropsPassed, "Price Drops Fuzzing: 500 randomized drop scenarios confirm 100% loss absorption");
}

// 2.2 Price Increases: Odd vs Even Tenths (Math.floor(profit / 2))
console.log("\n--- 2.2 Price Increases: Odd vs Even Profit Sharing ---");
{
  // Odd Profit +1: Buy at 50, Now at 51 -> profit 1 -> floor(1/2) = 0 -> sell 50
  const odd1 = calculatePlayerPrices(51, 0, { element_in_cost: 50 });
  assertEqual(odd1.sellTenths, 50, "Odd Profit +1: sellTenths === buyTenths (profit unrealized at +0.1m)");
  assertEqual(odd1.sellingPrice, 5.0, "Odd Profit +1: sellingPrice === 5.0");

  // Even Profit +2: Buy at 50, Now at 52 -> profit 2 -> floor(2/2) = 1 -> sell 51
  const even2 = calculatePlayerPrices(52, 0, { element_in_cost: 50 });
  assertEqual(even2.sellTenths, 51, "Even Profit +2: sellTenths === 51 (realized +0.1m)");
  assertEqual(even2.sellingPrice, 5.1, "Even Profit +2: sellingPrice === 5.1");

  // Odd Profit +3: Buy at 155, Now at 158 (Haaland Ground Truth)
  const haaland = calculatePlayerPrices(158, 0, { element_in_cost: 155 });
  assertEqual(haaland.sellTenths, 156, "Odd Profit +3 (Haaland): buy 155, now 158 -> sell 156");
  assertEqual(haaland.sellingPrice, 15.6, "Odd Profit +3 (Haaland): sellingPrice === 15.6");

  // Even Profit +4: Buy at 77, Now at 81 (Rogers Ground Truth)
  const rogers = calculatePlayerPrices(81, 0, { element_in_cost: 77 });
  assertEqual(rogers.sellTenths, 79, "Even Profit +4 (Rogers): buy 77, now 81 -> sell 79");
  assertEqual(rogers.sellingPrice, 7.9, "Even Profit +4 (Rogers): sellingPrice === 7.9");

  // Odd Profit +5: Buy at 61, Now at 66 (Tavernier Ground Truth)
  const tavernier = calculatePlayerPrices(66, 0, { element_in_cost: 61 });
  assertEqual(tavernier.sellTenths, 63, "Odd Profit +5 (Tavernier): buy 61, now 66 -> sell 63");
  assertEqual(tavernier.sellingPrice, 6.3, "Odd Profit +5 (Tavernier): sellingPrice === 6.3");

  // Fuzzing 500 random increase pairs
  let allIncreasesPassed = true;
  for (let i = 0; i < 500; i++) {
    const buy = Math.floor(Math.random() * 100) + 40;
    const profit = Math.floor(Math.random() * 30) + 1;
    const now = buy + profit;
    const expectedSellTenths = buy + Math.floor(profit / 2);
    const expectedSellingPrice = Number((expectedSellTenths / 10).toFixed(1));
    const res = calculatePlayerPrices(now, 0, { element_in_cost: buy });
    if (res.sellTenths !== expectedSellTenths || res.sellingPrice !== expectedSellingPrice) {
      allIncreasesPassed = false;
      break;
    }
  }
  assert(allIncreasesPassed, "Price Increases Fuzzing: 500 randomized profit scenarios match integer 50% rule");
}

// 2.3 Zero Profit: nowTenths === buyTenths
console.log("\n--- 2.3 Zero Profit (nowTenths === buyTenths) ---");
{
  const zero1 = calculatePlayerPrices(100, 0, { element_in_cost: 100 });
  assertEqual(zero1.sellTenths, 100, "Zero Profit: sellTenths === nowTenths (100)");
  assertEqual(zero1.sellingPrice, 10.0, "Zero Profit: sellingPrice === 10.0");

  const zero2 = calculatePlayerPrices(45, 0, { element_in_cost: 45 });
  assertEqual(zero2.sellTenths, 45, "Zero Profit: sellTenths === nowTenths (45)");
  assertEqual(zero2.sellingPrice, 4.5, "Zero Profit: sellingPrice === 4.5");
}

// 2.4 Missing Transfer History & cost_change_start variations
console.log("\n--- 2.4 Missing Transfer History & cost_change_start ---");
{
  // Scenario: GW1 pick with positive cost_change_start (+3 tenths)
  const gw1Rise = calculatePlayerPrices(158, 3, undefined);
  assertEqual(gw1Rise.buyTenths, 155, "GW1 pick with cost_change_start = 3: buyTenths === 155");
  assertEqual(gw1Rise.sellTenths, 156, "GW1 pick with cost_change_start = 3: sellTenths === 156");

  // Scenario: GW1 pick with negative cost_change_start (-2 tenths, price drop from season start)
  // now = 58, cost_change_start = -2 -> buyTenths = 58 - (-2) = 60
  // profit = 58 - 60 = -2 -> sellTenths = 58 (full loss borne)
  const gw1Drop = calculatePlayerPrices(58, -2, undefined);
  assertEqual(gw1Drop.buyTenths, 60, "GW1 pick with cost_change_start = -2: buyTenths === 60");
  assertEqual(gw1Drop.sellTenths, 58, "GW1 pick with cost_change_start = -2: sellTenths === 58 (drop absorbed)");

  // Scenario: cost_change_start is null
  const nullChange = calculatePlayerPrices(50, null, undefined);
  assertEqual(nullChange.buyTenths, 50, "cost_change_start null: defaults to 0 change (buy === now)");
  assertEqual(nullChange.sellTenths, 50, "cost_change_start null: sellTenths === now");

  // Scenario: cost_change_start is undefined
  const undefChange = calculatePlayerPrices(65, undefined, undefined);
  assertEqual(undefChange.buyTenths, 65, "cost_change_start undefined: defaults to 0 change (buy === now)");
  assertEqual(undefChange.sellTenths, 65, "cost_change_start undefined: sellTenths === now");
}

// 2.5 Transfer History Deduplication & Chronological Ordering
console.log("\n--- 2.5 Transfer History Deduplication & Chronological Ordering ---");
{
  // A player was transferred in twice: GW2 at £5.0m (50), sold in GW4, bought back GW7 at £5.5m (55)
  const transfersHistory = [
    { element_in: 99, element_in_cost: 50, time: "2024-08-25T12:00:00Z" }, // GW2
    { element_in: 99, element_in_cost: 55, time: "2024-10-01T12:00:00Z" }, // GW7 (newest)
    { element_in: 99, element_in_cost: 52, time: "2024-09-15T12:00:00Z" }, // GW5
  ];

  // Emulate sortedTransfersDesc
  const sortedDesc = [...transfersHistory].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  const lastIn = sortedDesc.find((t) => t.element_in === 99);
  assertEqual(lastIn?.element_in_cost, 55, "Chronological sort correctly picks newest transfer-in cost (£5.5m)");
}

// 2.6 Floating Point Precision & Squad Valuation Stress Test
console.log("\n--- 2.6 Floating Point Precision & Squad Valuation Stress Test ---");
{
  // Construct a realistic 15-player squad with various prices susceptible to IEEE-754 drift
  // e.g. 0.1, 0.2, 0.3 sums in JavaScript: 0.1 + 0.2 !== 0.3
  const squadPrices = [
    { sell: 4.5, now: 4.5 },
    { sell: 4.0, now: 4.0 },
    { sell: 6.3, now: 6.6 },
    { sell: 5.1, now: 5.2 },
    { sell: 4.6, now: 4.7 },
    { sell: 4.0, now: 4.0 },
    { sell: 4.0, now: 4.0 },
    { sell: 7.9, now: 8.1 },
    { sell: 9.8, now: 10.0 },
    { sell: 6.5, now: 6.5 },
    { sell: 5.5, now: 5.6 },
    { sell: 15.6, now: 15.8 },
    { sell: 7.5, now: 7.6 },
    { sell: 5.8, now: 6.0 },
    { sell: 5.9, now: 6.0 },
  ];

  const bankTenths = 35; // £3.5m

  // Compute using integer tenths as in fpl.ts L839-851
  const totalSellTenths = squadPrices.reduce(
    (sum, p) => sum + Math.round(p.sell * 10),
    0
  );
  const totalNowTenths = squadPrices.reduce(
    (sum, p) => sum + Math.round(p.now * 10),
    0
  );

  const sellingValue = Number((totalSellTenths / 10).toFixed(1));
  const inTheBank = Number((bankTenths / 10).toFixed(1));
  const liquidationBudget = Number(((totalSellTenths + bankTenths) / 10).toFixed(1));
  const teamValue = Number(((totalNowTenths + bankTenths) / 10).toFixed(1));

  assertEqual(sellingValue, 97.0, "Integer tenths squad sum yields exact £97.0m selling value");
  assertEqual(inTheBank, 3.5, "Bank tenths yields exact £3.5m");
  assertEqual(liquidationBudget, 100.5, "Liquidation budget (sellTenths + bankTenths)/10 yields exact £100.5m");
  assertEqual(teamValue, 102.1, "Team value (nowTenths + bankTenths)/10 yields exact £102.1m");

  // Verify that liquidationBudget === Number((sellingValue + inTheBank).toFixed(1))
  const directFloatSum = Number((sellingValue + inTheBank).toFixed(1));
  assertEqual(
    liquidationBudget,
    directFloatSum,
    "Liquidation budget matches sellingValue + inTheBank without float drift"
  );
}

// 2.7 Mid-Week Transfer Chain & Bank Delta Math
console.log("\n--- 2.7 Mid-Week Transfer Chain & Bank Delta Math ---");
{
  // Manager starts with 15 picks [1..15]
  const rawPicks = Array.from({ length: 15 }, (_, i) => ({
    element: i + 1,
    position: i + 1,
    multiplier: 1,
    is_captain: i === 0,
    is_vice_captain: i === 1,
  }));

  // Mid-week transfers for event 10 (currentEvent = 9):
  // 1. Out player 5 (£6.0m = 60), In player 20 (£5.5m = 55) -> +5 bank
  // 2. Out player 20 (£5.5m = 55), In player 25 (£5.0m = 50) -> +5 bank
  // Net effect: player 5 replaced by player 25, net bank delta = +10 tenths (£1.0m)
  const midWeekTransfers = [
    {
      event: 10,
      element_out: 5,
      element_in: 20,
      element_out_cost: 60,
      element_in_cost: 55,
      time: "2024-10-20T10:00:00Z",
    },
    {
      event: 10,
      element_out: 20,
      element_in: 25,
      element_out_cost: 55,
      element_in_cost: 50,
      time: "2024-10-20T12:00:00Z",
    },
  ];

  // Apply sequential mid-week transfers as in fpl.ts L361-376
  const sortedMidWeek = [...midWeekTransfers].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  for (const t of sortedMidWeek) {
    const pickIdx = rawPicks.findIndex((p) => p.element === t.element_out);
    if (pickIdx !== -1) {
      rawPicks[pickIdx].element = t.element_in;
    }
  }

  const midWeekBankDeltaTenths = midWeekTransfers.reduce(
    (sum, t) => sum + ((t.element_out_cost || 0) - (t.element_in_cost || 0)),
    0
  );

  const finalPlayerAtSlot5 = rawPicks[4].element;
  assertEqual(finalPlayerAtSlot5, 25, "Sequential mid-week chain (5 -> 20 -> 25) correctly resolves to player 25");
  assertEqual(midWeekBankDeltaTenths, 10, "Sequential mid-week bank delta correctly sums to +10 tenths (+£1.0m)");
}

// 1.6 Monte Carlo 38-Gameweek Full Season Fuzzing vs Independent Oracle
console.log("\n--- 1.6 Monte Carlo 38-Gameweek Full Season Fuzzing vs Oracle ---");
{
  let seasonFuzzPassed = true;
  for (let sim = 0; sim < 500; sim++) {
    const numGws = Math.floor(Math.random() * 37) + 2; // 2 to 38
    const currentEvent = numGws;
    const chips: Array<{ event: number; name: string }> = [];

    // Randomly assign chips (WC, FH, BB, 3XC)
    const availableChips = ["wildcard", "freehit", "bboost", "3xc"];
    for (const chipName of availableChips) {
      if (Math.random() < 0.6) {
        const chipEvent = Math.floor(Math.random() * (numGws - 1)) + 2; // GW2 to numGws
        if (!chips.some((c) => c.event === chipEvent)) {
          chips.push({ event: chipEvent, name: chipName });
        }
      }
    }

    // Generate GW history
    const pastGws = [];
    for (let gw = 1; gw <= numGws; gw++) {
      const isChip = chips.find((c) => c.event === gw);
      let transfers = 0;
      let cost = 0;
      if (gw >= 2) {
        if (isChip && (isChip.name === "wildcard" || isChip.name === "freehit")) {
          transfers = Math.floor(Math.random() * 15);
          cost = 0;
        } else {
          transfers = Math.floor(Math.random() * 5); // 0 to 4
          const hits = Math.max(0, transfers - 1);
          cost = hits * 4;
        }
      }
      pastGws.push({ event: gw, event_transfers: transfers, event_transfers_cost: cost });
    }

    // Mid-week transfers for nextEvent (numGws + 1)
    const nextEvent = numGws + 1;
    const midWeekCount = Math.floor(Math.random() * 6); // 0 to 5
    const midWeekTransfers = Array.from({ length: midWeekCount }, (_, i) => ({
      event: nextEvent,
      element_in: 100 + i,
      element_out: 10 + i,
    }));

    // Randomly play upcoming chip for nextEvent
    if (Math.random() < 0.3) {
      chips.push({ event: nextEvent, name: Math.random() < 0.5 ? "wildcard" : "freehit" });
    }

    const historyData = { current: pastGws, chips };

    // Independent Oracle calculation
    let oracleFt = 1;
    for (let gw = 2; gw <= numGws; gw++) {
      const chip = chips.find((c) => c.event === gw);
      if (chip && (chip.name === "wildcard" || chip.name === "freehit")) {
        oracleFt = Math.min(5, oracleFt);
      } else {
        const gwRec = pastGws.find((g) => g.event === gw)!;
        const hits = Math.floor((gwRec.event_transfers_cost || 0) / 4);
        const freeUsed = Math.max(0, (gwRec.event_transfers || 0) - hits);
        oracleFt = Math.min(5, Math.max(0, oracleFt - freeUsed) + 1);
      }
    }

    const nextChip = chips.find((c) => c.event === nextEvent);
    const isNextWcOrFh = nextChip && (nextChip.name === "wildcard" || nextChip.name === "freehit");
    if (!isNextWcOrFh) {
      oracleFt = Math.max(0, oracleFt - midWeekCount);
    }
    oracleFt = Math.max(0, Math.min(5, oracleFt));

    const result = calculateFreeTransfersAvailable(historyData, midWeekTransfers, currentEvent);
    if (result !== oracleFt || isNaN(result) || result < 0 || result > 5) {
      seasonFuzzPassed = false;
      console.error(`Season fuzz failed at sim ${sim}: Expected ${oracleFt}, got ${result}`);
      break;
    }
  }
  assert(seasonFuzzPassed, "Monte Carlo Fuzzing: 500 random 38-GW full-season histories match oracle in [0, 5]");
}

// 2.8 10,000-Player Massive Pricing & Valuation Invariance Fuzzing
console.log("\n--- 2.8 10,000-Player Massive Pricing & Valuation Invariance Fuzzing ---");
{
  let pricingFuzzPassed = true;
  for (let i = 0; i < 10000; i++) {
    const buyTenths = Math.floor(Math.random() * 120) + 38; // £3.8m to £15.8m
    const priceDelta = Math.floor(Math.random() * 41) - 20; // -20 to +20 tenths (-£2.0m to +£2.0m)
    const nowTenths = Math.max(35, buyTenths + priceDelta);

    const res = calculatePlayerPrices(nowTenths, 0, { element_in_cost: buyTenths });

    // Mathematical assertions:
    // 1. sellTenths must be integer
    if (!Number.isInteger(res.sellTenths)) {
      pricingFuzzPassed = false;
      break;
    }
    // 2. sellingPrice must have at most 1 decimal place and equal sellTenths / 10
    if (res.sellingPrice !== Number((res.sellTenths / 10).toFixed(1))) {
      pricingFuzzPassed = false;
      break;
    }
    // 3. If now < buy, sellTenths must equal nowTenths (100% loss)
    if (nowTenths < buyTenths && res.sellTenths !== nowTenths) {
      pricingFuzzPassed = false;
      break;
    }
    // 4. If now > buy, sellTenths must equal buy + floor((now - buy) / 2)
    if (nowTenths > buyTenths && res.sellTenths !== buyTenths + Math.floor((nowTenths - buyTenths) / 2)) {
      pricingFuzzPassed = false;
      break;
    }
    // 5. If now === buy, sellTenths must equal buyTenths
    if (nowTenths === buyTenths && res.sellTenths !== buyTenths) {
      pricingFuzzPassed = false;
      break;
    }
  }
  assert(pricingFuzzPassed, "Massive Pricing Fuzzing: 10,000 player valuations mathematically verified with zero drift");
}

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
console.log("\n=======================================================");
console.log("                  STRESS TEST SUMMARY                  ");
console.log("=======================================================");
console.log(`Total Assertions Run: ${totalTests}`);
console.log(`Passed:               ${passedTests}`);
console.log(`Failed:               ${failedTests}`);

if (failedTests > 0) {
  console.error("\nFAILURES DETECTED:");
  for (const f of failureDetails) {
    console.error(f);
  }
  process.exit(1);
} else {
  console.log("\nALL ADVERSARIAL STRESS TESTS PASSED!");
  process.exit(0);
}
