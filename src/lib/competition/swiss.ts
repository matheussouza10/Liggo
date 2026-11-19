/** Swiss system pairing. Pure: no database. */

export type SwissPlayer = {
  id: string;
  /** Points so far. */
  points: number;
  /** Order of strength: lower is better (the seed or the current rank). */
  rank: number;
  /** Everyone already faced. */
  played: ReadonlySet<string>;
};

export type SwissPairing = { home: string; away: string };

/** Largest number of rounds a field can play without anyone repeating an opponent (even field). */
export const maxSwissRounds = (players: number) => Math.max(0, players - 1);

/**
 * Pairs a round. Round one (nobody has points) meets the top half with the
 * bottom half. Later rounds pair people with similar points, never repeating
 * an opponent; backtracks when the greedy choice dead-ends. Needs an even field.
 */
export function pairSwiss(
  players: readonly SwissPlayer[],
): { pairs: SwissPairing[] } | { error: string } {
  if (players.length < 2)
    return { error: "É preciso ao menos 2 participantes." };
  if (players.length % 2 !== 0)
    return {
      error: "O sistema suíço precisa de um número par de participantes.",
    };
  const sorted = [...players].sort(
    (a, b) => b.points - a.points || a.rank - b.rank,
  );
  const fresh = sorted.every((p) => p.points === 0 && p.played.size === 0);

  if (fresh) {
    const bySeed = [...players].sort((a, b) => a.rank - b.rank);
    const half = bySeed.length / 2;
    return {
      pairs: bySeed
        .slice(0, half)
        .map((p, i) => ({ home: p.id, away: bySeed[i + half].id })),
    };
  }

  const pairs: SwissPairing[] = [];
  const used = new Set<string>();
  const solve = (): boolean => {
    const p = sorted.find((x) => !used.has(x.id));
    if (!p) return true;
    used.add(p.id);
    // Closest in points first, then closest in rank.
    const candidates = sorted
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
  return { pairs };
}
