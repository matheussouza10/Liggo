import "server-only";

import { prisma } from "@/lib/prisma";
import {
  snapshotInclude,
  toSnapshot,
  type MatchSnapshot,
} from "./live-queries";

const visible = {
  stageRun: { stage: { event: { publicVisible: true } } },
} as const;

/** Matches being played now (started, no final result). */
export async function listLiveMatches(): Promise<MatchSnapshot[]> {
  const rows = await prisma.match.findMany({
    where: { ...visible, startedAt: { not: null }, status: "SCHEDULED" },
    orderBy: { startedAt: "asc" },
    take: 60,
    include: snapshotInclude,
  });
  return rows.map(toSnapshot);
}

/** Next scheduled matches with both teams known. */
export async function listUpcomingMatches(
  limit = 12,
): Promise<MatchSnapshot[]> {
  const rows = await prisma.match.findMany({
    where: {
      ...visible,
      startedAt: null,
      status: "SCHEDULED",
      scheduledAt: { not: null },
      homeEntryId: { not: null },
      awayEntryId: { not: null },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    include: snapshotInclude,
  });
  return rows.map(toSnapshot);
}

export async function listRecentMatches(limit = 12): Promise<MatchSnapshot[]> {
  const rows = await prisma.match.findMany({
    where: { ...visible, status: { in: ["FINISHED", "WALKOVER"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: snapshotInclude,
  });
  return rows.map(toSnapshot);
}

export function listPublicEvents() {
  return prisma.event.findMany({
    where: { publicVisible: true },
    orderBy: [{ startDate: "desc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      city: true,
      state: true,
      sport: { select: { name: true } },
      organization: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
  });
}

export function getPublicEvent(id: string) {
  return prisma.event.findFirst({
    where: { id, publicVisible: true },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      city: true,
      state: true,
      locationName: true,
      sport: { select: { name: true } },
      organization: { select: { name: true } },
      rules: true,
      stages: { orderBy: { order: "asc" } },
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
}

/** All matches of one event (public), for its page. */
export async function listEventMatches(
  eventId: string,
): Promise<MatchSnapshot[]> {
  const rows = await prisma.match.findMany({
    where: { stageRun: { stage: { eventId, event: { publicVisible: true } } } },
    orderBy: [{ scheduledAt: "asc" }, { round: "asc" }, { position: "asc" }],
    take: 500,
    include: snapshotInclude,
  });
  return rows.map(toSnapshot);
}
