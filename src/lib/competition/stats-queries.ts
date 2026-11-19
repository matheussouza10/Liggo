import "server-only";

import { prisma } from "@/lib/prisma";
import { registrationName } from "@/lib/registrations/queries";
import {
  buildOverview,
  type Overview,
  type OverviewEvent,
  type OverviewMatch,
} from "./stats";

/**
 * Statistics of an event (optionally one category) from its recorded moments.
 * Pass publicOnly for the public pages: a hidden event gives nothing.
 */
export async function getEventOverview(
  eventId: string,
  categoryId: string | null,
  publicOnly: boolean,
): Promise<Overview | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...(publicOnly ? { publicVisible: true } : {}) },
    select: { id: true },
  });
  if (!event) return null;

  const entry = {
    include: {
      registration: {
        include: {
          team: { select: { name: true } },
          members: { include: { athlete: { select: { name: true } } } },
        },
      },
    },
  } as const;
  const matchWhere = {
    stageRun: { stage: { eventId }, ...(categoryId ? { categoryId } : {}) },
  } as const;
  const matches = await prisma.match.findMany({
    where: matchWhere,
    select: {
      id: true,
      status: true,
      startedAt: true,
      homeScore: true,
      awayScore: true,
      liveHome: true,
      liveAway: true,
      possessionHome: true,
      home: entry,
      away: entry,
      events: {
        orderBy: { createdAt: "asc" },
        include: {
          athlete: { select: { id: true, name: true } },
          otherAthlete: { select: { id: true, name: true } },
        },
      },
    },
    take: 1000,
  });

  const events: OverviewEvent[] = [];
  const list: OverviewMatch[] = [];
  for (const m of matches) {
    const homeTeam = m.home ? registrationName(m.home.registration) : null;
    const awayTeam = m.away ? registrationName(m.away.registration) : null;
    const played = m.status === "FINISHED" || m.status === "WALKOVER";
    const live = !played && m.startedAt !== null;
    list.push({
      id: m.id,
      homeTeam,
      awayTeam,
      played,
      possessionHome: m.possessionHome,
      goalsHome: played ? (m.homeScore ?? 0) : live ? m.liveHome : 0,
      goalsAway: played ? (m.awayScore ?? 0) : live ? m.liveAway : 0,
    });
    for (const e of m.events) {
      events.push({
        matchId: m.id,
        type: e.type,
        side: e.side,
        value: e.value,
        athleteId: e.athlete?.id ?? null,
        athleteName: e.athlete?.name ?? null,
        otherId: e.otherAthlete?.id ?? null,
        otherName: e.otherAthlete?.name ?? null,
        homeTeam,
        awayTeam,
      });
    }
  }
  return buildOverview(events, list);
}
