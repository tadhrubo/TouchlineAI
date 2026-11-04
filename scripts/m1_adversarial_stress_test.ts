/**
 * scripts/m1_adversarial_stress_test.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE FOR MILESTONE 1
 *
 * Stress-tests:
 *   1. Medical Status Mapping & Boundary Conditions
 *   2. Provisional Live BPS Bonus & Official FPL Tie-Breaking
 *   3. Mid-Week Transfer Pick Replacement, Bench Ordering & Captaincy
 *   4. Free Transfers 2024/25 Rollover, Chip Preservation & Mid-Week Deductions
 */

import {
  calculateFreeTransfersAvailable,
  calculateProvisionalBonus,
} from "../src/services/fpl";
import type { Player, SquadData } from "../src/types/fpl";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const msg = `FAIL: ${testName}${detail ? ` (${detail})` : ""}`;
    console.error(`  [X] ${msg}`);
    failureDetails.push(msg);
  }
}

function assertEquals<T>(actual: T, expected: T, testName: string) {
  const matches = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    matches,
    testName,
    `expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`
  );
}

// ============================================================================
// SUITE 1: MEDICAL STATUS MAPPING & BOUNDARY CONDITIONS
// ============================================================================
console.log("\n=======================================================");
console.log("SUITE 1: Medical Status Mapping & Boundary Conditions");
console.log("=======================================================");

function mapMedicalStatus(bEl: any) {
  const rawStatus = bEl?.status || "a";
  const mappedStatus: "available" | "injured" | "doubtful" | "suspended" | "unavailable" =
    rawStatus === "i"
      ? "injured"
      : rawStatus === "d"
      ? "doubtful"
      : rawStatus === "s"
      ? "suspended"
      : rawStatus === "u" || rawStatus === "n"
      ? "unavailable"
      : "available";

  const newsStr = bEl?.news || "";
  const chanceOfPlaying = bEl?.chance_of_playing_next_round ?? null;

  return { mappedStatus, newsStr, chanceOfPlaying };
}

// 1.1 Known valid status strings
assertEquals(mapMedicalStatus({ status: "i" }).mappedStatus, "injured", "1.1 Status 'i' -> 'injured'");
assertEquals(mapMedicalStatus({ status: "d" }).mappedStatus, "doubtful", "1.2 Status 'd' -> 'doubtful'");
assertEquals(mapMedicalStatus({ status: "s" }).mappedStatus, "suspended", "1.3 Status 's' -> 'suspended'");
assertEquals(mapMedicalStatus({ status: "u" }).mappedStatus, "unavailable", "1.4 Status 'u' -> 'unavailable'");
assertEquals(mapMedicalStatus({ status: "n" }).mappedStatus, "unavailable", "1.5 Status 'n' -> 'unavailable'");
assertEquals(mapMedicalStatus({ status: "a" }).mappedStatus, "available", "1.6 Status 'a' -> 'available'");

// 1.2 Unrecognized / adversarial raw status strings
assertEquals(mapMedicalStatus({ status: "x" }).mappedStatus, "available", "1.7 Unknown char 'x' -> 'available'");
assertEquals(mapMedicalStatus({ status: "?" }).mappedStatus, "available", "1.8 Unknown char '?' -> 'available'");
assertEquals(mapMedicalStatus({ status: "injured" }).mappedStatus, "available", "1.9 Word 'injured' -> fallback 'available'");
assertEquals(mapMedicalStatus({ status: "" }).mappedStatus, "available", "1.10 Empty string status -> 'available'");
assertEquals(mapMedicalStatus({ status: null }).mappedStatus, "available", "1.11 Null status -> 'available'");
assertEquals(mapMedicalStatus({ status: undefined }).mappedStatus, "available", "1.12 Undefined status -> 'available'");
assertEquals(mapMedicalStatus(null).mappedStatus, "available", "1.13 Null bEl object -> 'available'");
assertEquals(mapMedicalStatus(undefined).mappedStatus, "available", "1.14 Undefined bEl object -> 'available'");

// 1.3 chance_of_playing_next_round boundary tests (0 must NOT be coerced to null)
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: 0 }).chanceOfPlaying, 0, "1.15 Chance 0% preserved as 0 (not null)");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: null }).chanceOfPlaying, null, "1.16 Chance null -> null");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: undefined }).chanceOfPlaying, null, "1.17 Chance undefined -> null");
assertEquals(mapMedicalStatus({}).chanceOfPlaying, null, "1.18 Missing chance property -> null");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: 25 }).chanceOfPlaying, 25, "1.19 Chance 25% -> 25");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: 50 }).chanceOfPlaying, 50, "1.20 Chance 50% -> 50");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: 75 }).chanceOfPlaying, 75, "1.21 Chance 75% -> 75");
assertEquals(mapMedicalStatus({ chance_of_playing_next_round: 100 }).chanceOfPlaying, 100, "1.22 Chance 100% -> 100");

// 1.4 news string fallbacks
assertEquals(mapMedicalStatus({ news: "Hamstring strain" }).newsStr, "Hamstring strain", "1.23 Valid news string preserved");
assertEquals(mapMedicalStatus({ news: "" }).newsStr, "", "1.24 Empty news string -> ''");
assertEquals(mapMedicalStatus({ news: null }).newsStr, "", "1.25 Null news -> ''");
assertEquals(mapMedicalStatus({ news: undefined }).newsStr, "", "1.26 Undefined news -> ''");
assertEquals(mapMedicalStatus({}).newsStr, "", "1.27 Missing news property -> ''");


// ============================================================================
// SUITE 2: PROVISIONAL LIVE BPS BONUS & OFFICIAL FPL TIE-BREAKING
// ============================================================================
console.log("\n=======================================================");
console.log("SUITE 2: Provisional Live BPS & Official FPL Tie-Breaking");
console.log("=======================================================");

// 2.1 Clear 1st, 2nd, 3rd (no ties)
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 40 }, { element: 2, value: 20 }],
      a: [{ element: 3, value: 30 }, { element: 4, value: 10 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.1 Clear 1st gets 3 pts");
  assertEquals(result.get(3), 2, "2.1 Clear 2nd gets 2 pts");
  assertEquals(result.get(2), 1, "2.1 Clear 3rd gets 1 pt");
  assertEquals(result.get(4), undefined, "2.1 4th place gets 0 (undefined)");
}

// 2.2 2-way tie for 1st: Both get 3, next gets 1, NO ONE gets 2
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 10, value: 45 }, { element: 11, value: 30 }],
      a: [{ element: 20, value: 45 }, { element: 21, value: 15 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [10, { minutes: 90 }],
    [20, { minutes: 85 }],
    [11, { minutes: 70 }],
    [21, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(10), 3, "2.2 2-way tie for 1st: Player 1 gets 3");
  assertEquals(result.get(20), 3, "2.2 2-way tie for 1st: Player 2 gets 3");
  assertEquals(result.get(11), 1, "2.2 2-way tie for 1st: Next player gets 1");
  assertEquals(result.get(21), undefined, "2.2 2-way tie for 1st: 4th gets nothing");
  // Check no player received 2 points
  const points = Array.from(result.values());
  assert(!points.includes(2), "2.2 2-way tie for 1st: Exactly ZERO players receive 2 bonus points");
}

// 2.3 3-way tie for 1st: All 3 get 3, NO ONE gets 2 or 1
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 50 }, { element: 2, value: 50 }],
      a: [{ element: 3, value: 50 }, { element: 4, value: 30 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.3 3-way tie for 1st: Player 1 gets 3");
  assertEquals(result.get(2), 3, "2.3 3-way tie for 1st: Player 2 gets 3");
  assertEquals(result.get(3), 3, "2.3 3-way tie for 1st: Player 3 gets 3");
  assertEquals(result.get(4), undefined, "2.3 3-way tie for 1st: Player 4 gets nothing");
  const points = Array.from(result.values());
  assert(!points.includes(2), "2.3 3-way tie for 1st: No one gets 2 points");
  assert(!points.includes(1), "2.3 3-way tie for 1st: No one gets 1 point");
}

// 2.4 2-way tie for 2nd: 1st gets 3, both tied get 2, NO ONE gets 1
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 100, value: 40 }, { element: 101, value: 25 }],
      a: [{ element: 200, value: 25 }, { element: 201, value: 10 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [100, { minutes: 90 }],
    [101, { minutes: 90 }],
    [200, { minutes: 90 }],
    [201, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(100), 3, "2.4 2-way tie for 2nd: 1st gets 3");
  assertEquals(result.get(101), 2, "2.4 2-way tie for 2nd: Tied 2nd (A) gets 2");
  assertEquals(result.get(200), 2, "2.4 2-way tie for 2nd: Tied 2nd (B) gets 2");
  assertEquals(result.get(201), undefined, "2.4 2-way tie for 2nd: 4th gets nothing");
  const points = Array.from(result.values());
  assert(!points.includes(1), "2.4 2-way tie for 2nd: Exactly ZERO players receive 1 bonus point");
}

// 2.5 2-way tie for 3rd: 1st gets 3, 2nd gets 2, both tied get 1
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 50 }, { element: 2, value: 35 }, { element: 3, value: 20 }],
      a: [{ element: 4, value: 20 }, { element: 5, value: 10 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
    [5, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.5 2-way tie for 3rd: 1st gets 3");
  assertEquals(result.get(2), 2, "2.5 2-way tie for 3rd: 2nd gets 2");
  assertEquals(result.get(3), 1, "2.5 2-way tie for 3rd: Tied 3rd (A) gets 1");
  assertEquals(result.get(4), 1, "2.5 2-way tie for 3rd: Tied 3rd (B) gets 1");
  assertEquals(result.get(5), undefined, "2.5 2-way tie for 3rd: 5th gets nothing");
}

// 2.6 Players with minutes === 0 must NOT receive bonus points even if BPS > 0
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 100 }, { element: 2, value: 40 }],
      a: [{ element: 3, value: 30 }, { element: 4, value: 20 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 0 }], // 0 minutes!
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), undefined, "2.6 minutes === 0 player NEVER receives bonus");
  assertEquals(result.get(2), 3, "2.6 1st active player gets 3");
  assertEquals(result.get(3), 2, "2.6 2nd active player gets 2");
  assertEquals(result.get(4), 1, "2.6 3rd active player gets 1");
}

// 2.7 Player missing from liveElementsMap (undefined minutes -> defaults to 0)
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 999, value: 80 }, { element: 2, value: 40 }],
      a: [{ element: 3, value: 30 }, { element: 4, value: 20 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    // 999 missing
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(999), undefined, "2.7 Missing live player defaults to 0 minutes and gets NO bonus");
  assertEquals(result.get(2), 3, "2.7 Active player gets 3");
}

// 2.8 Official bonus already awarded -> provisional bonus skipped (no double counting)
{
  const fixtures = [{
    started: true,
    stats: [
      {
        identifier: "bonus",
        h: [{ element: 1, value: 3 }],
        a: [{ element: 2, value: 2 }, { element: 3, value: 1 }],
      },
      {
        identifier: "bps",
        h: [{ element: 1, value: 40 }, { element: 4, value: 10 }],
        a: [{ element: 2, value: 30 }, { element: 3, value: 20 }],
      },
    ],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
    [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.size, 0, "2.8 Fixture with official bonus produces empty provisional map (no double counting)");
}

// 2.9 Unstarted fixture -> provisional bonus skipped
{
  const fixtures = [{
    started: false,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 40 }],
      a: [{ element: 2, value: 30 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.size, 0, "2.9 Unstarted fixture produces empty provisional map");
}

// 2.10 Player with BPS <= 0
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 0 }, { element: 2, value: -3 }],
      a: [{ element: 3, value: 25 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }],
    [2, { minutes: 90 }],
    [3, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), undefined, "2.10 Player with 0 BPS receives NO bonus");
  assertEquals(result.get(2), undefined, "2.10 Player with negative BPS receives NO bonus");
  assertEquals(result.get(3), 3, "2.10 Only player with positive BPS receives 3 pts");
}

// 2.11 4-way tie for 1st: All 4 get 3 points, no 2 or 1 awarded
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 35 }, { element: 2, value: 35 }],
      a: [{ element: 3, value: 35 }, { element: 4, value: 35 }, { element: 5, value: 20 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }], [2, { minutes: 90 }], [3, { minutes: 90 }], [4, { minutes: 90 }], [5, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.11 4-way tie 1st: Player 1 gets 3");
  assertEquals(result.get(2), 3, "2.11 4-way tie 1st: Player 2 gets 3");
  assertEquals(result.get(3), 3, "2.11 4-way tie 1st: Player 3 gets 3");
  assertEquals(result.get(4), 3, "2.11 4-way tie 1st: Player 4 gets 3");
  assertEquals(result.get(5), undefined, "2.11 4-way tie 1st: Player 5 gets nothing");
}

// 2.12 2-way tie for 1st AND 2-way tie for 3rd (both 1st get 3, both 3rd get 1, 0 get 2)
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 40 }, { element: 2, value: 25 }],
      a: [{ element: 3, value: 40 }, { element: 4, value: 25 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }], [2, { minutes: 90 }], [3, { minutes: 90 }], [4, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.12 Tied 1st (A) gets 3");
  assertEquals(result.get(3), 3, "2.12 Tied 1st (B) gets 3");
  assertEquals(result.get(2), 1, "2.12 Tied 3rd (A) gets 1");
  assertEquals(result.get(4), 1, "2.12 Tied 3rd (B) gets 1");
  const points = Array.from(result.values());
  assert(!points.includes(2), "2.12 Exactly ZERO players receive 2 bonus points");
}

// 2.13 3-way tie for 2nd: 1st gets 3, all three tied get 2, NO ONE gets 1
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 50 }, { element: 2, value: 30 }],
      a: [{ element: 3, value: 30 }, { element: 4, value: 30 }, { element: 5, value: 10 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }], [2, { minutes: 90 }], [3, { minutes: 90 }], [4, { minutes: 90 }], [5, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.13 1st gets 3");
  assertEquals(result.get(2), 2, "2.13 Tied 2nd (A) gets 2");
  assertEquals(result.get(3), 2, "2.13 Tied 2nd (B) gets 2");
  assertEquals(result.get(4), 2, "2.13 Tied 2nd (C) gets 2");
  assertEquals(result.get(5), undefined, "2.13 5th place gets nothing");
  const points = Array.from(result.values());
  assert(!points.includes(1), "2.13 Exactly ZERO players receive 1 bonus point");
}

// 2.14 3-way tie for 3rd: 1st gets 3, 2nd gets 2, all three tied get 1
{
  const fixtures = [{
    started: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 50 }, { element: 2, value: 40 }],
      a: [{ element: 3, value: 20 }, { element: 4, value: 20 }, { element: 5, value: 20 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }], [2, { minutes: 90 }], [3, { minutes: 90 }], [4, { minutes: 90 }], [5, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.14 1st gets 3");
  assertEquals(result.get(2), 2, "2.14 2nd gets 2");
  assertEquals(result.get(3), 1, "2.14 Tied 3rd (A) gets 1");
  assertEquals(result.get(4), 1, "2.14 Tied 3rd (B) gets 1");
  assertEquals(result.get(5), 1, "2.14 Tied 3rd (C) gets 1");
}

// 2.15 Multi-fixture simultaneous calculation (2 fixtures running in parallel)
{
  const fixtures = [
    {
      id: 1,
      started: true,
      stats: [{
        identifier: "bps",
        h: [{ element: 10, value: 40 }],
        a: [{ element: 20, value: 30 }, { element: 30, value: 20 }],
      }],
    },
    {
      id: 2,
      started: true,
      stats: [{
        identifier: "bps",
        h: [{ element: 40, value: 50 }],
        a: [{ element: 50, value: 35 }, { element: 60, value: 15 }],
      }],
    },
  ];
  const liveMap = new Map<number, any>([
    [10, { minutes: 90 }], [20, { minutes: 90 }], [30, { minutes: 90 }],
    [40, { minutes: 90 }], [50, { minutes: 90 }], [60, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(10), 3, "2.15 Fixture 1: 1st gets 3");
  assertEquals(result.get(20), 2, "2.15 Fixture 1: 2nd gets 2");
  assertEquals(result.get(30), 1, "2.15 Fixture 1: 3rd gets 1");
  assertEquals(result.get(40), 3, "2.15 Fixture 2: 1st gets 3");
  assertEquals(result.get(50), 2, "2.15 Fixture 2: 2nd gets 2");
  assertEquals(result.get(60), 1, "2.15 Fixture 2: 3rd gets 1");
}

// 2.16 Defensive null / undefined / empty input handling
{
  assertEquals(calculateProvisionalBonus(null as any, new Map()).size, 0, "2.16 Null fixtures returns empty map");
  assertEquals(calculateProvisionalBonus(undefined as any, new Map()).size, 0, "2.16 Undefined fixtures returns empty map");
  assertEquals(calculateProvisionalBonus([], new Map()).size, 0, "2.16 Empty fixtures array returns empty map");
  const brokenFixture = [{ started: true, stats: null }];
  assertEquals(calculateProvisionalBonus(brokenFixture as any, new Map()).size, 0, "2.16 Fixture with null stats returns empty map");
}

// 2.17 Finished fixture without official bonus yet awards provisional bonus
{
  const fixtures = [{
    started: true,
    finished: true,
    finished_provisional: true,
    stats: [{
      identifier: "bps",
      h: [{ element: 1, value: 30 }],
      a: [{ element: 2, value: 20 }],
    }],
  }];
  const liveMap = new Map<number, any>([
    [1, { minutes: 90 }], [2, { minutes: 90 }],
  ]);
  const result = calculateProvisionalBonus(fixtures, liveMap);
  assertEquals(result.get(1), 3, "2.17 Finished match before bonus finalization gives 3 to 1st");
  assertEquals(result.get(2), 2, "2.17 Finished match before bonus finalization gives 2 to 2nd");
}


// ============================================================================
// SUITE 3: MID-WEEK TRANSFERS, BENCH ORDERING & CAPTAINCY PRESERVATION
// ============================================================================
console.log("\n=======================================================");
console.log("SUITE 3: Mid-Week Transfers, Bench Order & Captaincy");
console.log("=======================================================");

function simulateMidWeekTransfers(
  initialPicks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>,
  transfersData: any[],
  currentEvent: number,
  initialBankTenths: number
) {
  const rawPicks = initialPicks.map((p) => ({ ...p }));
  const nextEvent = currentEvent + 1;
  const midWeekTransfers = Array.isArray(transfersData)
    ? transfersData.filter((t: any) => t.event === nextEvent)
    : [];

  if (midWeekTransfers.length > 0) {
    const sortedMidWeek = [...midWeekTransfers].sort(
      (a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    for (const t of sortedMidWeek) {
      const pickIdx = rawPicks.findIndex((p) => p.element === t.element_out);
      if (pickIdx !== -1) {
        rawPicks[pickIdx].element = t.element_in;
      }
    }
  }

  const midWeekBankDeltaTenths = midWeekTransfers.reduce(
    (sum: number, t: any) => sum + ((t.element_out_cost || 0) - (t.element_in_cost || 0)),
    0
  );

  rawPicks.sort((a, b) => a.position - b.position);

  let captainId = "";
  let viceCaptainId = "";
  for (const pick of rawPicks) {
    if (pick.is_captain) captainId = String(pick.element);
    if (pick.is_vice_captain) viceCaptainId = String(pick.element);
  }

  const finalBankTenths = initialBankTenths + midWeekBankDeltaTenths;

  return {
    picks: rawPicks,
    captainId,
    viceCaptainId,
    bankTenths: finalBankTenths,
    inTheBank: Number((finalBankTenths / 10).toFixed(1)),
  };
}

// 3.1 Captain mid-week transfer: incoming player inherits captaincy & multiplier
{
  const picks = [
    { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 10, position: 10, multiplier: 2, is_captain: true, is_vice_captain: false }, // Captain
    { element: 11, position: 11, multiplier: 1, is_captain: false, is_vice_captain: true },  // Vice-Captain
    { element: 12, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false }, // Sub GK (pos 12, order 0)
    { element: 13, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false }, // Sub Outfield 1 (pos 13, order 1)
  ];

  const transfers = [
    {
      event: 11,
      time: "2024-11-05T12:00:00Z",
      element_out: 10,
      element_in: 99,
      element_out_cost: 150,
      element_in_cost: 130, // +20 tenths (+£2.0m)
    },
  ];

  const res = simulateMidWeekTransfers(picks, transfers, 10, 15); // initial bank 1.5m (15 tenths)
  const incomingPick = res.picks.find((p) => p.element === 99);

  assertEquals(incomingPick?.position, 10, "3.1 Incoming player occupies position 10");
  assertEquals(incomingPick?.is_captain, true, "3.1 Incoming player inherits is_captain=true");
  assertEquals(incomingPick?.multiplier, 2, "3.1 Incoming player inherits multiplier=2");
  assertEquals(res.captainId, "99", "3.1 captainId correctly points to incoming element 99");
  assertEquals(res.viceCaptainId, "11", "3.1 viceCaptainId unchanged");
  assertEquals(res.inTheBank, 3.5, "3.1 Bank increased from 1.5 to 3.5 (+£2.0m delta)");
}

// 3.2 Bench player mid-week transfer: incoming player inherits exact bench priority
{
  const picks = [
    { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 12, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false }, // Sub GK (order 0)
    { element: 13, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false }, // Bench 1 (order 1)
    { element: 14, position: 14, multiplier: 0, is_captain: false, is_vice_captain: false }, // Bench 2 (order 2)
    { element: 15, position: 15, multiplier: 0, is_captain: false, is_vice_captain: false }, // Bench 3 (order 3)
  ];

  const transfers = [
    {
      event: 11,
      time: "2024-11-05T12:00:00Z",
      element_out: 14, // Replace Bench 2
      element_in: 77,
      element_out_cost: 45,
      element_in_cost: 50, // -5 tenths (-£0.5m)
    },
  ];

  const res = simulateMidWeekTransfers(picks, transfers, 10, 10);
  const benchPick = res.picks.find((p) => p.element === 77);

  assertEquals(benchPick?.position, 14, "3.2 Incoming player placed at pos 14");
  const isBench = (benchPick?.position || 0) > 11;
  const benchOrder = isBench ? (benchPick?.position || 0) - 12 : undefined;
  assertEquals(isBench, true, "3.2 Incoming player marked isBench=true");
  assertEquals(benchOrder, 2, "3.2 Incoming player inherits benchOrder=2 (Sub Outfield 2)");
  assertEquals(res.inTheBank, 0.5, "3.2 Bank adjusted from 1.0 to 0.5 (-£0.5m delta)");
}

// 3.3 Multiple mid-week transfers: sequential chained transfers on the same position
{
  const picks = [
    { element: 100, position: 5, multiplier: 1, is_captain: false, is_vice_captain: false },
    { element: 200, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false },
  ];

  // Manager buys 101, then changes mind and buys 102
  const transfers = [
    {
      event: 11,
      time: "2024-11-05T10:00:00Z",
      element_out: 100,
      element_in: 101,
      element_out_cost: 60,
      element_in_cost: 60,
    },
    {
      event: 11,
      time: "2024-11-05T14:00:00Z",
      element_out: 101,
      element_in: 102,
      element_out_cost: 60,
      element_in_cost: 55, // +5 tenths
    },
  ];

  const res = simulateMidWeekTransfers(picks, transfers, 10, 0);
  assertEquals(res.picks.length, 2, "3.3 Squad size remains exactly 2");
  assertEquals(res.picks.find((p) => p.element === 102)?.position, 5, "3.3 Final chained transfer occupies position 5");
  assertEquals(res.picks.find((p) => p.element === 100), undefined, "3.3 Original element 100 removed");
  assertEquals(res.picks.find((p) => p.element === 101), undefined, "3.3 Intermediate element 101 replaced");
  assertEquals(res.inTheBank, 0.5, "3.3 Bank reflects cumulative delta (+£0.5m)");
}

// 3.4 Simultaneous Captain transfer AND Bench transfer
{
  const picks = [
    { element: 10, position: 10, multiplier: 2, is_captain: true, is_vice_captain: false },
    { element: 15, position: 15, multiplier: 0, is_captain: false, is_vice_captain: false },
  ];

  const transfers = [
    {
      event: 11,
      time: "2024-11-05T09:00:00Z",
      element_out: 10,
      element_in: 50,
      element_out_cost: 140,
      element_in_cost: 150, // -10 tenths
    },
    {
      event: 11,
      time: "2024-11-05T10:00:00Z",
      element_out: 15,
      element_in: 60,
      element_out_cost: 45,
      element_in_cost: 40, // +5 tenths
    },
  ];

  const res = simulateMidWeekTransfers(picks, transfers, 10, 20); // initial 2.0m
  assertEquals(res.captainId, "50", "3.4 Captain updated to element 50");
  const p50 = res.picks.find((p) => p.element === 50);
  assertEquals(p50?.position, 10, "3.4 Captain position is 10");
  assertEquals(p50?.multiplier, 2, "3.4 Captain multiplier is 2");

  const p60 = res.picks.find((p) => p.element === 60);
  assertEquals(p60?.position, 15, "3.4 Bench position is 15");
  assertEquals(p60?.is_captain, false, "3.4 Bench player is not captain");
  assertEquals(res.inTheBank, 1.5, "3.4 Bank reflects net -5 tenths (-£0.5m -> 1.5m)");
}


// ============================================================================
// SUITE 4: FREE TRANSFERS 2024/25 RULES STRESS TESTING
// ============================================================================
console.log("\n=======================================================");
console.log("SUITE 4: Free Transfers 2024/25 Rules Stress Testing");
console.log("=======================================================");

// 4.1 Empty / corrupted historyData handling
assertEquals(calculateFreeTransfersAvailable(null), 1, "4.1 Null historyData returns 1 FT");
assertEquals(calculateFreeTransfersAvailable({}), 1, "4.1 Missing history.current returns 1 FT");
assertEquals(calculateFreeTransfersAvailable({ current: "not-an-array" }), 1, "4.1 Non-array history.current returns 1 FT");

// 4.2 Standard rollover without transfers (caps at 5)
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 },
      { event: 3, event_transfers: 0, event_transfers_cost: 0 },
      { event: 4, event_transfers: 0, event_transfers_cost: 0 },
      { event: 5, event_transfers: 0, event_transfers_cost: 0 },
      { event: 6, event_transfers: 0, event_transfers_cost: 0 },
      { event: 7, event_transfers: 0, event_transfers_cost: 0 },
    ],
    chips: [],
  };
  assertEquals(calculateFreeTransfersAvailable(historyData), 5, "4.2 Banked FT caps at 5 (even after 7 inactive GWs)");
}

// 4.3 Wildcard chip preservation: preserves accumulated FT without adding +1
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 }, // rolls to 2
      { event: 3, event_transfers: 0, event_transfers_cost: 0 }, // rolls to 3
      { event: 4, event_transfers: 0, event_transfers_cost: 0 }, // rolls to 4
      { event: 5, event_transfers: 15, event_transfers_cost: 0 }, // Wildcard played! Should stay 4, NOT become 5
    ],
    chips: [{ name: "wildcard", event: 5 }],
  };
  assertEquals(calculateFreeTransfersAvailable(historyData), 4, "4.3 Wildcard preserves banked FT (stays 4, NOT 5)");
}

// 4.4 Free Hit chip preservation: preserves accumulated FT without adding +1
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 }, // rolls to 2
      { event: 3, event_transfers: 11, event_transfers_cost: 0 }, // Free Hit played! Should stay 2, NOT become 3
    ],
    chips: [{ name: "freehit", event: 3 }],
  };
  assertEquals(calculateFreeTransfersAvailable(historyData), 2, "4.4 Free Hit preserves banked FT (stays 2, NOT 3)");
}

// 4.5 Hits taken properly deducted from transfers made
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      // Manager had 1 FT. Made 3 transfers costing 8 pts (2 hits).
      // Free transfers used = 3 - 2 = 1 FT.
      // available_ft = max(0, 1 - 1) + 1 = 1 FT.
      { event: 2, event_transfers: 3, event_transfers_cost: 8 },
    ],
    chips: [],
  };
  assertEquals(calculateFreeTransfersAvailable(historyData), 1, "4.5 Hit calculation: 3 transfers with 2 hits uses 1 FT -> 1 FT for next GW");
}

// 4.6 Mid-week transfers deducted from available FTs for nextEvent
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 }, // 2 FT
      { event: 3, event_transfers: 0, event_transfers_cost: 0 }, // 3 FT
    ],
    chips: [],
  };
  const transfersData = [
    { event: 4, element_in: 10, element_out: 20 },
    { event: 4, element_in: 11, element_out: 21 },
  ];
  // Going into GW4 (nextEvent=4), manager had 3 FT, used 2 mid-week -> 1 FT remaining
  assertEquals(calculateFreeTransfersAvailable(historyData, transfersData, 3), 1, "4.6 2 mid-week transfers deducted (3 FT -> 1 FT)");
}

// 4.7 Mid-week transfers cannot reduce available FTs below 0
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 1, event_transfers_cost: 0 }, // 1 FT used -> 1 FT left
    ],
    chips: [],
  };
  const transfersData = [
    { event: 3, element_in: 10, element_out: 20 },
    { event: 3, element_in: 11, element_out: 21 },
    { event: 3, element_in: 12, element_out: 22 },
  ];
  // Had 1 FT, made 3 transfers -> bottoms out at 0 (not negative)
  assertEquals(calculateFreeTransfersAvailable(historyData, transfersData, 2), 0, "4.7 Excess mid-week transfers bottom out at 0 (never negative)");
}

// 4.8 Mid-week transfers NOT deducted if nextEvent has Wildcard active
{
  const historyData = {
    current: [
      { event: 1, event_transfers: 0, event_transfers_cost: 0 },
      { event: 2, event_transfers: 0, event_transfers_cost: 0 }, // 2 FT
    ],
    chips: [{ name: "wildcard", event: 3 }],
  };
  const transfersData = [
    { event: 3, element_in: 10, element_out: 20 },
    { event: 3, element_in: 11, element_out: 21 },
  ];
  // Next event has Wildcard active -> transfers are unlimited/free -> FT not deducted
  assertEquals(calculateFreeTransfersAvailable(historyData, transfersData, 2), 2, "4.8 Mid-week transfers not deducted when Wildcard active for nextEvent");
}


// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log("\n=======================================================");
console.log(`TOTAL ADVERSARIAL STRESS TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log("=======================================================");

if (failedTests > 0) {
  console.error("\nFAILURES ENCOUNTERED:");
  for (const f of failureDetails) {
    console.error(` - ${f}`);
  }
  process.exit(1);
} else {
  console.log("\nALL ADVERSARIAL STRESS TESTS PASSED EMPIRICALLY!");
  process.exit(0);
}
