import "server-only";

import {
  buildPerfView,
  type PerfView,
} from "@/lib/competition/performance-view";
import { perfConfigOf } from "@/lib/competition/performance";
import {
  getEventForStages,
  getRunDetail,
  runTables,
  standingsRules,
} from "@/lib/competition/queries";
import { toRunView, type MatchView } from "@/lib/competition/view";
import { isCombatSport } from "@/lib/competition/win-method";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLE_LABELS } from "@/lib/registrations/constants";
import { registrationName } from "@/lib/registrations/queries";

export type ReportEvent = {
  id: string;
  name: string;
  organization: string;
  sport: string;
  period: { start: Date; end: Date };
  place: string;
};

async function eventHeader(
  organizationId: string,
  eventId: string,
): Promise<ReportEvent | null> {
  const e = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      locationName: true,
      city: true,
      state: true,
      sport: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    organization: e.organization.name,
    sport: e.sport.name,
    period: { start: e.startDate, end: e.endDate },
    place: [e.locationName, [e.city, e.state].filter(Boolean).join(" - ")]
      .filter(Boolean)
      .join(", "),
  };
}

// ---------------------------------------------------------------- registrations

export type RegistrationsReport = {
  event: ReportEvent;
  categories: {
    id: string;
    name: string;
    registrations: {
      id: string;
      name: string;
      members: {
        shirt: number | null;
        name: string;
        birthDate: Date;
        position: string | null;
        captain: boolean;
      }[];
      staff: { name: string; role: string; contact: string | null }[];
    }[];
  }[];
  total: number;
};

export async function getRegistrationsReport(
  organizationId: string,
  eventId: string,
): Promise<RegistrationsReport | null> {
  const event = await eventHeader(organizationId, eventId);
  if (!event) return null;
  const [categories, registrations] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.registration.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: {
        team: { select: { name: true } },
        members: {
          include: {
            athlete: { select: { name: true, birthDate: true } },
            position: { select: { name: true } },
          },
        },
        staff: true,
      },
    }),
  ]);
  const shape = (r: (typeof registrations)[number]) => ({
    id: r.id,
    name: registrationName(r),
    members: r.members
      .map((m) => ({
        shirt: m.shirtNumber,
        name: m.athlete.name,
        birthDate: m.athlete.birthDate,
        position: m.position?.name ?? null,
        captain: m.isCaptain,
      }))
      .sort(
        (a, b) =>
          (a.shirt ?? 999) - (b.shirt ?? 999) ||
          a.name.localeCompare(b.name, "pt-BR"),
      ),
    staff: r.staff.map((s) => ({
      name: s.name,
      role: STAFF_ROLE_LABELS[s.role],
      contact: s.contact,
    })),
  });
  return {
    event,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      registrations: registrations
        .filter((r) => r.categoryId === c.id)
        .map(shape)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })),
    total: registrations.length,
  };
}

// ---------------------------------------------------------------- results

export type ReportTable = {
  name: string;
  rows: {
    position: number;
    name: string;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    scoreFor: number;
    scoreAgainst: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
};
export type ReportStage = {
  name: string;
  type: string;
  status: "DRAWN" | "LIVE" | "DONE";
  tables: ReportTable[];
  matches: MatchView[];
  podium: { place: number; name: string; note: string | null }[];
  champion: string | null;
  performance: PerfView | null;
  bySets: boolean;
};
export type ResultsReport = {
  event: ReportEvent;
  categories: { id: string; name: string; stages: ReportStage[] }[];
};

export async function getResultsReport(
  organizationId: string,
  eventId: string,
): Promise<ResultsReport | null> {
  const header = await eventHeader(organizationId, eventId);
  const event = await getEventForStages(organizationId, eventId);
  if (!header || !event) return null;
  const rules = standingsRules(event);
  const combat = isCombatSport(event.sport.category.name);
  const perf = perfConfigOf(event.rules);
  const bySets = event.rules?.scoringModel === "SETS";

  const categories: ResultsReport["categories"] = [];
  for (const category of event.categories) {
    const stages: ReportStage[] = [];
    for (const [index, stage] of event.stages.entries()) {
      const run = await getRunDetail(stage.id, category.id);
      if (!run) continue;
      const t = rules ? runTables(run, rules) : { tables: [], ignored: [] };
      const view = toRunView(
        run,
        t.tables,
        t.ignored,
        stage.type,
        event.stages[index - 1]?.name ?? null,
        combat && !stage.thirdPlaceMatch,
      );
      stages.push({
        name: stage.name,
        type: stage.type,
        status: run.status,
        tables:
          stage.type === "PERFORMANCE" ||
          stage.type === "SINGLE_ELIM" ||
          stage.type === "DOUBLE_ELIM"
            ? []
            : t.tables.map((x) => ({
                name: x.name,
                rows: x.rows.map((r) => ({
                  position: r.position,
                  name: r.name,
                  points: r.points,
                  played: r.played,
                  wins: r.wins,
                  draws: r.draws,
                  losses: r.losses,
                  scoreFor: r.scoreFor,
                  scoreAgainst: r.scoreAgainst,
                  pointsFor: r.pointsFor,
                  pointsAgainst: r.pointsAgainst,
                })),
              })),
        matches: view.matches,
        podium: view.podium,
        champion: view.champion,
        performance:
          stage.type === "PERFORMANCE" &&
          perf &&
          event.rules &&
          run.status !== "DRAWN"
            ? buildPerfView(run, perf, event.rules)
            : null,
        bySets,
      });
    }
    if (stages.length)
      categories.push({ id: category.id, name: category.name, stages });
  }
  return { event: header, categories };
}

/** One match with rosters and lances, for the match sheet. */
export { getOrganizerMatch } from "@/lib/competition/live-queries";
export { eventHeader as getReportEvent };

/** Score of a match as text: "2 x 1 (4-3 pên.)", with the sets or games after it. */
export function scoreText(m: MatchView): string {
  if (m.status === "SCHEDULED")
    return m.games.length
      ? `em andamento: ${m.games.map((g) => `${g.home}-${g.away}`).join(" · ")}`
      : "";
  const base = `${m.homeScore} x ${m.awayScore}`;
  const pen =
    m.homePenalties != null
      ? ` (pên. ${m.homePenalties}-${m.awayPenalties})`
      : "";
  const parts = m.sets.length
    ? m.sets.map((s) => `${s.home}-${s.away}`).join(" · ")
    : m.games.map((g) => `${g.home}-${g.away}`).join(" · ");
  const wo = m.status === "WALKOVER" ? " (W.O.)" : "";
  return `${base}${pen}${wo}${parts ? ` [${parts}]` : ""}`;
}
