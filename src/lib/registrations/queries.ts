import "server-only";

import { prisma } from "@/lib/prisma";

/** The event plus what registrations need, only for the organization. */
export function getEventForRegistration(organizationId: string, id: string) {
  return prisma.event.findFirst({
    where: { id, organizationId },
    include: {
      sport: { select: { id: true, name: true } },
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { registrations: true } } },
      },
    },
  });
}

export function listRegistrations(eventId: string) {
  return prisma.registration.findMany({
    where: { eventId },
    orderBy: [{ category: { sortOrder: "asc" } }, { createdAt: "asc" }],
    include: {
      category: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, color: true } },
      members: {
        include: { athlete: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      staff: { select: { id: true } },
    },
  });
}

export function getRegistration(eventId: string, id: string) {
  return prisma.registration.findFirst({
    where: { id, eventId },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      staff: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Display name of a registration: the team, or the athletes of an individual or pair entry. */
export function registrationName(r: {
  team: { name: string } | null;
  members: { athlete: { name: string } }[];
}): string {
  if (r.team) return r.team.name;
  return r.members.map((m) => m.athlete.name).join(" / ") || "Sem nome";
}

/** Everything the registration builder needs: athletes, teams and positions. */
export async function getBuilderOptions(
  organizationId: string,
  eventId: string,
  sportId: string,
  excludeRegistrationId?: string,
) {
  const [links, teams, positions, taken, takenTeams] = await Promise.all([
    prisma.organizationAthlete.findMany({
      where: { organizationId },
      include: {
        athlete: {
          select: { id: true, name: true, gender: true, birthDate: true },
        },
      },
      orderBy: { athlete: { name: "asc" } },
    }),
    prisma.team.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.sportPosition.findMany({
      where: { sportId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, abbreviation: true },
    }),
    // Athletes already registered in this event, by category.
    prisma.registrationMember.findMany({
      where: {
        registration: { eventId },
        ...(excludeRegistrationId
          ? { NOT: { registrationId: excludeRegistrationId } }
          : {}),
      },
      select: { athleteId: true, categoryId: true },
    }),
    prisma.registration.findMany({
      where: {
        eventId,
        teamId: { not: null },
        ...(excludeRegistrationId
          ? { NOT: { id: excludeRegistrationId } }
          : {}),
      },
      select: { teamId: true, categoryId: true },
    }),
  ]);
  return {
    athletes: links.map((l) => l.athlete),
    teams,
    positions,
    takenAthletes: taken,
    takenTeams: takenTeams.map((t) => ({
      teamId: t.teamId as string,
      categoryId: t.categoryId,
    })),
  };
}
