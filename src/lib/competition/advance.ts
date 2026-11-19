import { seedOrder } from "./bracket";

const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(n, 2)));

/** How many first-round matches pit two teams of the same group against each other. */
export function firstRoundClashes(
  order: readonly string[],
  groupOf: ReadonlyMap<string, string>,
): number {
  const size = nextPowerOfTwo(order.length);
  const seeds = seedOrder(size);
  let clashes = 0;
  for (let p = 0; p < size / 2; p++) {
    const a = order[seeds[2 * p] - 1];
    const b = order[seeds[2 * p + 1] - 1];
    if (a && b && groupOf.get(a) === groupOf.get(b)) clashes++;
  }
  return clashes;
}

/**
 * Seeds the qualified teams for a knockout: every group winner first, then
 * every runner-up and so on. Runner-ups are rotated, if needed, so a first
 * round does not repeat a group match (1A x 2B instead of 1A x 2A).
 * `groups` holds the qualified ids of each group, best first.
 */
export function crossQualified(
  groups: readonly (readonly string[])[],
): string[] {
  const groupOf = new Map<string, string>();
  groups.forEach((g, gi) => g.forEach((id) => groupOf.set(id, String(gi))));
  const depth = Math.max(0, ...groups.map((g) => g.length));

  let best: string[] = [];
  let bestClashes = Infinity;
  const G = groups.length;
  for (let shift = 0; shift < G; shift++) {
    for (const reverse of [false, true]) {
      const order: string[] = [];
      for (let rank = 0; rank < depth; rank++) {
        const indexes = groups.map((_, gi) => gi);
        // The first rank keeps the group order; later ranks are rotated.
        const turned =
          rank === 0
            ? indexes
            : indexes.map((_, i) => indexes[(i + shift * rank) % G]);
        const used = reverse && rank % 2 === 1 ? [...turned].reverse() : turned;
        for (const gi of used)
          if (groups[gi][rank]) order.push(groups[gi][rank]);
      }
      const clashes = firstRoundClashes(order, groupOf);
      if (clashes < bestClashes) {
        best = order;
        bestClashes = clashes;
      }
      if (bestClashes === 0) return best;
    }
  }
  return best;
}
