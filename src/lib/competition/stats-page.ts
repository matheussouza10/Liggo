import "server-only";

import { prisma } from "@/lib/prisma";
import { getEventOverview } from "./stats-queries";

/**
 * The data of an event statistics page: the event name, its categories, the
 * selected category and the overview. Scoped to an organization, or to public
 * events only.
 */
export async function getEventStats(
  eventId: string,
  categoryParam: string | undefined,
  scope: { organizationId: string } | { publicOnly: true },
) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ...("organizationId" in scope
        ? { organizationId: scope.organizationId }
        : { publicVisible: true }),
    },
    select: {
      name: true,
      categories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
  if (!event) return null;
  const selected =
    event.categories.find((c) => c.id === categoryParam) ??
    event.categories[0] ??
    null;
  const overview = await getEventOverview(
    eventId,
    selected?.id ?? null,
    "publicOnly" in scope,
  );
  if (!overview) return null;
  return {
    eventName: event.name,
    categories: event.categories,
    selectedId: selected?.id ?? null,
    overview,
  };
}
