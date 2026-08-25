/**
 * LiveFPL Performance Badge Utility
 * Returns the exact LiveFPL status emoji or null based on match points, minutes, and EO.
 */

export interface BadgeLegendItem {
  emoji: string;
  title: string;
  description: string;
}

export const BADGE_LEGEND_ITEMS: BadgeLegendItem[] = [
  {
    emoji: "🎲",
    title: "Diff to play",
    description: "Low EO (< 20%), yet to play",
  },
  {
    emoji: "⭐",
    title: "Diff hauled",
    description: "Low EO (< 20%) + big points (8+ pts)",
  },
  {
    emoji: "👎",
    title: "Diff flopped",
    description: "Low EO (< 20%) but low points (≤ 3 pts)",
  },
  {
    emoji: "😴",
    title: "Template",
    description: "High EO (> 30%), small rank gain (4–7 pts)",
  },
  {
    emoji: "🕵️‍♂️",
    title: "Spy",
    description: "> 100% Top 10k EO, hurts rank when blanking (≤ 3 pts)",
  },
  {
    emoji: "🔥",
    title: "10+ pts haul",
    description: "Double-digit haul (non-differential)",
  },
  {
    emoji: "🔃",
    title: "Autosub",
    description: "Player substituted in (▲) or out (▼)",
  },
];

export const getPerformanceBadge = (
  points: number, 
  minutes: number, 
  globalOwnership: number = 0, 
  top10kEo?: number,
  isSubbedIn?: boolean, 
  isSubbedOut?: boolean
): string | null => {
  // Use Top 10k EO if available, otherwise fallback to global ownership
  const eo = top10kEo !== undefined && top10kEo > 0 ? top10kEo : globalOwnership;
  
  const hasPlayed = minutes > 0;
  const isDifferential = eo < 20.0;
  const isSpy = eo > 100.0;

  // 🔃 Autosub: subbed in or out
  if (isSubbedIn || isSubbedOut) return "🔃";
  
  // 🎲 Diff to play: low EO, yet to play
  if (isDifferential && !hasPlayed) return "🎲";
  
  // ⭐ Diff hauled: low EO + big points (8+)
  if (isDifferential && points >= 8) return "⭐";
  
  // 👎 Diff flopped: low EO but low pts (<= 3)
  if (isDifferential && hasPlayed && points <= 3) return "👎";
  
  // 🔥 10+ pts haul (not differential)
  if (!isDifferential && points >= 10) return "🔥";
  
  // 🕵️‍♂️ Spy: >100% EO, hurts rank (scored <= 3)
  if (isSpy && hasPlayed && points <= 3) return "🕵️‍♂️";

  // 😴 Template: high EO, small gain (EO > 30%, pts between 4 and 7)
  if (eo > 30.0 && points > 3 && points < 8) return "😴";
  
  return null;
};
