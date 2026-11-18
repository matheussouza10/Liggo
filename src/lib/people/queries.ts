import "server-only";

import { prisma } from "@/lib/prisma";

/** Athletes linked to the organization (the only ones it can see). */
export async function listAthletes(organizationId: string) {
  const links = await prisma.organizationAthlete.findMany({
    where: { organizationId },
    include: { athlete: true },
    orderBy: { athlete: { name: "asc" } },
  });
  return links.map((l) => l.athlete);
}

/** One athlete, only if linked to the organization. `canEdit` is false for athletes created elsewhere. */
export async function getAthleteForOrganization(
  organizationId: string,
  athleteId: string,
) {
  const link = await prisma.organizationAthlete.findUnique({
    where: { organizationId_athleteId: { organizationId, athleteId } },
    include: { athlete: true },
  });
  if (!link) return null;
  const { athlete } = link;
  return {
    athlete,
    canEdit:
      athlete.createdByOrganizationId === organizationId &&
      athlete.userId === null,
  };
}

export function listTeams(organizationId: string) {
  return prisma.team.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export function getTeam(organizationId: string, id: string) {
  return prisma.team.findFirst({ where: { id, organizationId } });
}

const refereeInclude = {
  sports: { include: { sport: { select: { id: true, name: true } } } },
} as const;

export function listReferees(organizationId: string) {
  return prisma.referee.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: refereeInclude,
  });
}

export function getReferee(organizationId: string, id: string) {
  return prisma.referee.findFirst({
    where: { id, organizationId },
    include: refereeInclude,
  });
}

/** Active sports grouped by category, for the referee form. */
export async function getSportOptions() {
  const sports = await prisma.sport.findMany({
    where: { active: true, category: { active: true } },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    include: { category: true },
  });
  const groups: {
    category: string;
    options: { id: string; name: string }[];
  }[] = [];
  for (const sport of sports) {
    const last = groups.at(-1);
    const option = { id: sport.id, name: sport.name };
    if (last && last.category === sport.category.name)
      last.options.push(option);
    else groups.push({ category: sport.category.name, options: [option] });
  }
  return groups;
}
