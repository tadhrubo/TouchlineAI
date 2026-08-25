/**
 * Performance Badge Generator for Touchline AI / LiveFPL Experience
 * Generates dynamic badges and status indicators based on real-time Top 10k Effective Ownership (EO),
 * match minutes, and gameweek points.
 */

export interface PerformanceBadge {
  emoji: string;
  label: string;
  description: string;
  type: "template" | "spy" | "differential_hero" | "differential_flop" | "differential" | "neutral";
  colorClass: string;
}

/**
 * Evaluates player performance against Top 10k Effective Ownership (EO)
 * Prioritizes top10kEo if present; falls back to global ownershipPercent if missing or 0.
 *
 * @param points - Current gameweek points scored
 * @param minutes - Minutes played in current gameweek
 * @param ownershipPercent - Global ownership percentage
 * @param top10kEo - Top 10,000 Effective Ownership (EO) percentage
 * @param isCaptain - Whether the manager captained this player
 */
export const getPerformanceBadge = (
  points: number,
  minutes: number,
  ownershipPercent: number = 0,
  top10kEo?: number,
  isCaptain: boolean = false
): PerformanceBadge | null => {
  // Determine effective EO to evaluate: prioritize top10kEo if valid (>0)
  const effectiveEo = top10kEo != null && top10kEo > 0 ? top10kEo : ownershipPercent;

  // 1. Template Player (EO > 100%)
  if (effectiveEo > 100) {
    // Spy: High ownership template failure (scores <= 3 points after playing)
    if (minutes > 0 && points <= 3) {
      return {
        emoji: "🕵️‍♂️",
        label: "Spy",
        description: `Template blanked (${points} pts with ${effectiveEo.toFixed(0)}% Top 10k EO)`,
        type: "spy",
        colorClass: "bg-amber-950/40 text-amber-300 border-amber-800/60",
      };
    }

    // Standard Template Player
    return {
      emoji: "😴",
      label: "Template",
      description: `High Top 10k EO (${effectiveEo.toFixed(0)}%) - standard safety pick`,
      type: "template",
      colorClass: "bg-blue-950/40 text-blue-300 border-blue-800/60",
    };
  }

  // 2. Differential Player (EO < 20%)
  if (effectiveEo < 20) {
    // Differential Hero: Low EO differential with strong return (>= 6 pts)
    if (points >= 6) {
      return {
        emoji: "⭐",
        label: "Diff Hero",
        description: `Differential haul! ${points} pts with only ${effectiveEo.toFixed(1)}% Top 10k EO`,
        type: "differential_hero",
        colorClass: "bg-emerald-950/40 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
      };
    }

    // Differential Flop: Low EO differential who failed (<= 2 pts after playing >= 60 mins)
    if (minutes >= 60 && points <= 2) {
      return {
        emoji: "👎",
        label: "Diff Flop",
        description: `Differential blank (${points} pts, ${effectiveEo.toFixed(1)}% Top 10k EO)`,
        type: "differential_flop",
        colorClass: "bg-rose-950/40 text-rose-300 border-rose-800/60",
      };
    }

    // Standard Active Differential
    return {
      emoji: "🎲",
      label: "Differential",
      description: `Low Top 10k EO (${effectiveEo.toFixed(1)}%) - rank climber candidate`,
      type: "differential",
      colorClass: "bg-purple-950/40 text-purple-300 border-purple-800/60",
    };
  }

  return null;
};
