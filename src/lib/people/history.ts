import "server-only";

import { prisma } from "@/lib/prisma";
import {
  aggregateMoments,
  placementOf,
  summarize,
  teamRecord,
  type Moment,
  type Placement,
  type StageInfo,
  type Summary,
  type TeamMatch,
  type TeamRecord,
  type Totals,
} from "./history-calc";

export type Participation = {
  registrationId: string;
  event: {
    id: string;
    name: string;
    sport: string;
    startDate: Date;
    endDate: Date;
  };
  category: string;
  team: string | null;
  shirtNumber: number | null;
  position: string | null;
  captain: boolean;
  totals: Totals;
  record: TeamRecord;
  placement: Placement;
};

export type AthleteHistory = {
  participations: Participation[];
  summary: Summary;
};

/**
 * The events of ONE organization in which an athlete took part. The athlete is
 * shared between organizations, but each one only sees its own events.
 */
export async function getAthleteHistory(
  organizationId: string,
  athleteId: string,
): Promise<AthleteHistory> {
  const members = await prisma.registrationMember.findMany({
    where: { athleteId, registration: { event: { organizationId } } },
    include: {
      position: { select: { name: true } },
      registration: {
        include: {
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              sport: { select: { name: true } },
            },
          },
          category: { select: { id: true, name: true } },
          team: { select: { name: true } },
        },
      },
    },
  });
  members.sort(
    (a, b) =>
      b.registration.event.startDate.getTime() -
      a.registration.event.startDate.getTime(),
  );
  if (members.length === 0)
    return { participations: [], summary: summarize([]) };

  const eventIds = [...new Set(members.map((m) => m.registration.eventId))];
  const registrationIds = members.map((m) => m.registrationId);

  const [moments, entries, stages] = await Promise.all([
    prisma.matchEvent.findMany({
      where: {
        OR: [{ athleteId }, { otherAthleteId: athleteId }],
        match: { stageRun: { stage: { eventId: { in: eventIds } } } },
      },
      select: {
        type: true,
        value: true,
        athleteId: true,
        matchId: true,
        match: {
          select: {
            stageRun: {
              select: {
                categoryId: true,
                stage: { select: { eventId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.stageEntry.findMany({
      where: { registrationId: { in: registrationIds } },
      select: { id: true, registrationId: true },
    }),
    prisma.eventStage.findMany({
      where: { eventId: { in: eventIds } },
      select: {
        eventId: true,
        order: true,
        name: true,
        type: true,
        runs: { select: { categoryId: true, status: true } },
      },
    }),
  ]);

  const entryIds = entries.map((e) => e.id);
  const matches = entryIds.length
    ? await prisma.match.findMany({
        where: {
          OR: [
            { homeEntryId: { in: entryIds } },
            { awayEntryId: { in: entryIds } },
          ],
        },
        select: {
          label: true,
          round: true,
          status: true,
          homeEntryId: true,
          awayEntryId: true,
          homeScore: true,
          awayScore: true,
          winnerEntryId: true,
          stageRun: {
            select: {
              stage: { select: { order: true, name: true, type: true } },
            },
          },
        },
      })
    : [];

  const participations: Participation[] = members.map((m) => {
    const reg = m.registration;
    const mine = new Set(
      entries.filter((e) => e.registrationId === reg.id).map((e) => e.id),
    );

    const ownMoments: Moment[] = moments
      .filter(
        (x) =>
          x.match.stageRun.stage.eventId === reg.eventId &&
          x.match.stageRun.categoryId === reg.categoryId,
      )
      .map((x) => ({
        matchId: x.matchId,
        type: x.type,
        value: x.value,
        as: x.athleteId === athleteId ? "PLAYER" : "OTHER",
      }));

    const teamMatches: TeamMatch[] = matches
      .filter(
        (x) =>
          (x.homeEntryId && mine.has(x.homeEntryId)) ||
          (x.awayEntryId && mine.has(x.awayEntryId)),
      )
      .map((x) => {
        const home = !!x.homeEntryId && mine.has(x.homeEntryId);
        const played = x.status !== "SCHEDULED";
        return {
          label: x.label ?? `Rodada ${x.round}`,
          stageOrder: x.stageRun.stage.order,
          stageType: x.stageRun.stage.type,
          stageName: x.stageRun.stage.name,
          round: x.round,
          status: x.status,
          scoreFor: played ? (home ? x.homeScore : x.awayScore) : null,
          scoreAgainst: played ? (home ? x.awayScore : x.homeScore) : null,
          won: played && x.winnerEntryId ? mine.has(x.winnerEntryId) : null,
        };
      });

    const stageInfo: StageInfo[] = stages
      .filter((s) => s.eventId === reg.eventId)
      .map((s) => ({
        order: s.order,
        name: s.name,
        type: s.type,
        runStatus:
          s.runs.find((r) => r.categoryId === reg.categoryId)?.status ?? null,
      }));

    return {
      registrationId: reg.id,
      event: {
        id: reg.event.id,
        name: reg.event.name,
        sport: reg.event.sport.name,
        startDate: reg.event.startDate,
        endDate: reg.event.endDate,
      },
      category: reg.category.name,
      team: reg.team?.name ?? null,
      shirtNumber: m.shirtNumber,
      position: m.position?.name ?? null,
      captain: m.isCaptain,
      totals: aggregateMoments(ownMoments),
      record: teamRecord(teamMatches),
      placement: placementOf(teamMatches, stageInfo),
    };
  });

  return { participations, summary: summarize(participations) };
}
