import "server-only";

import { prisma } from "@/lib/prisma";
import { entryName, getRunDetail } from "./queries";
import type { MatchState } from "./live-queries";

export type BracketMatch = {
  id: string;
  home: string | null;
  away: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  winner: "HOME" | "AWAY" | null;
  state: MatchState;
  scheduledAt: string | null;
  venue: string | null;
};

/** A column of the bracket. `null` entries are matches that do not exist yet. */
export type BracketColumn = { title: string; matches: (BracketMatch | null)[] };
export type BracketData = {
  columns: BracketColumn[];
  third: BracketMatch | null;
  note: string | null;
};

type Stage = {
  id: string;
  order: number;
  name: string;
  type: string;
  groupCount: number | null;
  advancingPerGroup: number | null;
};

/**
 * The knockout of one category as a single tree, joining knockout stages that
 * are separate in the event (Quartas, Semifinal, Final). Rounds that were not
 * generated yet show as empty slots.
 */
export async function getBracket(
  stages: Stage[],
  categoryId: string,
): Promise<BracketData> {
  const columns: BracketColumn[] = [];
  let third: BracketMatch | null = null;
  let note: string | null = null;

  const knockout = stages.filter((s) => s.type === "SINGLE_ELIM");
  if (knockout.length === 0)
    return { columns, third, note: "Este evento não tem fase de mata-mata." };

  for (const stage of knockout) {
    const run = await getRunDetail(stage.id, categoryId);
    const matches = run?.matches ?? [];
    if (!run || matches.length === 0) {
      // Not played yet: show how many matches to expect.
      const previous = columns[columns.length - 1];
      let expected: number | null = previous
        ? Math.max(1, Math.ceil(previous.matches.length / 2))
        : null;
      if (expected === null) {
        const before = stages.filter((s) => s.order < stage.order).at(-1);
        if (
          before?.type === "GROUPS" &&
          before.groupCount &&
          before.advancingPerGroup
        ) {
          expected = Math.max(
            1,
            Math.floor((before.groupCount * before.advancingPerGroup) / 2),
          );
        }
      }
      if (expected === null) {
        note = "O chaveamento aparece depois do sorteio da fase.";
        break;
      }
      columns.push({
        title: stage.name,
        matches: Array.from({ length: expected }, () => null),
      });
      continue;
    }

    const names = new Map(run.entries.map((e) => [e.id, entryName(e)]));
    const view = (m: (typeof matches)[number]): BracketMatch => {
      const played = m.status === "FINISHED" || m.status === "WALKOVER";
      const state: MatchState = played
        ? m.status
        : m.startedAt
          ? "LIVE"
          : "SCHEDULED";
      return {
        id: m.id,
        home: m.homeEntryId ? (names.get(m.homeEntryId) ?? null) : null,
        away: m.awayEntryId ? (names.get(m.awayEntryId) ?? null) : null,
        scoreHome: played ? m.homeScore : state === "LIVE" ? m.liveHome : null,
        scoreAway: played ? m.awayScore : state === "LIVE" ? m.liveAway : null,
        penaltiesHome: m.homePenalties,
        penaltiesAway: m.awayPenalties,
        winner: m.winnerEntryId
          ? m.winnerEntryId === m.homeEntryId
            ? "HOME"
            : "AWAY"
          : null,
        state,
        scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
        venue: m.venue,
      };
    };
    const thirdMatch = matches.find((m) => m.label === "Disputa de 3º lugar");
    if (thirdMatch) third = view(thirdMatch);
    const rounds = [
      ...new Set(matches.filter((m) => m !== thirdMatch).map((m) => m.round)),
    ].sort((a, b) => a - b);
    for (const r of rounds) {
      const list = matches
        .filter((m) => m !== thirdMatch && m.round === r)
        .sort((a, b) => a.position - b.position);
      columns.push({
        title: list[0]?.label ?? stage.name,
        matches: list.map(view),
      });
    }
  }
  return { columns, third, note };
}

/** Categories of an event that have at least one knockout stage run (for pickers). */
export async function categoriesWithBracket(eventId: string) {
  return prisma.eventCategory.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}
