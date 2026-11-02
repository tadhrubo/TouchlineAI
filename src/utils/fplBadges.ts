/**
 * LiveFPL Performance Badge Utility
 * Returns clean telemetry badge codes and metadata for tactical matchday status.
 */

export interface BadgeLegendItem {
  id: string;
  code: string;
  title: string;
  description: string;
  tone: "accent" | "negative" | "warning" | "muted";
  emoji?: string;
}

export const BADGE_LEGEND_ITEMS: BadgeLegendItem[] = [
  {
    id: "diff_play",
    code: "DIF",
    title: "Differential to Play",
    description: "Low EO (< 20%), yet to play",
    tone: "accent",
    emoji: "DIF",
  },
  {
    id: "diff_haul",
    code: "HAUL",
    title: "Differential Hauled",
    description: "Low EO (< 20%) + big points (8+ pts)",
    tone: "accent",
    emoji: "HAUL",
  },
  {
    id: "diff_flop",
    code: "FLOP",
    title: "Differential Flopped",
    description: "Low EO (< 20%) but low points (≤ 3 pts)",
    tone: "negative",
    emoji: "FLOP",
  },
  {
    id: "template",
    code: "TMPL",
    title: "Template Score",
    description: "High EO (> 30%), small rank gain (4–7 pts)",
    tone: "muted",
    emoji: "TMPL",
  },
  {
    id: "spy",
    code: "SPY",
    title: "Rank Threat (Spy)",
    description: "> 100% Top 10k EO, hurts rank when blanking (≤ 3 pts)",
    tone: "warning",
    emoji: "SPY",
  },
  {
    id: "haul_10",
    code: "10+",
    title: "Double-Digit Haul",
    description: "10+ pts haul (non-differential)",
    tone: "accent",
    emoji: "10+",
  },
  {
    id: "autosub",
    code: "SUB",
    title: "Tactical Autosub",
    description: "Player substituted in (▲) or out (▼)",
    tone: "muted",
    emoji: "SUB",
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
  const eo = top10kEo !== undefined && top10kEo > 0 ? top10kEo : globalOwnership;
  const hasPlayed = minutes > 0;
  const isDifferential = eo < 20.0;
  const isSpy = eo > 100.0;

  if (isSubbedIn || isSubbedOut) return "SUB";
  if (isDifferential && !hasPlayed) return "DIF";
  if (isDifferential && points >= 8) return "HAUL";
  if (isDifferential && hasPlayed && points <= 3) return "FLOP";
  if (!isDifferential && points >= 10) return "10+";
  if (isSpy && hasPlayed && points <= 3) return "SPY";
  if (eo > 30.0 && points > 3 && points < 8) return "TMPL";
  
  return null;
};
