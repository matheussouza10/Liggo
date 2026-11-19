/** Swiss system pairing. Pure: no database. */

export type SwissPlayer = {
  id: string;
  /** Points so far. */
  points: number;
  /** Order of strength: lower is better (the seed or the current rank). */
  rank: number;
  /** Everyone already faced. */
  played: ReadonlySet<string>;
  /** Already sat out a round (nobody sits out twice). */
  hadBye?: boolean;
};

export type SwissPairing = { home: string; away: string };
export type SwissRound = {
  pairs: SwissPairing[];
  /** Who sits out an odd field. */ bye: string | null;
};

/** Rounds a field can play without anyone repeating an opponent (an odd field adds one sitting out each round). */
export const maxSwissRounds = (players: number) =>
  players % 2 === 0 ? Math.max(0, players - 1) : players;

/**
 * Pairs a round. Round one (nobody has points) meets the top half with the
 * bottom half. Later rounds pair people with similar points, never repeating
 * an opponent; backtracks when the greedy choice dead-ends. An odd field has
 * someone sit out: the lowest ranked who has not sat out yet.
 */
export function pairSwiss(
  players: readonly SwissPlayer[],
): SwissRound | { error: string } {
  if (players.length < 2)
    return { error: "É preciso ao menos 2 participantes." };
  const sorted = [...players].sort(
    (a, b) => b.points - a.points || a.rank - b.rank,
  );

  let bye: string | null = null;
  let field = sorted;
  if (players.length % 2 !== 0) {
    // The weakest (fewest points, then worst rank) who has not had a bye; anyone if all had one.
    const order = [...sorted].reverse();
    const pick = order.find((p) => !p.hadBye) ?? order[0];
    bye = pick.id;
    field = sorted.filter((p) => p.id !== pick.id);
  }

  const fresh = field.every((p) => p.points === 0 && p.played.size === 0);
  if (fresh) {
    const bySeed = [...field].sort((a, b) => a.rank - b.rank);
    const half = bySeed.length / 2;
    return {
      pairs: bySeed
        .slice(0, half)
        .map((p, i) => ({ home: p.id, away: bySeed[i + half].id })),
      bye,
    };
  }

  const pairs: SwissPairing[] = [];
  const used = new Set<string>();
  const solve = (): boolean => {
    const p = field.find((x) => !used.has(x.id));
    if (!p) return true;
    used.add(p.id);
    // Closest in points first, then closest in rank.
    const candidates = field
      .filter((x) => !used.has(x.id) && !p.played.has(x.id))
      .sort(
        (a, b) =>
          Math.abs(a.points - p.points) - Math.abs(b.points - p.points) ||
          a.rank - b.rank,
      );
    for (const c of candidates) {
      used.add(c.id);
      pairs.push({ home: p.id, away: c.id });
      if (solve()) return true;
      pairs.pop();
      used.delete(c.id);
    }
    used.delete(p.id);
    return false;
  };
  if (!solve())
    return {
      error:
        "Não há como emparelhar a rodada sem repetir adversários. Use menos rodadas.",
    };
  return { pairs, bye };
}
