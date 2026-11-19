import { mulberry32 } from "./prng";
import { ratio } from "./sets";

export type FinishedMatch = {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  walkover: boolean;
  /** Only needed for walkovers (the score alone may be equal in odd rules). */
  winnerId: string | null;
  /** Sets played, from the home side's point of view (scoring by sets only). */
  sets?: { home: number; away: number }[];
};

export type PointsRule = {
  points: number;
  when: {
    outcome: "WIN" | "DRAW" | "LOSS";
    setsFor?: number;
    setsAgainst?: number;
  };
};

export type StandingsRules = {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  pointsTable: PointsRule[] | null;
  woPointsAwarded: number;
  woPointsPenalty: number;
  tiebreakers: { key: string; scope: "OVERALL" | "HEAD_TO_HEAD" }[];
};

export type StandingRow = {
  id: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoreFor: number;
  scoreAgainst: number;
  diff: number;
  points: number;
  forfeits: number;
  /** Points scored and conceded across all sets (scoring by sets only). */
  pointsFor: number;
  pointsAgainst: number;
  /** Still tied after every criterion (nothing left to break it). */
  tied: boolean;
};

type Stats = Omit<StandingRow, "position" | "tied">;

/** Criteria this module can evaluate; the rest are reported back as ignored. */
const SUPPORTED = new Set([
  "POINTS",
  "WINS",
  "SCORE_DIFF",
  "SCORE_FOR",
  "SCORE_AGAINST",
  "FEWER_FORFEITS",
  "SEED",
  "DRAW_LOTS",
  "SET_RATIO",
  "POINT_RATIO",
]);

function sidePoints(
  rules: StandingsRules,
  own: number,
  other: number,
  walkover: boolean,
  won: boolean,
): number {
  if (walkover) return won ? rules.woPointsAwarded : rules.woPointsPenalty;
  const outcome = own > other ? "WIN" : own < other ? "LOSS" : "DRAW";
  if (rules.pointsTable?.length) {
    const hit = rules.pointsTable.find(
      (r) =>
        r.when.outcome === outcome &&
        (r.when.setsFor === undefined || r.when.setsFor === own) &&
        (r.when.setsAgainst === undefined || r.when.setsAgainst === other),
    );
    if (hit) return hit.points;
  }
  return outcome === "WIN"
    ? rules.winPoints
    : outcome === "DRAW"
      ? rules.drawPoints
      : rules.lossPoints;
}

function statsOf(
  ids: readonly string[],
  matches: readonly FinishedMatch[],
  rules: StandingsRules,
): Map<string, Stats> {
  const set = new Set(ids);
  const map = new Map<string, Stats>(
    ids.map((id) => [
      id,
      {
        id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        diff: 0,
        points: 0,
        forfeits: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );
  for (const m of matches) {
    if (!set.has(m.homeId) || !set.has(m.awayId)) continue;
    const homeWon = m.walkover
      ? m.winnerId === m.homeId
      : m.homeScore > m.awayScore;
    const awayWon = m.walkover
      ? m.winnerId === m.awayId
      : m.awayScore > m.homeScore;
    for (const side of ["home", "away"] as const) {
      const s = map.get(side === "home" ? m.homeId : m.awayId)!;
      const own = side === "home" ? m.homeScore : m.awayScore;
      const other = side === "home" ? m.awayScore : m.homeScore;
      const won = side === "home" ? homeWon : awayWon;
      const lost = side === "home" ? awayWon : homeWon;
      s.played++;
      s.scoreFor += own;
      s.scoreAgainst += other;
      s.diff = s.scoreFor - s.scoreAgainst;
      if (won) s.wins++;
      else if (lost) s.losses++;
      else s.draws++;
      if (m.walkover && lost) s.forfeits++;
      for (const set of m.sets ?? []) {
        s.pointsFor += side === "home" ? set.home : set.away;
        s.pointsAgainst += side === "home" ? set.away : set.home;
      }
      s.points += sidePoints(rules, own, other, m.walkover, won);
    }
  }
  return map;
}

/**
 * Orders `ids` by the tiebreakers. A head-to-head criterion is recomputed
 * using only the matches among the teams that are still tied.
 */
export function computeStandings(
  ids: readonly string[],
  matches: readonly FinishedMatch[],
  rules: StandingsRules,
  options: {
    seeds?: ReadonlyMap<string, number | null>;
    lotsSeed?: number;
  } = {},
): { rows: StandingRow[]; ignored: string[] } {
  const overall = statsOf(ids, matches, rules);
  const lotsRnd = mulberry32(options.lotsSeed ?? 1);
  const lots = new Map(ids.map((id) => [id, lotsRnd()]));
  const criteria = rules.tiebreakers.filter((t) => SUPPORTED.has(t.key));
  const ignored = [
    ...new Set(
      rules.tiebreakers.filter((t) => !SUPPORTED.has(t.key)).map((t) => t.key),
    ),
  ];

  const value = (key: string, s: Stats, id: string): number => {
    switch (key) {
      case "POINTS":
        return s.points;
      case "WINS":
        return s.wins;
      case "SCORE_DIFF":
        return s.diff;
      case "SCORE_FOR":
        return s.scoreFor;
      case "SCORE_AGAINST":
        return -s.scoreAgainst;
      // With scoring by sets the score is the number of sets won.
      case "SET_RATIO":
        return ratio(s.scoreFor, s.scoreAgainst);
      case "POINT_RATIO":
        return ratio(s.pointsFor, s.pointsAgainst);
      case "FEWER_FORFEITS":
        return -s.forfeits;
      case "SEED":
        return -(options.seeds?.get(id) ?? 1e9);
      default:
        return lots.get(id) ?? 0; // DRAW_LOTS
    }
  };

  const unresolved = new Set<string>();
  const rank = (subset: string[], index: number): string[] => {
    if (subset.length <= 1) return subset;
    if (index >= criteria.length) {
      subset.forEach((id) => unresolved.add(id));
      return subset;
    }
    const c = criteria[index];
    const stats =
      c.scope === "HEAD_TO_HEAD" ? statsOf(subset, matches, rules) : overall;
    const scored = subset
      .map((id) => ({ id, v: value(c.key, stats.get(id)!, id) }))
      .sort((a, b) => b.v - a.v);
    const out: string[] = [];
    for (let i = 0; i < scored.length;) {
      let j = i;
      while (j < scored.length && scored[j].v === scored[i].v) j++;
      out.push(
        ...rank(
          scored.slice(i, j).map((x) => x.id),
          index + 1,
        ),
      );
      i = j;
    }
    return out;
  };

  const ordered = rank([...ids], 0);
  return {
    ignored,
    rows: ordered.map((id, i) => ({
      ...overall.get(id)!,
      position: i + 1,
      tied: unresolved.has(id),
    })),
  };
}
