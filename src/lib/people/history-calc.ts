/** Numbers of an athlete's history. Pure and client-safe. */
import type { MatchEventType } from "@/lib/competition/live";

export type Moment = {
  matchId: string;
  type: MatchEventType;
  value: number;
  /** The athlete is the main player of the moment or the second one (assist, who comes in). */
  as: "PLAYER" | "OTHER";
};

export type Totals = {
  goals: number;
  points: number;
  assists: number;
  yellow: number;
  red: number;
  fouls: number;
  ownGoals: number;
  missedPenalties: number;
  substitutedIn: number;
  substitutedOut: number;
  /** Matches where the athlete appears in at least one moment. */
  matchesWithAction: number;
};

export const emptyTotals = (): Totals => ({
  goals: 0,
  points: 0,
  assists: 0,
  yellow: 0,
  red: 0,
  fouls: 0,
  ownGoals: 0,
  missedPenalties: 0,
  substitutedIn: 0,
  substitutedOut: 0,
  matchesWithAction: 0,
});

export function aggregateMoments(moments: readonly Moment[]): Totals {
  const t = emptyTotals();
  const matches = new Set<string>();
  for (const m of moments) {
    matches.add(m.matchId);
    if (m.as === "PLAYER") {
      if (m.type === "GOAL") {
        t.goals++;
        t.points += m.value;
      } else if (m.type === "OWN_GOAL") t.ownGoals++;
      else if (m.type === "YELLOW_CARD") t.yellow++;
      else if (m.type === "RED_CARD") t.red++;
      else if (m.type === "FOUL") t.fouls++;
      else if (m.type === "PENALTY_MISSED") t.missedPenalties++;
      else if (m.type === "SUBSTITUTION") t.substitutedOut++;
    } else if (m.type === "GOAL") t.assists++;
    else if (m.type === "SUBSTITUTION") t.substitutedIn++;
  }
  t.matchesWithAction = matches.size;
  return t;
}

// ---------------------------------------------------------------- team result

export type TeamMatch = {
  label: string;
  stageOrder: number;
  stageType: string;
  stageName: string;
  round: number;
  status: "SCHEDULED" | "FINISHED" | "WALKOVER";
  /** Score for and against the athlete's team (null until played). */
  scoreFor: number | null;
  scoreAgainst: number | null;
  /** Whether the team won (null while unplayed or a draw). */
  won: boolean | null;
};

export type StageInfo = {
  order: number;
  name: string;
  type: string;
  runStatus: "DRAWN" | "LIVE" | "DONE" | null;
};

export type Placement =
  | { kind: "CHAMPION" | "RUNNER_UP" | "THIRD" | "FOURTH"; text: string }
  | { kind: "ELIMINATED" | "LIVE" | "PLAYED" | "NONE"; text: string };

export type TeamRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export function teamRecord(matches: readonly TeamMatch[]): TeamRecord {
  const r: TeamRecord = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
  for (const m of matches) {
    if (
      m.status === "SCHEDULED" ||
      m.scoreFor == null ||
      m.scoreAgainst == null
    )
      continue;
    r.played++;
    r.goalsFor += m.scoreFor;
    r.goalsAgainst += m.scoreAgainst;
    if (m.won === true) r.wins++;
    else if (m.won === false) r.losses++;
    else r.draws++;
  }
  return r;
}

/** How the team ended in the event, from the matches it played. */
export function placementOf(
  matches: readonly TeamMatch[],
  stages: readonly StageInfo[],
): Placement {
  if (matches.length === 0)
    return { kind: "NONE", text: "Inscrito, ainda sem jogos" };
  const played = matches.filter((m) => m.status !== "SCHEDULED");
  const final = played.find((m) => m.label === "Final");
  if (final)
    return final.won
      ? { kind: "CHAMPION", text: "Campeão" }
      : { kind: "RUNNER_UP", text: "Vice-campeão" };
  const third = played.find((m) => m.label === "Disputa de 3º lugar");
  if (third)
    return third.won
      ? { kind: "THIRD", text: "3º lugar" }
      : { kind: "FOURTH", text: "4º lugar" };

  const knockout = [...matches]
    .filter((m) => m.stageType === "SINGLE_ELIM")
    .sort((a, b) => a.stageOrder - b.stageOrder || a.round - b.round);
  const last = knockout[knockout.length - 1];
  if (last) {
    if (last.status === "SCHEDULED")
      return { kind: "LIVE", text: `Na disputa: ${last.label}` };
    return last.won
      ? { kind: "LIVE", text: `Avançou em ${last.label}` }
      : { kind: "ELIMINATED", text: `Eliminado: ${last.label}` };
  }

  // Only league or group matches so far.
  const lastStage = [...matches].sort((a, b) => b.stageOrder - a.stageOrder)[0];
  const stage = stages.find((s) => s.order === lastStage.stageOrder);
  const later = stages.some((s) => s.order > lastStage.stageOrder);
  if (stage?.runStatus === "DONE" && later)
    return { kind: "ELIMINATED", text: `Eliminado: ${lastStage.stageName}` };
  if (stage?.runStatus === "DONE")
    return { kind: "PLAYED", text: `Disputou: ${lastStage.stageName}` };
  return { kind: "LIVE", text: `Em andamento: ${lastStage.stageName}` };
}

export type Summary = {
  events: number;
  titles: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  fouls: number;
};

export function summarize(
  items: readonly { totals: Totals; placement: Placement }[],
): Summary {
  return items.reduce<Summary>(
    (s, i) => ({
      events: s.events + 1,
      titles: s.titles + (i.placement.kind === "CHAMPION" ? 1 : 0),
      goals: s.goals + i.totals.goals,
      assists: s.assists + i.totals.assists,
      yellow: s.yellow + i.totals.yellow,
      red: s.red + i.totals.red,
      fouls: s.fouls + i.totals.fouls,
    }),
    { events: 0, titles: 0, goals: 0, assists: 0, yellow: 0, red: 0, fouls: 0 },
  );
}
