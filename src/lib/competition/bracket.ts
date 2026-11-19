export type Slot = "HOME" | "AWAY";
export type PlannedMatch = {
  key: string;
  round: number;
  position: number;
  label: string;
  home: string | null;
  away: string | null;
  next: { key: string; slot: Slot } | null;
  loser: { key: string; slot: Slot } | null;
};

const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(n));

/** Seed numbers in bracket order: 1 meets the last, 2 the second to last, apart from each other. */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const m = order.length * 2;
    order = order.flatMap((x) => [x, m + 1 - x]);
  }
  return order;
}

function roundLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quartas de final";
  if (fromEnd === 3) return "Oitavas de final";
  if (fromEnd === 4) return "16 avos de final";
  if (fromEnd === 5) return "32 avos de final";
  return `Rodada ${round}`;
}

export const matchKey = (round: number, position: number) =>
  `${round}:${position}`;
export const THIRD_PLACE_KEY = "third";

/**
 * Single elimination for `order` (best seed first). The top seeds get byes
 * when the count is not a power of two; byes produce no match, the team goes
 * straight to the next round.
 */
export function buildSingleElimination(
  order: readonly string[],
  thirdPlace: boolean,
  options: { adjacent?: boolean } = {},
): PlannedMatch[] {
  const n = order.length;
  if (n < 2) return [];
  const size = nextPowerOfTwo(n);
  const rounds = Math.log2(size);
  // Adjacent pairing keeps a bracket that a previous stage already laid out
  // (slot 1 plays slot 2, slot 3 plays slot 4...). Only valid without byes.
  const seeds =
    options.adjacent && size === n
      ? Array.from({ length: size }, (_, i) => i + 1)
      : seedOrder(size);
  const teamAtSeed = (seed: number) => (seed <= n ? order[seed - 1] : null);

  const matches = new Map<string, PlannedMatch>();
  for (let r = 1; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let p = 0; p < count; p++) {
      matches.set(matchKey(r, p), {
        key: matchKey(r, p),
        round: r,
        position: p,
        label: roundLabel(r, rounds),
        home: null,
        away: null,
        next:
          r < rounds
            ? {
                key: matchKey(r + 1, Math.floor(p / 2)),
                slot: p % 2 === 0 ? "HOME" : "AWAY",
              }
            : null,
        loser: null,
      });
    }
  }

  const dropped = new Set<string>();
  for (let p = 0; p < size / 2; p++) {
    const m = matches.get(matchKey(1, p))!;
    const home = teamAtSeed(seeds[2 * p]);
    const away = teamAtSeed(seeds[2 * p + 1]);
    if (home && away) {
      m.home = home;
      m.away = away;
    } else {
      // Bye: the only team moves on.
      dropped.add(m.key);
      const team = home ?? away;
      const target = matches.get(m.next!.key)!;
      if (m.next!.slot === "HOME") target.home = team;
      else target.away = team;
    }
  }

  if (thirdPlace && rounds >= 2) {
    const semis = [
      matches.get(matchKey(rounds - 1, 0))!,
      matches.get(matchKey(rounds - 1, 1))!,
    ];
    if (semis.every((s) => !dropped.has(s.key))) {
      matches.set(THIRD_PLACE_KEY, {
        key: THIRD_PLACE_KEY,
        round: rounds,
        position: 1,
        label: "Disputa de 3º lugar",
        home: null,
        away: null,
        next: null,
        loser: null,
      });
      semis[0].loser = { key: THIRD_PLACE_KEY, slot: "HOME" };
      semis[1].loser = { key: THIRD_PLACE_KEY, slot: "AWAY" };
    }
  }

  return [...matches.values()].filter((m) => !dropped.has(m.key));
}

export type RoundPlan = {
  /** The matches of this single round, in bracket order. */
  matches: PlannedMatch[];
  /** Teams that skip the round (byes), with the bracket slot they occupy. */
  byes: { position: number; team: string }[];
  /** Matches of a bracket slot position, to rebuild the next stage's order. */
  slots: number;
  /** Optional third-place match, played by the losers of a two-match round. */
  third: PlannedMatch | null;
};

/**
 * One knockout round only: used when the next stage is also a knockout (for
 * example "Quartas", then "Semifinal", then "Final" as separate stages). The
 * winners, and the teams with a bye, continue to the next stage in slot order.
 */
export function planRound(
  order: readonly string[],
  thirdPlace: boolean,
  options: { adjacent?: boolean } = {},
): RoundPlan {
  const full = buildSingleElimination(order, false, options);
  const size = nextPowerOfTwo(Math.max(order.length, 2));
  const rounds = Math.log2(size);
  const first: PlannedMatch[] = full
    .filter((m) => m.round === 1)
    .map((m) => ({ ...m, next: null, loser: null }));
  const inMatch = new Set(first.flatMap((m) => [m.home, m.away]));
  const byes: { position: number; team: string }[] = [];
  if (order.length < size) {
    // A bye is the team of a round-1 slot pair with no match; find its slot position.
    const kept = new Set(first.map((m) => m.position));
    const seeds =
      options.adjacent && size === order.length
        ? Array.from({ length: size }, (_, i) => i + 1)
        : seedOrder(size);
    for (let p = 0; p < size / 2; p++) {
      if (kept.has(p)) continue;
      const team = [seeds[2 * p], seeds[2 * p + 1]]
        .map((sd) => (sd <= order.length ? order[sd - 1] : null))
        .find((t) => t && !inMatch.has(t));
      if (team) byes.push({ position: p, team });
    }
  }
  let third: PlannedMatch | null = null;
  if (thirdPlace && first.length === 2 && rounds >= 2) {
    third = {
      key: THIRD_PLACE_KEY,
      round: 2,
      position: 0,
      label: "Disputa de 3º lugar",
      home: null,
      away: null,
      next: null,
      loser: null,
    };
    first[0].loser = { key: THIRD_PLACE_KEY, slot: "HOME" };
    first[1].loser = { key: THIRD_PLACE_KEY, slot: "AWAY" };
  }
  return { matches: first, byes, slots: size / 2, third };
}
