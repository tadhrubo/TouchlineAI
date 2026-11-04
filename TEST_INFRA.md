# Touchline AI — Test Infrastructure & Ground-Truth Verification

## Overview

Touchline AI utilizes an end-to-end ground-truth verification harness executing against official Fantasy Premier League (FPL) live REST endpoints. This infrastructure ensures the mathematical, financial, medical, and rule-based calculations adhere strictly to the official FPL 2024/25 specification.

The primary target squad for validation is Entry ID `1482998` (Manager: *Tanjid Dhrubo*, Team: *GamesGoneKriraChokro*).

---

## Architecture & Verification Components

```
TouchlineAI/
├── scripts/
│   └── verify_audit_squad.ts        # Executable ground-truth verification test harness
├── src/
│   ├── types/
│   │   └── fpl.ts                   # Domain interfaces (Player, TeamStats, SquadData)
│   ├── services/
│   │   ├── fpl.ts                   # FPL REST client, pricing, FT & medical engine
│   │   └── optimizer.ts             # Transfer optimization engine
│   ├── components/
│   │   ├── fpl/
│   │   │   ├── PlayerCard.tsx       # Pitch card, medical warning badge, fixture pill
│   │   │   └── TransferModal.tsx    # Transfer modal & selling-price budget math
│   │   ├── planner/
│   │   │   └── PlannerTab.tsx       # Transfer planner, bank calculation, chip tracking
│   │   └── points/
│   │       └── PointsTab.tsx        # Autosub loop & vice-captain fallback
│   └── app/
│       └── api/
│           ├── fixtures/route.ts    # DGW/BGW fixture schedules & FDR ticker
│           └── league/[leagueId]/route.ts # League telemetry & FT sync
└── TEST_INFRA.md                    # This document
```

---

## Test Execution Commands

### 1. TypeScript Static Typecheck
Validates project-wide type integrity across all components, API routes, and services.
```bash
npx tsc --noEmit
```
- **Expected Exit Code**: `0`
- **Compiler Options**: TypeScript `5.7.3`, `"strict": true`, `"moduleResolution": "bundler"`

### 2. Squad Ground-Truth Verification Test
Executes the programmatic audit against squad `1482998`.
```bash
npx tsx --env-file=.env.local scripts/verify_audit_squad.ts
```
- **Execution Engine**: `tsx` (TypeScript Execute) with local environment variables loaded
- **Expected Exit Code**: `0` (on all assertions passing) or `1` (on failure)

---

## Verification Gates & Acceptance Criteria

Every milestone must satisfy the verification gates prior to sign-off:

### Gate 1: Type Safety & Compilation
- Command: `npx tsc --noEmit`
- Requirement: Zero compilation errors, clean exit code 0.

### Gate 2: Free Transfers Rule Integrity (Squad 1482998)
- **Specification**: In FPL 2024/25, playing a Wildcard or Free Hit chip preserves banked free transfers without awarding the standard +1 increment.
- **Trace**:
  - GW1: 1 FT (Base)
  - GW2: 2 FT (0 used -> min(5, 1-0+1) = 2)
  - GW3: 1 FT (3 made, 1 hit -> 2 FT used -> min(5, 2-2+1) = 1) [3xc chip played]
  - GW4: 2 FT (0 used -> min(5, 1-0+1) = 2)
  - GW5: 2 FT (**Wildcard chip played**: preserve banked FT -> min(5, 2) = 2)
  - GW6: 3 FT (0 used -> min(5, 2-0+1) = 3)
  - GW7: 2 FT (2 made, 0 hits -> 2 FT used -> min(5, 3-2+1) = 2)
  - GW8: 3 FT (0 used -> min(5, 2-0+1) = 3)
  - GW9: 4 FT (0 used -> min(5, 3-0+1) = 4)
- **Assertion**: `freeTransfers === 4` (or `ftAvailable === 4`).

### Gate 3: Squad Financial Totals (Squad 1482998)
- **Selling Value (`sellingValue`)**: Sum of all 15 player selling prices = `£97.0m` (970 tenths).
- **In The Bank (`inTheBank`)**: Last deadline bank = `£3.5m` (35 tenths).
- **Liquidation Budget (`liquidationBudget`)**: Selling value + in the bank = `£100.5m` (1005 tenths).
- **Team Value (`teamValue`)**: Sum of current player market values + bank = `£102.2m` (1022 tenths).

### Gate 4: Individual Player Selling Prices (50% Profit Rule)
Selling price is computed in integer tenths of millions:
$$\text{sellTenths} = \text{buyTenths} + \lfloor \frac{\text{nowTenths} - \text{buyTenths}}{2} \rfloor \quad (\text{if } \text{nowTenths} > \text{buyTenths})$$

Target player verifications:
| Player | Origin | Buy Price | Now Cost | Profit | Expected Selling Price |
|---|---|---|---|---|---|
| **Tavernier** (BOU) | GW5 transfer | £6.1m (61) | £6.6m (66) | +£0.5m (+5) | **£6.3m** (63) |
| **Haaland** (MCI) | GW1 pick | £15.5m (155) | £15.8m (158) | +£0.3m (+3) | **£15.6m** (156) |
| **Rogers** (CHE) | GW5 transfer | £7.7m (77) | £8.1m (81) | +£0.4m (+4) | **£7.9m** (79) |

### Gate 5: Medical Alert & Health Flags
Player statuses mapped from official FPL bootstrap-static codes (`"i"` -> `"injured"`, `"d"` -> `"doubtful"`, etc.):
- **João Pedro**: status = `"injured"`, chanceOfPlaying = `0%`, news = `"Thigh injury - Unknown return date"`.
- **Thomas**: status = `"doubtful"`, chanceOfPlaying = `50%`, news = `"Calf injury - 50% chance of playing"`.
- **LatestNews Alerts Count**: `squadAlerts.length === 2` (`p.status && p.status !== "available" && p.news`).

---

## Test Output & Diagnostics Format

`scripts/verify_audit_squad.ts` provides structured tabular diagnostic reporting:
- **Header**: Target squad information and manager metadata.
- **Section 1**: Free transfers comparison (Expected vs Actual).
- **Section 2**: Financial totals tabular comparison (Metric, Expected, Actual, Status).
- **Section 3**: Individual player price table (Player, Buy Price, Market Price, Selling Price Expected/Actual, Status).
- **Section 4**: Medical alerts table (Player, Mapped Status, Chance of Playing, News, Status).
- **Section 5**: Chip history summary (Chips used, Gameweeks).
- **Summary**: Explicit pass/fail verdict with actionable error messages on mismatch.
