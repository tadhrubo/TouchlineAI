/**
 * Unified expected-points (xP) fallback used whenever the ML model
 * (`player_predictions.projected_points`) has no value for a player.
 */
export function computeFallbackXP(
  totalPts: number,
  currentEvent: number,
  position: "GKP" | "DEF" | "MID" | "FWD"
): number {
  const gw = Math.max(1, currentEvent);
  const avgPtsPerGw = totalPts / gw;

  // Appearance baseline by position (expected points for a full starter)
  const appearanceBaseline: Record<string, number> = {
    GKP: 2.0, // 2 pts + expected save/bonus
    DEF: 2.0, // 2 pts + CS probability ~35%
    MID: 2.0, // 2 pts baseline
    FWD: 2.0, // 2 pts baseline
  };

  // Scaling: regress toward per-GW average with a slight discount for variance
  const scaledReturn = avgPtsPerGw * 0.92;
  const baseline = appearanceBaseline[position] ?? 2.0;

  // Floor: at minimum, expect the appearance baseline if active
  return Number(Math.max(baseline, scaledReturn + baseline * 0.3).toFixed(1));
}

/**
 * Sanitizes and overrides ML model xP predictions which are currently
 * poisoned/suppressed due to feature scale mismatch at inference time.
 * Calculates robust fallback and adjusts for injury/suspension.
 */
export function sanitizeXP(
  totalPts: number,
  currentEvent: number,
  position: "GKP" | "DEF" | "MID" | "FWD",
  chanceOfPlaying: number | null | undefined,
  status: string | undefined
): number {
  let xp = computeFallbackXP(totalPts, currentEvent, position);
  
  if (status === "i" || status === "s" || status === "n" || chanceOfPlaying === 0) {
    return 0.0;
  }
  
  if (chanceOfPlaying != null && chanceOfPlaying < 100) {
    xp = Number((xp * (chanceOfPlaying / 100)).toFixed(1));
  }
  
  return xp;
}
