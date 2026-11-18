import "server-only";

import { prisma } from "@/lib/prisma";

const include = {
  eventType: { select: { name: true } },
  format: { select: { name: true } },
  sport: { select: { name: true } },
} as const;

/** Always scoped to one organization: a user never sees another tenant's events. */
export function listEvents(organizationId: string) {
  return prisma.event.findMany({
    where: { organizationId },
    orderBy: [{ startDate: "asc" }, { name: "asc" }],
    include,
  });
}

export function getEvent(organizationId: string, id: string) {
  return prisma.event.findFirst({
    where: { id, organizationId },
    include: { ...include, rules: true, stages: { orderBy: { order: "asc" } } },
  });
}
