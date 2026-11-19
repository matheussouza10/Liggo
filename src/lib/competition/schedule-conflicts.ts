/** Finds scheduling problems among games that were not played yet. Pure: no database. */
import { sameName } from "@/lib/text";

export type ScheduledGame = {
  id: string;
  /** Start time, in milliseconds. */
  at: number;
  venue: string | null;
  refereeId: string | null;
  /** Registrations (teams, pairs, people) playing. */
  sides: string[];
  /** Athletes of those registrations: one person cannot play two games at once. */
  athletes: string[];
};

export type ConflictKind = "venue" | "referee" | "side" | "athlete" | "rest";
export type Conflict = {
  kind: ConflictKind;
  gameIds: [string, string];
  at: number;
};

/** Fewest minutes between two games of the same side. */
export const MIN_REST_MINUTES = 30;

const share = (a: readonly string[], b: readonly string[]) =>
  a.some((x) => b.includes(x));

export function findConflicts(
  games: readonly ScheduledGame[],
  options: { restMinutes?: number } = {},
): Conflict[] {
  const rest = (options.restMinutes ?? MIN_REST_MINUTES) * 60 * 1000;
  const sorted = [...games].sort((a, b) => a.at - b.at);
  const out: Conflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const gap = b.at - a.at;
      if (gap >= rest) break; // sorted: nothing later can clash with `a`
      const pair: [string, string] = [a.id, b.id];
      if (gap === 0) {
        if (a.venue && b.venue && sameName(a.venue, b.venue))
          out.push({ kind: "venue", gameIds: pair, at: a.at });
        if (a.refereeId && a.refereeId === b.refereeId)
          out.push({ kind: "referee", gameIds: pair, at: a.at });
      }
      if (share(a.sides, b.sides))
        out.push({
          kind: gap === 0 ? "side" : "rest",
          gameIds: pair,
          at: a.at,
        });
      else if (share(a.athletes, b.athletes))
        out.push({
          kind: gap === 0 ? "athlete" : "rest",
          gameIds: pair,
          at: a.at,
        });
    }
  }
  return out;
}

export const CONFLICT_LABELS: Record<ConflictKind, string> = {
  venue: "Mesmo local e horário",
  referee: "Mesmo árbitro e horário",
  side: "Time em dois jogos ao mesmo tempo",
  athlete: "Atleta em dois jogos ao mesmo tempo",
  rest: "Intervalo curto entre jogos do mesmo time ou atleta",
};
