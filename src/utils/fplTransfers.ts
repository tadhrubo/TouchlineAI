/**
 * Utility functions for processing and netting Fantasy Premier League transfers.
 */

export interface LeagueTransferItem {
  in: string;
  out: string;
  elementIn?: number;
  elementOut?: number;
  element_in?: number;
  element_out?: number;
  time?: string;
  event?: number;
}

export interface NetTransfer {
  in: string;
  out: string;
  elementIn?: number;
  elementOut?: number;
  time?: string;
}

/**
 * Calculates net/final transfers for a gameweek, eliminating intermediate Wildcard/Free Hit tinkering.
 * 
 * Algorithm:
 * 1. Track all element_in and element_out IDs (or player names if IDs unavailable).
 * 2. If a player appears in BOTH the "in" list and the "out" list for the gameweek,
 *    they were part of "tinkering" and cancel out (removed from both lists).
 * 3. Pair the remaining true "outs" with the remaining true "ins" (matching positions when elementsMap is provided).
 */
export function calculateNetTransfers<T extends LeagueTransferItem | Record<string, any>>(
  transfers: T[],
  elementsMap?: Map<number, any>
): NetTransfer[] {
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return [];
  }

  // Check if any element IDs are present
  const hasElementIds = transfers.some(
    (t) => (t.element_in ?? t.elementIn) !== undefined || (t.element_out ?? t.elementOut) !== undefined
  );

  if (hasElementIds) {
    const rawIns: { id: number; name?: string; time?: string }[] = [];
    const rawOuts: { id: number; name?: string; time?: string }[] = [];

    for (const t of transfers) {
      const elIn = t.element_in ?? t.elementIn;
      const elOut = t.element_out ?? t.elementOut;
      if (elIn !== undefined && elIn !== null) {
        rawIns.push({ id: Number(elIn), name: t.in, time: t.time });
      }
      if (elOut !== undefined && elOut !== null) {
        rawOuts.push({ id: Number(elOut), name: t.out, time: t.time });
      }
    }

    // Multiset cancellation: if a player appears in both rawIns and rawOuts, remove both
    const remainingOuts = [...rawOuts];
    const remainingIns: { id: number; name?: string; time?: string }[] = [];

    for (const inItem of rawIns) {
      const outIdx = remainingOuts.findIndex((outItem) => outItem.id === inItem.id);
      if (outIdx !== -1) {
        // Player was transferred in AND out in the same gameweek (tinkering) - cancel out!
        remainingOuts.splice(outIdx, 1);
      } else {
        remainingIns.push(inItem);
      }
    }

    const getName = (id?: number, fallback?: string): string => {
      if (!id) return fallback || "Unknown";
      if (elementsMap && elementsMap.has(id)) {
        return elementsMap.get(id).web_name || elementsMap.get(id).name || `Player ${id}`;
      }
      return fallback || `Player ${id}`;
    };

    const getPos = (id?: number): number => {
      if (!id || !elementsMap || !elementsMap.has(id)) return 0;
      return elementsMap.get(id).element_type || 0;
    };

    const result: NetTransfer[] = [];
    const unmatchedIns = [...remainingIns];
    const unmatchedOuts = [...remainingOuts];

    // Position-aware pairing: match DEF->DEF, MID->MID, etc. where possible
    if (elementsMap) {
      for (let i = unmatchedOuts.length - 1; i >= 0; i--) {
        const outItem = unmatchedOuts[i];
        const outPos = getPos(outItem.id);
        if (outPos > 0) {
          const inIdx = unmatchedIns.findIndex((inItem) => getPos(inItem.id) === outPos);
          if (inIdx !== -1) {
            const inItem = unmatchedIns[inIdx];
            result.push({
              in: getName(inItem.id, inItem.name),
              out: getName(outItem.id, outItem.name),
              elementIn: inItem.id,
              elementOut: outItem.id,
              time: inItem.time || outItem.time,
            });
            unmatchedOuts.splice(i, 1);
            unmatchedIns.splice(inIdx, 1);
          }
        }
      }
    }

    // Pair remaining items
    const maxLen = Math.max(unmatchedOuts.length, unmatchedIns.length);
    for (let i = 0; i < maxLen; i++) {
      const outItem = unmatchedOuts[i];
      const inItem = unmatchedIns[i];
      result.push({
        in: inItem ? getName(inItem.id, inItem.name) : "None",
        out: outItem ? getName(outItem.id, outItem.name) : "None",
        elementIn: inItem?.id,
        elementOut: outItem?.id,
        time: inItem?.time || outItem?.time,
      });
    }

    return result;
  }

  // Fallback for transfer arrays that only contain string player names (t.in / t.out)
  const rawIns: { name: string; time?: string }[] = [];
  const rawOuts: { name: string; time?: string }[] = [];

  for (const t of transfers) {
    if (t.in) rawIns.push({ name: t.in, time: t.time });
    if (t.out) rawOuts.push({ name: t.out, time: t.time });
  }

  const remainingOuts = [...rawOuts];
  const remainingIns: { name: string; time?: string }[] = [];

  for (const inItem of rawIns) {
    const outIdx = remainingOuts.findIndex(
      (outItem) => outItem.name.trim().toLowerCase() === inItem.name.trim().toLowerCase()
    );
    if (outIdx !== -1) {
      remainingOuts.splice(outIdx, 1);
    } else {
      remainingIns.push(inItem);
    }
  }

  const maxLen = Math.max(remainingOuts.length, remainingIns.length);
  const result: NetTransfer[] = [];

  for (let i = 0; i < maxLen; i++) {
    const outItem = remainingOuts[i];
    const inItem = remainingIns[i];
    result.push({
      in: inItem ? inItem.name : "None",
      out: outItem ? outItem.name : "None",
      time: inItem?.time || outItem?.time,
    });
  }

  return result;
}
