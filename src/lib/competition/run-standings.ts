import {
  computeStandings,
  type FinishedMatch,
  type StandingRow,
  type StandingsRules,
} from "./standings";

export type RunEntryLite = {
  id: string;
  groupId: string | null;
  seed: number | null;
  name: string;
};
export type RunMatchLite = {
  groupId: string | null;
  homeEntryId: string | null;
  awayEntryId: string | null;
  status: "SCHEDULED" | "FINISHED" | "WALKOVER";
  homeScore: number | null;
  awayScore: number | null;
  winnerEntryId: string | null;
};

export type TableView = {
  groupId: string | null;
  name: string;
  rows: (StandingRow & { name: string })[];
};

/** One standings table per group (or a single table for a league stage). */
export function buildTables(
  groups: { id: string; name: string }[],
  entries: RunEntryLite[],
  matches: RunMatchLite[],
  rules: StandingsRules,
  lotsSeed: number,
): { tables: TableView[]; ignored: string[] } {
  const ignored = new Set<string>();
  // Groups give one table each; without groups the whole stage is one table.
  const buckets: { groupId: string | null; name: string }[] = groups.length
    ? groups.map((g) => ({ groupId: g.id, name: g.name }))
    : [{ groupId: null, name: "Classificação" }];
  const tables = buckets.map(({ groupId, name }) => {
    const members = entries.filter((e) =>
      groupId === null ? true : e.groupId === groupId,
    );
    const names = new Map(members.map((e) => [e.id, e.name]));
    const seeds = new Map(members.map((e) => [e.id, e.seed]));
    const finished: FinishedMatch[] = matches
      .filter(
        (m) =>
          (groupId === null ? true : m.groupId === groupId) &&
          m.status !== "SCHEDULED" &&
          m.homeEntryId &&
          m.awayEntryId,
      )
      .map((m) => ({
        homeId: m.homeEntryId as string,
        awayId: m.awayEntryId as string,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        walkover: m.status === "WALKOVER",
        winnerId: m.winnerEntryId,
      }));
    const result = computeStandings(
      members.map((e) => e.id),
      finished,
      rules,
      { seeds, lotsSeed },
    );
    result.ignored.forEach((k) => ignored.add(k));
    return {
      groupId,
      name,
      rows: result.rows.map((r) => ({ ...r, name: names.get(r.id) ?? "" })),
    };
  });
  return { tables, ignored: [...ignored] };
}
