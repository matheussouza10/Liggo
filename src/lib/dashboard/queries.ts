import "server-only";

import {
  snapshotInclude,
  toSnapshot,
  type MatchSnapshot,
} from "@/lib/competition/live-queries";
import { prisma } from "@/lib/prisma";

export type DashboardData = {
  counts: {
    events: number;
    teams: number;
    athletes: number;
    referees: number;
    registrations: number;
  };
  live: MatchSnapshot[];
  upcoming: MatchSnapshot[];
  recent: MatchSnapshot[];
  events: {
    id: string;
    name: string;
    sport: string;
    startDate: Date;
    endDate: Date;
    registrations: number;
    played: number;
    total: number;
    publicVisible: boolean;
  }[];
};

/** Everything the home screen shows, only for one organization. */
export async function getDashboard(
  organizationId: string,
): Promise<DashboardData> {
  const mine = { stageRun: { stage: { event: { organizationId } } } } as const;
  const now = new Date();

  const [
    events,
    teams,
    athletes,
    referees,
    registrations,
    live,
    upcoming,
    recent,
    eventRows,
  ] = await Promise.all([
    prisma.event.count({ where: { organizationId } }),
    prisma.team.count({ where: { organizationId, active: true } }),
    prisma.organizationAthlete.count({ where: { organizationId } }),
    prisma.referee.count({ where: { organizationId, active: true } }),
    prisma.registration.count({ where: { event: { organizationId } } }),
    prisma.match.findMany({
      where: { ...mine, startedAt: { not: null }, status: "SCHEDULED" },
      orderBy: { startedAt: "asc" },
      take: 12,
      include: snapshotInclude,
    }),
    prisma.match.findMany({
      where: {
        ...mine,
        startedAt: null,
        status: "SCHEDULED",
        scheduledAt: { gte: now },
        homeEntryId: { not: null },
        awayEntryId: { not: null },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: snapshotInclude,
    }),
    prisma.match.findMany({
      where: { ...mine, status: { in: ["FINISHED", "WALKOVER"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: snapshotInclude,
    }),
    prisma.event.findMany({
      where: { organizationId },
      orderBy: { startDate: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        publicVisible: true,
        sport: { select: { name: true } },
        _count: { select: { registrations: true } },
      },
    }),
  ]);

  const ids = eventRows.map((e) => e.id);
  const matches = ids.length
    ? await prisma.match.findMany({
        where: { stageRun: { stage: { eventId: { in: ids } } } },
        select: {
          status: true,
          stageRun: { select: { stage: { select: { eventId: true } } } },
        },
        take: 5000,
      })
    : [];
  const progress = new Map<string, { played: number; total: number }>();
  for (const m of matches) {
    const key = m.stageRun.stage.eventId;
    const p = progress.get(key) ?? { played: 0, total: 0 };
    p.total++;
    if (m.status !== "SCHEDULED") p.played++;
    progress.set(key, p);
  }

  return {
    counts: { events, teams, athletes, referees, registrations },
    live: live.map(toSnapshot),
    upcoming: upcoming.map(toSnapshot),
    recent: recent.map(toSnapshot),
    events: eventRows.map((e) => ({
      id: e.id,
      name: e.name,
      sport: e.sport.name,
      startDate: e.startDate,
      endDate: e.endDate,
      registrations: e._count.registrations,
      played: progress.get(e.id)?.played ?? 0,
      total: progress.get(e.id)?.total ?? 0,
      publicVisible: e.publicVisible,
    })),
  };
}
