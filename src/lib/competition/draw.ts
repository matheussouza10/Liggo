import { shuffle } from "./prng";

export type DrawEntry = { id: string; seed: number | null };
export type DrawMode = "MANUAL" | "RANDOM" | "RANKING" | "SNAKE";

/** Seeded entries first (best seed first, ties shuffled), then the rest shuffled. */
export function orderBySeed(
  entries: readonly DrawEntry[],
  rnd: () => number,
): string[] {
  const seeded = shuffle(
    entries.filter((e) => e.seed != null),
    rnd,
  ).sort((a, b) => (a.seed as number) - (b.seed as number));
  const rest = shuffle(
    entries.filter((e) => e.seed == null),
    rnd,
  );
  return [...seeded, ...rest].map((e) => e.id);
}

/**
 * Distributes entries into `groupCount` groups. Sizes differ by at most one.
 * - RANDOM: pure shuffle, dealt one by one.
 * - SNAKE: by seed, going A..H then H..A.
 * - RANKING: pots by seed; each pot is shuffled and gives one team per group.
 * - MANUAL: nobody is placed; the organizer assigns by hand.
 */
export function drawGroups(
  mode: DrawMode,
  entries: readonly DrawEntry[],
  groupCount: number,
  rnd: () => number,
): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  if (mode === "MANUAL") return groups;

  if (mode === "RANDOM") {
    shuffle(
      entries.map((e) => e.id),
      rnd,
    ).forEach((id, i) => groups[i % groupCount].push(id));
    return groups;
  }

  const ordered = orderBySeed(entries, rnd);
  if (mode === "SNAKE") {
    ordered.forEach((id, i) => {
      const row = Math.floor(i / groupCount);
      const col = i % groupCount;
      groups[row % 2 === 0 ? col : groupCount - 1 - col].push(id);
    });
    return groups;
  }

  // RANKING: pots of `groupCount` teams.
  for (let start = 0; start < ordered.length; start += groupCount) {
    const pot = shuffle(ordered.slice(start, start + groupCount), rnd);
    const targets = shuffle(
      groups.map((_, i) => i),
      rnd,
    );
    pot.forEach((id, i) => groups[targets[i]].push(id));
  }
  return groups;
}

/** Order of entries for a knockout bracket (index 0 is seed 1). */
export function drawBracketOrder(
  mode: DrawMode,
  entries: readonly DrawEntry[],
  rnd: () => number,
): string[] {
  if (mode === "RANDOM")
    return shuffle(
      entries.map((e) => e.id),
      rnd,
    );
  return orderBySeed(entries, rnd);
}
