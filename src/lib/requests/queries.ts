import "server-only";

import { hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

/** What the public form needs. Shown even when the event is hidden from the public site: the link was sent by the organizer. */
export function getRegistrationEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      locationName: true,
      city: true,
      state: true,
      participationType: true,
      registrationOpen: true,
      registrationDeadline: true,
      registrationNotes: true,
      sportId: true,
      sport: {
        select: {
          name: true,
          positions: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true },
          },
        },
      },
      organization: { select: { name: true } },
      categories: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          gender: true,
          minAge: true,
          maxAge: true,
          rosterMin: true,
          rosterMax: true,
        },
      },
    },
  });
}

/** A request by the secret of its status link. Only names are returned, never documents. */
export function getRequestByToken(token: string) {
  return prisma.registrationRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      status: true,
      teamName: true,
      contactName: true,
      rejectionReason: true,
      createdAt: true,
      decidedAt: true,
      event: {
        select: {
          id: true,
          name: true,
          participationType: true,
          organization: { select: { name: true } },
        },
      },
      category: { select: { name: true } },
      members: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });
}

export function listRequests(eventId: string) {
  return prisma.registrationRequest.findMany({
    where: { eventId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      teamName: true,
      contactName: true,
      contactEmail: true,
      createdAt: true,
      category: { select: { name: true } },
      _count: { select: { members: true } },
      members: { take: 1, orderBy: { name: "asc" }, select: { name: true } },
    },
  });
}

export function countPendingRequests(eventId: string) {
  return prisma.registrationRequest.count({
    where: { eventId, status: "PENDING" },
  });
}
