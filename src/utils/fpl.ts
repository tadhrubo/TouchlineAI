/**
 * FPL Team Code Mapping & Official Kit URL Generator
 */

export const TEAM_CODE_MAP: Record<string, number> = {
  ARS: 3,
  AVL: 7,
  BOU: 91,
  BRE: 94,
  BHA: 36,
  CHE: 8,
  COV: 9,
  CRY: 31,
  EVE: 11,
  FUL: 54,
  HUL: 88,
  IPS: 40,
  LEE: 2,
  LIV: 14,
  MCI: 43,
  MUN: 1,
  NEW: 4,
  NFO: 17,
  TOT: 6,
  SUN: 56,
  LEI: 13,
  SOU: 20,
  WHU: 21,
  WOL: 39,
};

/**
 * Returns the official FPL CDN kit graphic URL for a given club short name or code.
 * Pattern: https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{teamCode}{isGK ? '_1' : ''}-110.webp
 */
export function getFplKitUrl(
  teamShortOrCode?: string | number,
  isGK: boolean = false
): string {
  let code = 3; // Default to Arsenal

  if (typeof teamShortOrCode === "number") {
    code = teamShortOrCode;
  } else if (typeof teamShortOrCode === "string") {
    code = TEAM_CODE_MAP[teamShortOrCode.toUpperCase()] || 3;
  }

  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${code}${
    isGK ? "_1" : ""
  }-110.webp`;
}
