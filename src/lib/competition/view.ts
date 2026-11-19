import { originLabel } from "./pairings";
import { entryName, type RunDetail } from "./queries";
import type { TableView } from "./run-standings";

export type EntryView = {
  id: string;
  name: string;
  color: string | null;
  groupId: string | null;
  seed: number | null;
  position: number;
  /** Where the participant came from ("1º do Grupo A"), when known. */
  origin: string | null;
  /** Came from the winner of a match of the previous stage. */
  fromMatch: boolean;
  athletes: number;
};
export type MatchView = {
  id: string;
  groupId: string | null;
  round: number;
  position: number;
  label: string;
  homeId: string | null;
  awayId: string | null;
  homeName: string | null;
  awayName: string | null;
  status: "SCHEDULED" | "FINISHED" | "WALKOVER";
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winnerId: string | null;
  scheduledAt: string | null;
  venue: string | null;
  refereeId: string | null;
  refereeName: string | null;
};
export type RunView = {
  id: string;
  status: "DRAWN" | "LIVE" | "DONE";
  drawMode: "MANUAL" | "RANDOM" | "RANKING" | "SNAKE";
  groups: { id: string; name: string }[];
  entries: EntryView[];
  matches: MatchView[];
  tables: TableView[];
  ignored: string[];
  champion: string | null;
  results: number;
  manualPairing: boolean;
};

export function toRunView(
  run: RunDetail,
  tables: TableView[],
  ignored: string[],
  stageType: string,
  previousStageName: string | null = null,
): RunView {
  const names = new Map(run.entries.map((e) => [e.id, entryName(e)]));
  const matches: MatchView[] = run.matches.map((m) => ({
    id: m.id,
    groupId: m.groupId,
    round: m.round,
    position: m.position,
    label: m.label ?? `Rodada ${m.round}`,
    homeId: m.homeEntryId,
    awayId: m.awayEntryId,
    homeName: m.homeEntryId ? (names.get(m.homeEntryId) ?? null) : null,
    awayName: m.awayEntryId ? (names.get(m.awayEntryId) ?? null) : null,
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenalties: m.homePenalties,
    awayPenalties: m.awayPenalties,
    winnerId: m.winnerEntryId,
    scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
    venue: m.venue,
    refereeId: m.refereeId,
    refereeName: m.referee?.name ?? null,
  }));
  const final = matches.find((m) => m.label === "Final");
  const champion =
    stageType === "SINGLE_ELIM"
      ? final?.winnerId
        ? (names.get(final.winnerId) ?? null)
        : null
      : run.status === "DONE" && tables.length === 1
        ? (tables[0].rows[0]?.name ?? null)
        : null;
  return {
    id: run.id,
    status: run.status,
    drawMode: run.drawMode,
    groups: run.groups.map((g) => ({ id: g.id, name: g.name })),
    entries: run.entries.map((e) => ({
      id: e.id,
      name: names.get(e.id) ?? "",
      color: e.registration.team?.color ?? null,
      groupId: e.groupId,
      seed: e.seed,
      position: e.position,
      origin: originLabel(e, previousStageName),
      fromMatch: e.originMatch != null,
      athletes: e.registration.members.length,
    })),
    matches,
    tables,
    ignored,
    champion,
    results: matches.filter((m) => m.status !== "SCHEDULED").length,
    manualPairing: run.manualPairing,
  };
}
