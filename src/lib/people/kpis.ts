import "server-only";

import { prisma } from "@/lib/prisma";

const share = (part: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;

export async function athleteKpis(organizationId: string) {
  const mine = { organizations: { some: { organizationId } } };
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setUTCFullYear(eighteenYearsAgo.getUTCFullYear() - 18);
  const [total, inEvents, minors, noContact, female] = await Promise.all([
    prisma.athlete.count({ where: mine }),
    prisma.athlete.count({
      where: {
        ...mine,
        registrations: {
          some: { registration: { event: { organizationId } } },
        },
      },
    }),
    prisma.athlete.count({
      where: { ...mine, birthDate: { gt: eighteenYearsAgo } },
    }),
    prisma.athlete.count({ where: { ...mine, email: null, phone: null } }),
    prisma.athlete.count({ where: { ...mine, gender: "FEMALE" } }),
  ]);
  return { total, inEvents, minors, noContact, female, share };
}

export async function teamKpis(organizationId: string) {
  const [total, active, inEvents] = await Promise.all([
    prisma.team.count({ where: { organizationId } }),
    prisma.team.count({ where: { organizationId, active: true } }),
    prisma.team.count({
      where: { organizationId, registrations: { some: {} } },
    }),
  ]);
  return {
    total,
    active,
    inactive: total - active,
    inEvents,
    idle: active - Math.min(active, inEvents),
    share,
  };
}

export async function refereeKpis(organizationId: string) {
  const now = new Date();
  const [active, upcoming, refereed, free] = await Promise.all([
    prisma.referee.count({ where: { organizationId, active: true } }),
    prisma.match.count({
      where: {
        referee: { organizationId },
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
    }),
    prisma.match.count({
      where: { referee: { organizationId }, status: { not: "SCHEDULED" } },
    }),
    prisma.referee.count({
      where: {
        organizationId,
        active: true,
        matches: { none: { status: "SCHEDULED", scheduledAt: { gte: now } } },
      },
    }),
  ]);
  return { active, upcoming, refereed, free };
}
