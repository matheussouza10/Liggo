import { matchKey, seedOrder, type PlannedMatch, type Slot } from "./bracket";

/** Double elimination needs a power of two of participants, 4 or more. */
export const canBuildDoubleElimination = (n: number) =>
  n >= 4 && (n & (n - 1)) === 0;

export const winnersKey = (round: number, position: number) =>
  `W${matchKey(round, position)}`;
export const losersKey = (round: number, position: number) =>
  `L${matchKey(round, position)}`;
export const GRAND_FINAL_KEY = "GF";

function winnersLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  const name =
    fromEnd === 0
      ? "Final da chave superior"
      : fromEnd === 1
        ? "Semifinal da chave superior"
        : fromEnd === 2
          ? "Quartas da chave superior"
          : `Rodada ${round} da chave superior`;
  return name;
}

/**
 * Double elimination for `order` (best seed first). A team is out only after
 * two losses: the winners bracket sends its losers to the losers bracket, and
 * the two bracket champions meet in a single grand final.
 *
 * Rounds are numbered so that they sort in playing order: winners 1..k,
 * losers k+1..k+2(k-1), grand final last.
 */
export function buildDoubleElimination(
  order: readonly string[],
  options: { adjacent?: boolean } = {},
): PlannedMatch[] {
  const n = order.length;
  if (!canBuildDoubleElimination(n)) return [];
  const k = Math.log2(n);
  const seeds = options.adjacent
    ? Array.from({ length: n }, (_, i) => i + 1)
    : seedOrder(n);
  const out = new Map<string, PlannedMatch>();
  const make = (
    key: string,
    round: number,
    position: number,
    label: string,
  ): PlannedMatch => {
    const m: PlannedMatch = {
      key,
      round,
      position,
      label,
      home: null,
      away: null,
      next: null,
      loser: null,
    };
    out.set(key, m);
    return m;
  };

  // Winners bracket.
  for (let r = 1; r <= k; r++) {
    const count = n / 2 ** r;
    for (let p = 0; p < count; p++)
      make(winnersKey(r, p), r, p, winnersLabel(r, k));
  }
  for (let p = 0; p < n / 2; p++) {
    const w = out.get(winnersKey(1, p))!;
    w.home = order[seeds[2 * p] - 1];
    w.away = order[seeds[2 * p + 1] - 1];
  }

  // Losers bracket: round m has n/2^(floor((m+1)/2)+1) matches.
  const losersRounds = 2 * (k - 1);
  const losersCount = (m: number) => n / 2 ** (Math.floor((m + 1) / 2) + 1);
  for (let m = 1; m <= losersRounds; m++) {
    const kind = m === 1 ? "primeira" : m % 2 === 1 ? "rodada" : "rodada";
    void kind;
    for (let p = 0; p < losersCount(m); p++)
      make(
        losersKey(m, p),
        k + m,
        p,
        m === losersRounds
          ? "Final da chave inferior"
          : `Chave inferior, rodada ${m}`,
      );
  }
  const grand = make(GRAND_FINAL_KEY, k + losersRounds + 1, 0, "Final");

  const link = (
    from: PlannedMatch,
    kind: "next" | "loser",
    key: string,
    slot: Slot,
  ) => {
    from[kind] = { key, slot };
  };

  // Winners bracket routing.
  for (let r = 1; r <= k; r++) {
    for (let p = 0; p < n / 2 ** r; p++) {
      const w = out.get(winnersKey(r, p))!;
      if (r < k)
        link(
          w,
          "next",
          winnersKey(r + 1, Math.floor(p / 2)),
          p % 2 === 0 ? "HOME" : "AWAY",
        );
      else link(w, "next", GRAND_FINAL_KEY, "HOME");
      // Losers drop to the losers bracket.
      if (r === 1)
        link(
          w,
          "loser",
          losersKey(1, Math.floor(p / 2)),
          p % 2 === 0 ? "HOME" : "AWAY",
        );
      else link(w, "loser", losersKey(2 * (r - 1), p), "AWAY");
    }
  }
  // Losers bracket routing.
  for (let m = 1; m <= losersRounds; m++) {
    for (let p = 0; p < losersCount(m); p++) {
      const l = out.get(losersKey(m, p))!;
      if (m === losersRounds) link(l, "next", GRAND_FINAL_KEY, "AWAY");
      else if (m % 2 === 1) link(l, "next", losersKey(m + 1, p), "HOME");
      else
        link(
          l,
          "next",
          losersKey(m + 1, Math.floor(p / 2)),
          p % 2 === 0 ? "HOME" : "AWAY",
        );
    }
  }
  void grand;
  return [...out.values()];
}
