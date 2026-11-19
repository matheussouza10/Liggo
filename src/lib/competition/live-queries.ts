import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { registrationName } from "@/lib/registrations/queries";
import type { MatchEventType } from "./live";

export type MatchState = "SCHEDULED" | "LIVE" | "FINISHED" | "WALKOVER";

export type SnapshotEvent = {
  id: string;
  type: MatchEventType;
  side: "HOME" | "AWAY" | null;
  minute: number | null;
  text: string | null;
  player: string | null;
  other: string | null;
  value: number;
  createdAt: string;
};

/** Everything a viewer needs to follow a match. Plain data: safe for JSON and client props. */
export type MatchSnapshot = {
  id: string;
  eventId: string;
  eventName: string;
  sportName: string;
  categoryName: string;
  stageName: string;
  label: string;
  state: MatchState;
  home: string | null;
  away: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  /** Home share of the ball, 0 to 100, when recorded. */
  possessionHome: number | null;
  /** Score of each set, finished or in progress (scoring by sets only). */
  sets: { home: number; away: number }[];
  scheduledAt: string | null;
  startedAt: string | null;
  venue: string | null;
  referee: string | null;
  events: SnapshotEvent[];
  /** Changes whenever something a viewer can see changes. */
  version: string;
};

const entry = {
  include: {
    registration: {
      include: {
        team: { select: { name: true } },
        members: { include: { athlete: { select: { name: true } } } },
      },
    },
  },
} satisfies { include: Prisma.StageEntryInclude };

export const snapshotInclude = {
  home: entry,
  away: entry,
  referee: { select: { name: true } },
  sets: { orderBy: { number: "asc" as const } },
  events: {
    orderBy: { createdAt: "asc" },
    include: {
      athlete: { select: { name: true } },
      otherAthlete: { select: { name: true } },
    },
  },
  stageRun: {
    select: {
      category: { select: { name: true } },
      stage: {
        select: {
          name: true,
          type: true,
          event: {
            select: {
              id: true,
              name: true,
              publicVisible: true,
              organizationId: true,
              sport: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MatchInclude;

export type SnapshotSource = Prisma.MatchGetPayload<{
  include: typeof snapshotInclude;
}>;

export function toSnapshot(m: SnapshotSource): MatchSnapshot {
  const played = m.status === "FINISHED" || m.status === "WALKOVER";
  const state: MatchState = played
    ? m.status
    : m.startedAt
      ? "LIVE"
      : "SCHEDULED";
  const scoreHome = played ? m.homeScore : state === "LIVE" ? m.liveHome : null;
  const scoreAway = played ? m.awayScore : state === "LIVE" ? m.liveAway : null;
  const events: SnapshotEvent[] = m.events.map((e) => ({
    id: e.id,
    type: e.type,
    side: e.side,
    minute: e.minute,
    text: e.text,
    player: e.athlete?.name ?? null,
    other: e.otherAthlete?.name ?? null,
    value: e.value,
    createdAt: e.createdAt.toISOString(),
  }));
  const last = events[events.length - 1];
  return {
    id: m.id,
    eventId: m.stageRun.stage.event.id,
    eventName: m.stageRun.stage.event.name,
    sportName: m.stageRun.stage.event.sport.name,
    categoryName: m.stageRun.category.name,
    stageName: m.stageRun.stage.name,
    label: m.label ?? `Rodada ${m.round}`,
    state,
    home: m.home ? registrationName(m.home.registration) : null,
    away: m.away ? registrationName(m.away.registration) : null,
    scoreHome,
    scoreAway,
    penaltiesHome: m.homePenalties,
    penaltiesAway: m.awayPenalties,
    possessionHome: m.possessionHome,
    sets: m.sets.map((x) => ({ home: x.homePoints, away: x.awayPoints })),
    scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
    startedAt: m.startedAt ? m.startedAt.toISOString() : null,
    venue: m.venue,
    referee: m.referee?.name ?? null,
    events,
    version: `${events.length}:${last?.id ?? ""}:${state}:${scoreHome ?? "-"}-${scoreAway ?? "-"}:${m.homePenalties ?? ""}-${m.awayPenalties ?? ""}:${m.possessionHome ?? ""}:${m.sets.map((x) => `${x.homePoints}-${x.awayPoints}`).join(",")}`,
  };
}

/** A public match: the event must be visible. */
export async function getPublicMatch(
  id: string,
): Promise<MatchSnapshot | null> {
  const m = await prisma.match.findFirst({
    where: { id, stageRun: { stage: { event: { publicVisible: true } } } },
    include: snapshotInclude,
  });
  return m ? toSnapshot(m) : null;
}

/** A match of the organization, with both rosters for the lance form. */
export async function getOrganizerMatch(
  organizationId: string,
  eventId: string,
  id: string,
) {
  const m = await prisma.match.findFirst({
    where: {
      id,
      stageRun: { stage: { event: { id: eventId, organizationId } } },
    },
    include: snapshotInclude,
  });
  if (!m) return null;
  const roster = (e: typeof m.home) =>
    (e?.registration.members ?? [])
      .map((x) => ({
        id: x.athleteId,
        name: x.athlete.name,
        shirt: x.shirtNumber,
      }))
      .sort(
        (a, b) =>
          (a.shirt ?? 999) - (b.shirt ?? 999) ||
          a.name.localeCompare(b.name, "pt-BR"),
      );
  const event = m.stageRun.stage.event;
  return {
    snapshot: toSnapshot(m),
    homeRoster: roster(m.home),
    awayRoster: roster(m.away),
    publicVisible: event.publicVisible,
    ready: !!m.homeEntryId && !!m.awayEntryId,
    knockout:
      m.stageRun.stage.type === "SINGLE_ELIM" ||
      m.stageRun.stage.type === "DOUBLE_ELIM",
  };
}
