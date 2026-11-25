import "server-only";

import { prisma } from "@/lib/prisma";
import { limitMessage, type LimitKind } from "./limits";

/** The plan used by organizations that did not subscribe to another. */
export async function ensureDefaultPlan() {
  const existing = await prisma.plan.findFirst({ where: { isDefault: true } });
  if (existing) return existing;
  // First run: a free plan so the system works before the administrator registers plans.
  return prisma.plan.upsert({
    where: { name: "Starter" },
    update: { isDefault: true },
    create: {
      name: "Starter",
      description:
        "Plano gratuito com limites de eventos e inscrições por evento; atletas sem limite.",
      priceCents: 0,
      maxEvents: 8,
      maxAthletes: null,
      maxRegistrationsPerEvent: 64,
      isDefault: true,
      sortOrder: 0,
    },
  });
}

/** The plan in force for an organization: the one it pays for while active, otherwise the default. */
export async function planOf(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStatus: true, plan: true },
  });
  const paid =
    org?.plan &&
    org.plan.active &&
    (org.subscriptionStatus === "ACTIVE" ||
      org.subscriptionStatus === "OVERDUE")
      ? org.plan
      : null;
  return paid ?? (await ensureDefaultPlan());
}

export async function usageOf(organizationId: string) {
  const [events, athletes] = await Promise.all([
    prisma.event.count({ where: { organizationId } }),
    prisma.organizationAthlete.count({ where: { organizationId } }),
  ]);
  return { events, athletes };
}

/** null when one more fits in the plan; otherwise the message to show the organizer. */
export async function checkLimit(
  organizationId: string,
  kind: LimitKind,
  options: { eventId?: string; adding?: number } = {},
): Promise<string | null> {
  const plan = await planOf(organizationId);
  const adding = options.adding ?? 1;
  let current: number;
  if (kind === "events")
    current = await prisma.event.count({ where: { organizationId } });
  else if (kind === "athletes")
    current = await prisma.organizationAthlete.count({
      where: { organizationId },
    });
  else
    current = options.eventId
      ? await prisma.registration.count({ where: { eventId: options.eventId } })
      : 0;
  // `adding` > 1 (a roster of new athletes): check the last one that would be added.
  return limitMessage(plan, kind, current + adding - 1);
}
