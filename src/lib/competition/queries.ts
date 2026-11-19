import "server-only";

import { prisma } from "@/lib/prisma";
import { registrationName } from "@/lib/registrations/queries";
import { storedRulesToInput } from "@/lib/rules/queries";
import { buildTables } from "./run-standings";
import type { StandingsRules } from "./standings";

export const SUPPORTED_STAGE_TYPES = [
  "ROUND_ROBIN",
  "GROUPS",
  "SINGLE_ELIM",
  "DOUBLE_ELIM",
  "SWISS",
  "PERFORMANCE",
] as const;
export const isSupportedStage = (type: string) =>
  (SUPPORTED_STAGE_TYPES as readonly string[]).includes(type);

/** The event with everything the stage screens need, only for the organization. */
export function getEventForStages(organizationId: string, id: string) {
  return prisma.event.findFirst({
    where: { id, organizationId },
    include: {
      sport: {
        select: { id: true, name: true, category: { select: { name: true } } },
      },
      rules: true,
      stages: { orderBy: { order: "asc" } },
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { registrations: true } } },
      },
    },
  });
}

export function getRunDetail(stageId: string, categoryId: string) {
  return prisma.stageRun.findUnique({
    where: { stageId_categoryId: { stageId, categoryId } },
    include: {
      groups: { orderBy: { order: "asc" } },
      entries: {
        orderBy: { position: "asc" },
        include: {
          attempts: { orderBy: { number: "asc" } },
          registration: {
            include: {
              team: { select: { name: true, color: true } },
              members: { include: { athlete: { select: { name: true } } } },
            },
          },
        },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: {
          referee: { select: { id: true, name: true } },
          sets: { orderBy: { number: "asc" } },
          games: { orderBy: { number: "asc" } },
        },
      },
    },
  });
}
export type RunDetail = NonNullable<Awaited<ReturnType<typeof getRunDetail>>>;

export function entryName(e: RunDetail["entries"][number]): string {
  return registrationName(e.registration);
}

/** Runs of an event per stage and category, for the overview. */
export function listRuns(eventId: string) {
  return prisma.stageRun.findMany({
    where: { stage: { eventId } },
    select: {
      stageId: true,
      categoryId: true,
      status: true,
      _count: { select: { entries: true, matches: true } },
      matches: {
        where: { status: { not: "SCHEDULED" } },
        select: { id: true },
      },
    },
  });
}

/** Rules as the standings need them, from the stored event. */
export function standingsRules(
  event: Parameters<typeof storedRulesToInput>[0],
): StandingsRules | null {
  const input = storedRulesToInput(event);
  if (!input) return null;
  return {
    winPoints: input.winPoints,
    drawPoints: input.drawPoints,
    lossPoints: input.lossPoints,
    pointsTable: input.pointsTable,
    woPointsAwarded: input.woPointsAwarded,
    woPointsPenalty: input.woPointsPenalty,
    tiebreakers: input.tiebreakers,
  };
}

export function runTables(run: RunDetail, rules: StandingsRules) {
  return buildTables(
    run.groups.map((g) => ({ id: g.id, name: g.name })),
    run.entries.map((e) => ({
      id: e.id,
      groupId: e.groupId,
      seed: e.seed,
      name: entryName(e),
    })),
    run.matches,
    rules,
    run.drawSeed,
  );
}

/** Referees the organization can assign to a match of this sport. */
export function getAssignableReferees(organizationId: string, sportId: string) {
  return prisma.referee.findMany({
    where: { organizationId, active: true, sports: { some: { sportId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
