import "server-only";

import { prisma } from "@/lib/prisma";
import { buildJourney, type Journey, type JourneyStage } from "./journey";

/** Where the event stands, from the database. */
export async function getJourney(eventId: string): Promise<Journey | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      startDate: true,
      registrationOpen: true,
      publicVisible: true,
      rules: { select: { id: true } },
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          groupCount: true,
          swissRounds: true,
        },
      },
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          _count: { select: { registrations: true } },
        },
      },
    },
  });
  if (!event) return null;

  const [runs, played, pendingRequests] = await Promise.all([
    prisma.stageRun.findMany({
      where: { stage: { eventId } },
      select: {
        id: true,
        stageId: true,
        categoryId: true,
        status: true,
        _count: { select: { matches: true } },
      },
    }),
    // A bye (sitting out a swiss round) is not a played game.
    prisma.match.groupBy({
      by: ["stageRunId"],
      where: {
        stageRun: { stage: { eventId } },
        status: { not: "SCHEDULED" },
        NOT: { status: "WALKOVER", awayEntryId: null },
      },
      _count: { _all: true },
    }),
    prisma.registrationRequest.count({ where: { eventId, status: "PENDING" } }),
  ]);
  const playedBy = new Map(played.map((p) => [p.stageRunId, p._count._all]));

  return buildJourney({
    startDate: event.startDate,
    now: new Date(),
    categories: event.categories.map((c) => ({
      id: c.id,
      name: c.name,
      registrations: c._count.registrations,
    })),
    hasRules: !!event.rules,
    stages: event.stages as JourneyStage[],
    runs: runs.map((r) => ({
      stageId: r.stageId,
      categoryId: r.categoryId,
      status: r.status,
      matches: r._count.matches,
      played: playedBy.get(r.id) ?? 0,
    })),
    pendingRequests,
    registrationOpen: event.registrationOpen,
    publicVisible: event.publicVisible,
  });
}
