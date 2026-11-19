export type RoundRobinMatch = { round: number; home: string; away: string };

/**
 * Circle method. Odd counts get a rest turn. With two legs, the second leg
 * repeats every round with home and away swapped.
 */
export function roundRobin(
  ids: readonly string[],
  legs: 1 | 2,
): RoundRobinMatch[] {
  const slots: (string | null)[] = [...ids];
  if (slots.length % 2 === 1) slots.push(null);
  const n = slots.length;
  const rounds = n - 1;
  const out: RoundRobinMatch[] = [];

  let ring = [...slots];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate who is home so nobody is always home or always away.
      const flip = i === 0 ? r % 2 === 1 : i % 2 === 1;
      out.push({ round: r + 1, home: flip ? b : a, away: flip ? a : b });
    }
    // Keep the first fixed and rotate the rest.
    ring = [ring[0], ring[n - 1], ...ring.slice(1, n - 1)];
  }

  if (legs === 2) {
    const first = [...out];
    for (const m of first)
      out.push({ round: m.round + rounds, home: m.away, away: m.home });
  }
  return out;
}
