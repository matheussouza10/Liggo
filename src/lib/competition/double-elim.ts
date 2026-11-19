import { matchKey, seedOrder, type PlannedMatch, type Slot } from "./bracket";

/** Double elimination takes from 3 to 64 participants; fields that are not a power of two get byes. */
export const MAX_DOUBLE_ELIMINATION = 64;
export const canBuildDoubleElimination = (n: number) =>
  n >= 3 && n <= MAX_DOUBLE_ELIMINATION;

export const winnersKey = (round: number, position: number) =>
  `W${matchKey(round, position)}`;
export const losersKey = (round: number, position: number) =>
  `L${matchKey(round, position)}`;
export const GRAND_FINAL_KEY = "GF";

const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(n));

function winnersLabel(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  return fromEnd === 0
    ? "Final da chave superior"
    : fromEnd === 1
      ? "Semifinal da chave superior"
      : fromEnd === 2
        ? "Quartas da chave superior"
        : `Rodada ${round} da chave superior`;
}

type Link = { key: string; slot: Slot };

/**
 * Double elimination for `order` (best seed first). A team is out only after
 * two losses: the winners bracket sends its losers to the losers bracket, and
 * the two bracket champions meet in a single grand final.
 *
 * Fields that are not a power of two get byes: the top seeds skip the first
 * round, and every game left without an opponent (in either bracket) is
 * dropped, the team moving straight on. With `n` teams there are always
 * 2n - 2 games.
 *
 * Rounds are numbered so that they sort in playing order: winners 1..k,
 * losers k+1..k+2(k-1), grand final last.
 */
export function buildDoubleElimination(
  order: readonly string[],
  options: { adjacent?: boolean } = {},
): PlannedMatch[] {
  const teams = order.length;
  if (!canBuildDoubleElimination(teams)) return [];
  const size = nextPowerOfTwo(teams);
  const k = Math.log2(size);
  // A bracket already laid out by a previous stage (adjacent) is only valid without byes.
  const seeds =
    options.adjacent && size === teams
      ? Array.from({ length: size }, (_, i) => i + 1)
      : seedOrder(size);
  const teamAt = (seed: number) => (seed <= teams ? order[seed - 1] : null);

  const full = new Map<string, PlannedMatch>();
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
    full.set(key, m);
    return m;
  };

  // Winners bracket.
  for (let r = 1; r <= k; r++)
    for (let p = 0; p < size / 2 ** r; p++)
      make(winnersKey(r, p), r, p, winnersLabel(r, k));
  for (let p = 0; p < size / 2; p++) {
    const w = full.get(winnersKey(1, p))!;
    w.home = teamAt(seeds[2 * p]);
    w.away = teamAt(seeds[2 * p + 1]);
  }

  // Losers bracket: round m has size/2^(floor((m+1)/2)+1) matches.
  const losersRounds = 2 * (k - 1);
  const losersCount = (m: number) => size / 2 ** (Math.floor((m + 1) / 2) + 1);
  for (let m = 1; m <= losersRounds; m++)
    for (let p = 0; p < losersCount(m); p++)
      make(
        losersKey(m, p),
        k + m,
        p,
        m === losersRounds
          ? "Final da chave inferior"
          : `Chave inferior, rodada ${m}`,
      );
  make(GRAND_FINAL_KEY, k + losersRounds + 1, 0, "Final");

  const link = (
    from: PlannedMatch,
    kind: "next" | "loser",
    key: string,
    slot: Slot,
  ) => {
    from[kind] = { key, slot };
  };
  for (let r = 1; r <= k; r++) {
    for (let p = 0; p < size / 2 ** r; p++) {
      const w = full.get(winnersKey(r, p))!;
      if (r < k)
        link(
          w,
          "next",
          winnersKey(r + 1, Math.floor(p / 2)),
          p % 2 === 0 ? "HOME" : "AWAY",
        );
      else link(w, "next", GRAND_FINAL_KEY, "HOME");
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
  for (let m = 1; m <= losersRounds; m++) {
    for (let p = 0; p < losersCount(m); p++) {
      const l = full.get(losersKey(m, p))!;
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

  if (teams === size) return [...full.values()];
  return collapseByes(full);
}

type State =
  { kind: "team"; id: string } | { kind: "empty" } | { kind: "pending" };

/** Drops every game that cannot be played (no opponent) and rewires the paths of winners and losers. */
function collapseByes(full: Map<string, PlannedMatch>): PlannedMatch[] {
  const sorted = [...full.values()].sort(
    (a, b) => a.round - b.round || a.position - b.position,
  );
  // Who feeds each slot.
  const feeder = new Map<string, { from: string; kind: "next" | "loser" }>();
  for (const m of sorted) {
    if (m.next)
      feeder.set(`${m.next.key}:${m.next.slot}`, { from: m.key, kind: "next" });
    if (m.loser)
      feeder.set(`${m.loser.key}:${m.loser.slot}`, {
        from: m.key,
        kind: "loser",
      });
  }
  const removed = new Set<string>();
  const winner = new Map<string, State>();
  const loser = new Map<string, State>();
  const slotState = (m: PlannedMatch, slot: Slot): State => {
    const f = feeder.get(`${m.key}:${slot}`);
    if (!f) {
      const id = slot === "HOME" ? m.home : m.away;
      return id ? { kind: "team", id } : { kind: "empty" };
    }
    return (f.kind === "next" ? winner : loser).get(f.from) as State;
  };
  const slots = new Map<string, { home: State; away: State }>();
  for (const m of sorted) {
    const home = slotState(m, "HOME");
    const away = slotState(m, "AWAY");
    slots.set(m.key, { home, away });
    if (home.kind === "empty" || away.kind === "empty") {
      removed.add(m.key);
      // Both empty: nothing comes out. One empty: the other side moves on.
      const other = home.kind === "empty" ? away : home;
      winner.set(m.key, other);
      loser.set(m.key, { kind: "empty" });
    } else {
      winner.set(m.key, { kind: "pending" });
      loser.set(m.key, { kind: "pending" });
    }
  }

  // Follow a path through dropped games until it lands on a game that is played.
  const land = (start: Link | null): Link | null => {
    let at = start;
    while (at && removed.has(at.key)) at = full.get(at.key)!.next;
    return at;
  };

  const position = new Map<number, number>();
  const out: PlannedMatch[] = [];
  for (const m of sorted) {
    if (removed.has(m.key)) continue;
    const s = slots.get(m.key)!;
    const index = position.get(m.round) ?? 0;
    position.set(m.round, index + 1);
    out.push({
      ...m,
      position: index,
      home: s.home.kind === "team" ? s.home.id : null,
      away: s.away.kind === "team" ? s.away.id : null,
      next: land(m.next),
      loser: land(m.loser),
    });
  }
  return out;
}
