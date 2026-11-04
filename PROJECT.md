# Project: Touchline AI - Official FPL Ground-Truth Audit

## Architecture
Touchline AI is a Next.js (App Router) Fantasy Premier League analytics platform. The application architecture consists of:
- **Core Engine Layer**: `src/services/fpl.ts`, `src/types/fpl.ts`, `src/services/optimizer.ts` interfacing with the official FPL REST API and Supabase cache.
- **API Route Layer**: `src/app/api/` providing server-side aggregation for leagues, fixtures, squad telemetry, and transfer planning.
- **UI & Presentation Layer**: React components (`src/components/`) rendering squad pitch cards, points tab, planner tab, transfer modals, and FDR ticker views.
- **Verification Infrastructure**: Test scripts running directly via Node/tsx executing ground-truth assertions against live FPL telemetry for target squad 1482998.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Player & SquadData Types | Add `sellingPrice`, `purchasePrice`, `status`, `news`, `chanceOfPlaying` to `Player`; add `sellingValue`, `liquidationBudget`, `chipsUsed` to `SquadData` / `TeamStats` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Free Transfers Chip Preservation | Preserve banked FTs across Wildcard/Free Hit chip weeks without +1 increment; subtract mid-week transfers for `nextEvent` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Purchase & 50% Profit Selling Price | Fetch `transfers/` endpoint, calculate `buyTenths`, compute integer tenths selling price with 50% profit rule, calculate `sellingValue` (£97.0m), `liquidationBudget` (£100.5m), and `teamValue` (£102.2m) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Medical Flags & Provisional Live BPS | Map raw FPL statuses to union types, populate news and chance of playing (producing 2 squad alerts), compute provisional BPS for active fixtures | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Transfer Modal Budget & Dual Price | Use `sellingPrice` in `maxBudget`, display Selling Price and Market Price in subtitle, satisfy `Player` typing in fallbacks | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Planner Tab Bank Math | Track initial squad IDs, credit `sellingPrice` on outgoing initial players, debit `price` on incoming players; preserve initial bank (£3.5m) at 0 transfers | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Planner Chip Tracking | Connect chip history (`chipsUsed`), disable consumed chips (3xc GW3, WC GW5), allow toggling available chips (WC, FH) to zero hits | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Optimizer Status & Selling Price | Filter out non-available candidates, use dynamic `nextEvent`, evaluate budget delta using `sellingPrice` | M2 | ORIGINAL_REQUEST §R2 |
| 9 | PlayerCard Medical Warning Badge | Render warning badge for `player.status && player.status !== "available"` (rose for injured/0%, amber for doubtful/50% with news tooltip) | M3 | ORIGINAL_REQUEST §R3 |
| 10 | PlayerCard Upcoming Fixture Pill | Render `{opponent} ({isHome ? "H" : "A"})` with FDR difficulty color coding (1-5) matching `getFdrStyle` | M3 | ORIGINAL_REQUEST §R3 |
| 11 | PlayerCard Selling Price Display | Display `£{(player.sellingPrice ?? player.price).toFixed(1)}m` in tabular-nums complying with UI Engineering rules | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Double Gameweek Support in Fixtures | Replace `find` with `filter` to preserve all matches in DGW, returning `matches`, `isDGW`, `isBGW`, and backward-compatible `match` | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Multi-Candidate Bench Autosub Loop | Iterate bench outfielders B1 -> B2 -> B3, subbing first candidate with `minutes > 0` maintaining legal formation (1 GKP, >=3 DEF, >=2 MID, >=1 FWD) using active lineup accumulator | M4 | ORIGINAL_REQUEST §R4 |
| 14 | Vice-Captain Multiplier Fallback | Transfer captain multiplier (2 or 3) to Vice-Captain when Captain finishes with 0 minutes, setting Captain multiplier to 0 | M4 | ORIGINAL_REQUEST §R4 |
| 15 | Ground-Truth Verification Suite | Automated test script asserting target squad 1482998 ground truth: FT === 4, sellingValue === 97.0, bank === 3.5, liquidationBudget === 100.5, teamValue === 102.2, player selling prices, 2 medical alerts, tsc exit 0 | M5 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Financial, Transfer & Medical Engine | `src/types/fpl.ts`, `src/services/fpl.ts`, `src/app/api/league/[leagueId]/route.ts` | none | DONE |
| 2 | Downstream Budget, Planner & Optimizer Consumers | `src/components/fpl/TransferModal.tsx`, `src/components/planner/PlannerTab.tsx`, `src/services/optimizer.ts` | M1 | IN_PROGRESS |
| 3 | Pitch Cards UI & Double Gameweek Ticker | `src/components/fpl/PlayerCard.tsx`, `src/app/api/fixtures/route.ts`, `src/components/fixtures/FDRTickerView.tsx` | M1 | IN_PROGRESS |
| 4 | Official FPL Autosubs & Vice-Captain Fallback | `src/components/points/PointsTab.tsx` | none | DONE |
| 5 | Ground-Truth Audit & Verification Suite | `scripts/verify_audit_squad.ts`, E2E test suite | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### M1 Exported Contracts
- `src/types/fpl.ts`:
  ```typescript
  export interface Player {
    // Existing fields...
    sellingPrice: number;
    purchasePrice: number;
    status: "available" | "injured" | "doubtful" | "suspended" | "unavailable";
    news?: string;
    chanceOfPlaying?: number | null;
  }

  export interface SquadData {
    stats: TeamStats;
    players: Player[];
    captainId: string;
    viceCaptainId: string;
    formation: string;
    sellingValue: number;
    liquidationBudget: number;
    chipsUsed: { name: string; event: number; time: string }[];
    ft_available?: number;
    ftAvailable?: number;
  }

  export interface TeamStats {
    // Existing fields...
    sellingValue: number;
    liquidationBudget: number;
    chipsUsed: { name: string; event: number; time: string }[];
  }
  ```
- `src/services/fpl.ts`:
  - `fetchManagerSquad(cleanId: string): Promise<ManagerSquadResponse>` returns populated `sellingValue`, `liquidationBudget`, `chipsUsed`, and players with `sellingPrice`, `purchasePrice`, `status`, `news`, `chanceOfPlaying`.
  - `calculateFreeTransfersAvailable(historyData: any, transfersData?: any[], currentEvent?: number): number` returns exact banked FT (4 for squad 1482998).

### M3 Exported Contracts
- `src/app/api/fixtures/route.ts`:
  ```typescript
  export interface TeamFDRCell {
    event: number;
    match: TeamFDRMatch | null; // Backward compatibility
    matches: TeamFDRMatch[];    // Full DGW support
    isDGW: boolean;
    isBGW: boolean;
  }
  ```

## Code Layout
- `src/types/fpl.ts`: Shared domain interfaces (Player, TeamStats, SquadData). Exclusive write ownership: M1 Worker.
- `src/services/fpl.ts`: FPL REST API client, pricing & FT engine. Exclusive write ownership: M1 Worker.
- `src/app/api/league/[leagueId]/route.ts`: League endpoint FT sync. Exclusive write ownership: M1 Worker.
- `src/components/fpl/TransferModal.tsx`: Transfer modal UI & budget validation. Exclusive write ownership: M2 Worker.
- `src/components/planner/PlannerTab.tsx`: Transfer planner, bank calculation, chip tracking. Exclusive write ownership: M2 Worker.
- `src/services/optimizer.ts`: Transfer optimization engine. Exclusive write ownership: M2 Worker.
- `src/components/fpl/PlayerCard.tsx`: Pitch card component, medical badge, fixture pill. Exclusive write ownership: M3 Worker.
- `src/app/api/fixtures/route.ts`: Fixtures and FDR ticker API. Exclusive write ownership: M3 Worker.
- `src/components/fixtures/FDRTickerView.tsx`: FDR ticker UI. Exclusive write ownership: M3 Worker.
- `src/components/points/PointsTab.tsx`: Points tab, autosubs loop, vice-captain fallback. Exclusive write ownership: M4 Worker.
- `scripts/verify_audit_squad.ts`: Ground-truth verification script. Exclusive write ownership: M5 Worker.
