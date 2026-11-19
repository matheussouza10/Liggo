/** Match and event statistics. Pure and client-safe: the same code feeds the organizer, the public page and the event overview. */
import { EVENT_META, scoreDelta, type MatchEventType } from "./live";

type Side = "HOME" | "AWAY" | null;

export type StatEvent = { type: MatchEventType; side: Side; value: number };

export type SideStats = {
  /** Goals or points on the board (own goals count for the opponent). */
  score: number;
  fouls: number;
  yellow: number;
  red: number;
  substitutions: number;
  missedPenalties: number;
};

const empty = (): SideStats => ({
  score: 0,
  fouls: 0,
  yellow: 0,
  red: 0,
  substitutions: 0,
  missedPenalties: 0,
});

/** Counts per team for one match. */
export function matchSideStats(events: readonly StatEvent[]): {
  home: SideStats;
  away: SideStats;
} {
  const out = { home: empty(), away: empty() };
  for (const e of events) {
    const d = scoreDelta(e.type, e.side, e.value);
    out.home.score += d.home;
    out.away.score += d.away;
    const own =
      e.side === "HOME" ? out.home : e.side === "AWAY" ? out.away : null;
    if (!own) continue;
    if (e.type === "FOUL") own.fouls++;
    else if (e.type === "YELLOW_CARD") own.yellow++;
    else if (e.type === "RED_CARD") own.red++;
    else if (e.type === "SUBSTITUTION") own.substitutions++;
    else if (e.type === "PENALTY_MISSED") own.missedPenalties++;
  }
  return out;
}

/** Possession of both sides, or null when it was not recorded. */
export function possessionOf(
  homePct: number | null,
): { home: number; away: number } | null {
  if (homePct == null || homePct < 0 || homePct > 100) return null;
  return { home: homePct, away: 100 - homePct };
}

// ---------------------------------------------------------------- event overview

export type OverviewEvent = {
  matchId: string;
  type: MatchEventType;
  side: Side;
  value: number;
  athleteId: string | null;
  athleteName: string | null;
  otherId: string | null;
  otherName: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
};

export type OverviewMatch = {
  id: string;
  homeTeam: string | null;
  awayTeam: string | null;
  played: boolean;
  possessionHome: number | null;
  goalsHome: number;
  goalsAway: number;
};

export type PlayerRow = {
  id: string;
  name: string;
  team: string;
  count: number;
  matches: number;
};
export type TeamRow = { team: string; value: number };
export type CardTeamRow = { team: string; yellow: number; red: number };

export type Overview = {
  matches: number;
  withEvents: number;
  goals: number;
  goalsPerMatch: number | null;
  yellow: number;
  red: number;
  fouls: number;
  scorers: PlayerRow[];
  assists: PlayerRow[];
  carded: (PlayerRow & { yellow: number; red: number })[];
  cardsByTeam: CardTeamRow[];
  foulsByTeam: TeamRow[];
  possessionByTeam: (TeamRow & { matches: number })[];
  goalsUntaggedCount: number;
};

const teamOf = (e: OverviewEvent) =>
  (e.side === "HOME" ? e.homeTeam : e.side === "AWAY" ? e.awayTeam : null) ??
  "Sem time";
const byCountThenName = (
  a: { count: number; name: string },
  b: { count: number; name: string },
) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR");

/** Rankings for a whole event (or category) from every recorded moment. */
export function buildOverview(
  events: readonly OverviewEvent[],
  matches: readonly OverviewMatch[],
): Overview {
  const scorers = new Map<string, PlayerRow & { points: number }>();
  const assists = new Map<string, PlayerRow>();
  const carded = new Map<string, PlayerRow & { yellow: number; red: number }>();
  const cards = new Map<string, CardTeamRow>();
  const fouls = new Map<string, number>();
  const seenIn = new Map<string, Set<string>>(); // key -> match ids (to count matches per athlete)
  let untagged = 0;
  let yellow = 0;
  let red = 0;
  let foulCount = 0;

  const touch = (key: string, matchId: string) => {
    const set = seenIn.get(key) ?? new Set<string>();
    set.add(matchId);
    seenIn.set(key, set);
  };

  for (const e of events) {
    const team = teamOf(e);
    if (e.type === "GOAL") {
      if (e.athleteId) {
        const row = scorers.get(e.athleteId) ?? {
          id: e.athleteId,
          name: e.athleteName ?? "",
          team,
          count: 0,
          matches: 0,
          points: 0,
        };
        row.count += 1;
        row.points += e.value;
        scorers.set(e.athleteId, row);
        touch(`g:${e.athleteId}`, e.matchId);
      } else untagged++;
      if (e.otherId) {
        const row = assists.get(e.otherId) ?? {
          id: e.otherId,
          name: e.otherName ?? "",
          team,
          count: 0,
          matches: 0,
        };
        row.count += 1;
        assists.set(e.otherId, row);
        touch(`a:${e.otherId}`, e.matchId);
      }
    } else if (e.type === "YELLOW_CARD" || e.type === "RED_CARD") {
      const isRed = e.type === "RED_CARD";
      if (isRed) red++;
      else yellow++;
      const c = cards.get(team) ?? { team, yellow: 0, red: 0 };
      if (isRed) c.red++;
      else c.yellow++;
      cards.set(team, c);
      if (e.athleteId) {
        const row = carded.get(e.athleteId) ?? {
          id: e.athleteId,
          name: e.athleteName ?? "",
          team,
          count: 0,
          matches: 0,
          yellow: 0,
          red: 0,
        };
        row.count += 1;
        if (isRed) row.red++;
        else row.yellow++;
        carded.set(e.athleteId, row);
        touch(`c:${e.athleteId}`, e.matchId);
      }
    } else if (e.type === "FOUL") {
      foulCount++;
      fouls.set(team, (fouls.get(team) ?? 0) + 1);
    }
  }

  const withMatches = <T extends { id: string; matches: number }>(
    rows: T[],
    prefix: string,
  ) =>
    rows.map((r) => ({
      ...r,
      matches: seenIn.get(`${prefix}:${r.id}`)?.size ?? 0,
    }));

  // Ranked by goals, then by fewer matches (same goals in less games is better), then by name.
  const scorerRows = withMatches([...scorers.values()], "g").sort(
    (a, b) =>
      b.count - a.count ||
      a.matches - b.matches ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
  const assistRows = withMatches([...assists.values()], "a").sort(
    byCountThenName,
  );
  const cardedRows = withMatches([...carded.values()], "c").sort(
    (a, b) =>
      b.red - a.red ||
      b.yellow - a.yellow ||
      a.name.localeCompare(b.name, "pt-BR"),
  );

  const goals = matches.reduce((n, m) => n + m.goalsHome + m.goalsAway, 0);
  const played = matches.filter((m) => m.played).length;
  const counted = matches.filter(
    (m) => m.played || m.goalsHome + m.goalsAway > 0,
  );

  // Average possession per team over the matches where it was recorded.
  const poss = new Map<string, { sum: number; n: number }>();
  for (const m of matches) {
    if (m.possessionHome == null) continue;
    for (const [team, pct] of [
      [m.homeTeam, m.possessionHome],
      [m.awayTeam, 100 - m.possessionHome],
    ] as const) {
      if (!team) continue;
      const cur = poss.get(team) ?? { sum: 0, n: 0 };
      cur.sum += pct;
      cur.n++;
      poss.set(team, cur);
    }
  }

  return {
    matches: played,
    withEvents: new Set(events.map((e) => e.matchId)).size,
    goals,
    goalsPerMatch: counted.length
      ? Math.round((goals / counted.length) * 10) / 10
      : null,
    yellow,
    red,
    fouls: foulCount,
    scorers: scorerRows,
    assists: assistRows,
    carded: cardedRows,
    cardsByTeam: [...cards.values()].sort(
      (a, b) =>
        b.red - a.red ||
        b.yellow + b.red - (a.yellow + a.red) ||
        a.team.localeCompare(b.team, "pt-BR"),
    ),
    foulsByTeam: [...fouls.entries()]
      .map(([team, value]) => ({ team, value }))
      .sort(
        (a, b) => b.value - a.value || a.team.localeCompare(b.team, "pt-BR"),
      ),
    possessionByTeam: [...poss.entries()]
      .map(([team, v]) => ({
        team,
        value: Math.round(v.sum / v.n),
        matches: v.n,
      }))
      .sort(
        (a, b) => b.value - a.value || a.team.localeCompare(b.team, "pt-BR"),
      ),
    goalsUntaggedCount: untagged,
  };
}

/** Whether a lance type counts as a match "stat" worth a chart. */
export const isStatEvent = (t: MatchEventType) => EVENT_META[t].manual;
