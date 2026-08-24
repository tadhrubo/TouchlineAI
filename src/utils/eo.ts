import { Player } from "@/types/fpl";

export type SampleTier =
  | "TOP_10K_NEAR_U"
  | "TOP_10K"
  | "NEAR_U"
  | "ELITE"
  | "NO_EO";

export interface SampleTierOption {
  id: SampleTier;
  label: string;
  description: string;
}

export const SAMPLE_TIER_OPTIONS: SampleTierOption[] = [
  {
    id: "TOP_10K_NEAR_U",
    label: "Top 10k + Near U",
    description: "Dual metric showing Top 10,000 and Near Your Rank ownership",
  },
  {
    id: "TOP_10K",
    label: "Top 10k",
    description: "Effective Ownership across the top 10,000 ranked managers",
  },
  {
    id: "NEAR_U",
    label: "Near You",
    description: "Effective Ownership among managers within ±5,000 of your rank",
  },
  {
    id: "ELITE",
    label: "Elite 1k",
    description: "Effective Ownership among all-time top 1,000 hall of fame managers",
  },
  {
    id: "NO_EO",
    label: "No EO (Raw)",
    description: "Disable EO display and show standard price & form only",
  },
];

export interface EOResult {
  top10k?: number;
  nearU?: number;
  single?: number;
  displayText: string;
}

/**
 * Calculates simulated Effective Ownership (xEO) based on player metrics,
 * captaincy propensity, fixture difficulty, and sample tier.
 */
export function calculateXEO(
  player: Player,
  tier: SampleTier,
  userRank: number = 250000
): EOResult | null {
  if (tier === "NO_EO") return null;

  const baseOwnership = player.selectedByPercent || 5.0;
  const price = player.price || 5.0;
  const xP = player.projectedPoints || 4.0;
  const fdr = player.currentFixture?.difficulty || 3;
  const isHome = player.currentFixture?.isHome ?? true;

  // Captaincy propensity multiplier (premiums with favorable fixtures get heavy captaincy in competitive tiers)
  let capPropensity = 0;
  if (price >= 11.5 && xP >= 6.0) {
    capPropensity = isHome && fdr <= 3 ? 0.65 : 0.45;
  } else if (price >= 9.0 && xP >= 5.5) {
    capPropensity = isHome && fdr <= 2 ? 0.40 : 0.20;
  } else if (xP >= 6.5) {
    capPropensity = 0.30;
  }

  // Top 10k effective ownership multiplier (template concentration)
  const top10kMultiplier = price >= 8.0 || xP >= 5.5 ? 1.65 : 1.15;
  const rawTop10kEO = Math.min(
    195.0,
    baseOwnership * top10kMultiplier + capPropensity * 100
  );
  const top10kEO = Number(Math.max(0.5, rawTop10kEO).toFixed(1));

  // Near You multiplier (closer to user rank tier)
  const rankFactor = Math.min(2.0, Math.max(0.8, 1.0 + (500000 - userRank) / 1000000));
  const rawNearUEO = Math.min(
    170.0,
    baseOwnership * rankFactor + capPropensity * 65
  );
  const nearUEO = Number(Math.max(0.5, rawNearUEO).toFixed(1));

  // Elite 1k multiplier (highest template concentration)
  const eliteMultiplier = price >= 8.0 || xP >= 5.5 ? 2.0 : 0.9;
  const rawEliteEO = Math.min(
    198.0,
    baseOwnership * eliteMultiplier + capPropensity * 120
  );
  const eliteEO = Number(Math.max(0.5, rawEliteEO).toFixed(1));

  if (tier === "TOP_10K_NEAR_U") {
    return {
      top10k: top10kEO,
      nearU: nearUEO,
      displayText: `10k: ${top10kEO}% · Near: ${nearUEO}%`,
    };
  }

  if (tier === "TOP_10K") {
    return {
      single: top10kEO,
      displayText: `xEO: ${top10kEO}%`,
    };
  }

  if (tier === "NEAR_U") {
    return {
      single: nearUEO,
      displayText: `xEO: ${nearUEO}%`,
    };
  }

  if (tier === "ELITE") {
    return {
      single: eliteEO,
      displayText: `Elite: ${eliteEO}%`,
    };
  }

  return null;
}

/**
 * Calculates the Template Overlap % between the manager's active starting XI
 * and the theoretical top 10k consensus template.
 */
export function calculateTemplateOverlap(startingXI: Player[]): number {
  if (!startingXI || startingXI.length === 0) return 0;

  // Weight each player's ownership & projection to compute consensus template alignment
  let score = 0;
  startingXI.forEach((p) => {
    const ownershipWeight = Math.min(1.0, (p.selectedByPercent || 5) / 35.0);
    const formWeight = Math.min(1.0, (p.projectedPoints || 4) / 7.0);
    score += ownershipWeight * 0.65 + formWeight * 0.35;
  });

  const percent = (score / startingXI.length) * 100;
  return Number(Math.min(96.0, Math.max(18.0, percent)).toFixed(1));
}
