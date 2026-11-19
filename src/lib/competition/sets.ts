/** Scoring by sets (volleyball, tennis, table tennis, badminton, padel...). Pure: no database. */

export type SetsConfig = {
  /** Sets needed to win the match (best of 5 = 3). */
  setsToWin: number;
  pointsPerSet: number;
  /** Target of the deciding set (15 in volleyball, same as a normal set in table tennis). */
  decidingSetPoints: number;
  /** A set needs a two point lead, however long it takes. */
  winByTwo: boolean;
};

export type SetScore = { home: number; away: number };

/** Most sets a match can last. */
export const maxSets = (c: SetsConfig) => 2 * c.setsToWin - 1;

/** Points the set must reach, given the sets already won by each side. */
export function setTarget(
  c: SetsConfig,
  homeSets: number,
  awaySets: number,
): number {
  const deciding = homeSets === c.setsToWin - 1 && awaySets === c.setsToWin - 1;
  return deciding ? c.decidingSetPoints : c.pointsPerSet;
}

/** Whether a set that stands at home x away is over, and who took it. */
export function setWinner(
  c: SetsConfig,
  target: number,
  s: SetScore,
): "HOME" | "AWAY" | null {
  const lead = Math.abs(s.home - s.away);
  const top = Math.max(s.home, s.away);
  if (top < target) return null;
  if (c.winByTwo && lead < 2) return null;
  if (!c.winByTwo && lead < 1) return null;
  return s.home > s.away ? "HOME" : "AWAY";
}

/** Why a finished set score is not valid, or null. */
export function invalidSetReason(
  c: SetsConfig,
  target: number,
  s: SetScore,
): string | null {
  if (
    !Number.isInteger(s.home) ||
    !Number.isInteger(s.away) ||
    s.home < 0 ||
    s.away < 0
  )
    return "Use pontos inteiros, sem números negativos.";
  const top = Math.max(s.home, s.away);
  const low = Math.min(s.home, s.away);
  if (top < target) return `Alguém precisa chegar a ${target} pontos.`;
  if (c.winByTwo) {
    if (top - low < 2) return "É preciso vencer por 2 pontos de diferença.";
    // Past the target the set ends exactly at a two point lead.
    if (top > target && top - low !== 2)
      return `Depois de ${target}, o set termina com 2 pontos de diferença (ex.: ${top}-${top - 2}).`;
  } else {
    if (top !== target)
      return `O set termina quando alguém chega a ${target} pontos.`;
    if (top === low) return "O set não pode terminar empatado.";
  }
  return null;
}

export type SetsOutcome = {
  homeSets: number;
  awaySets: number;
  winner: "HOME" | "AWAY" | null;
  /** The match is decided. */
  complete: boolean;
  error: string | null;
};

/** Evaluates a list of finished sets: who won, and whether the list is a legal match. */
export function evaluateSets(
  c: SetsConfig,
  sets: readonly SetScore[],
): SetsOutcome {
  let home = 0;
  let away = 0;
  for (let i = 0; i < sets.length; i++) {
    if (home === c.setsToWin || away === c.setsToWin) {
      return {
        homeSets: home,
        awaySets: away,
        winner: home > away ? "HOME" : "AWAY",
        complete: true,
        error: `O jogo já terminou antes do set ${i + 1}.`,
      };
    }
    const reason = invalidSetReason(c, setTarget(c, home, away), sets[i]);
    if (reason)
      return {
        homeSets: home,
        awaySets: away,
        winner: null,
        complete: false,
        error: `Set ${i + 1}: ${reason}`,
      };
    if (sets[i].home > sets[i].away) home++;
    else away++;
  }
  const done = home === c.setsToWin || away === c.setsToWin;
  return {
    homeSets: home,
    awaySets: away,
    winner: done ? (home > away ? "HOME" : "AWAY") : null,
    complete: done,
    error: null,
  };
}

export type LiveSets = {
  /** Sets already decided. */
  finished: SetScore[];
  /** The set being played (0 x 0 right after one ends). */
  current: SetScore;
  homeSets: number;
  awaySets: number;
  /** Points the current set must reach. */
  target: number;
  /** The match is decided. */
  complete: boolean;
};

/**
 * Point by point: given every set (the last one may be in progress), tells
 * the live state. A set closes by itself when it is won.
 */
export function liveState(c: SetsConfig, sets: readonly SetScore[]): LiveSets {
  const finished: SetScore[] = [];
  let home = 0;
  let away = 0;
  let current: SetScore = { home: 0, away: 0 };
  for (const s of sets) {
    if (home === c.setsToWin || away === c.setsToWin) break;
    const winner = setWinner(c, setTarget(c, home, away), s);
    if (winner) {
      finished.push(s);
      if (winner === "HOME") home++;
      else away++;
      current = { home: 0, away: 0 };
    } else {
      current = s;
    }
  }
  const complete = home === c.setsToWin || away === c.setsToWin;
  return {
    finished,
    current: complete ? { home: 0, away: 0 } : current,
    homeSets: home,
    awaySets: away,
    target: setTarget(c, home, away),
    complete,
  };
}

/** Totals used by the standings: points scored across all sets. */
export function pointTotals(sets: readonly SetScore[]): {
  home: number;
  away: number;
} {
  return sets.reduce(
    (t, s) => ({ home: t.home + s.home, away: t.away + s.away }),
    { home: 0, away: 0 },
  );
}

/** Ratio for tiebreakers: no division by zero (a side that never lost ranks above every finite ratio). */
export function ratio(gained: number, lost: number): number {
  if (lost === 0) return gained === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.round((gained / lost) * 1e9) / 1e9;
}
