"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { issuesToFieldErrors, rulesInputSchema } from "./schema";

export type SaveRulesResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Saves an event's rules and stages in one transaction. The payload is
 * validated here (never trusted from the client) and the event must belong
 * to the signed-in user's organization.
 */
export async function saveEventRulesAction(
  eventId: string,
  payload: unknown,
): Promise<SaveRulesResult> {
  const user = await requireOrganizationUser();
  if (!user.organization || typeof eventId !== "string") {
    return { error: "Evento não encontrado." };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organization.id },
    select: { id: true, rulesLockedAt: true },
  });
  if (!event) return { error: "Evento não encontrado." };
  if (event.rulesLockedAt) {
    return {
      error:
        "As regras não podem mais ser alteradas: o evento já teve partidas.",
    };
  }

  const parsed = rulesInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues),
    };
  }
  const r = parsed.data;

  const data = {
    presetKey: r.presetKey,
    scoringModel: r.scoringModel,
    winPoints: r.winPoints,
    drawPoints: r.allowDraw ? r.drawPoints : 0,
    lossPoints: r.lossPoints,
    allowDraw: r.allowDraw,
    pointsTable: r.pointsTable ?? Prisma.DbNull,
    tiebreakers: r.tiebreakers,
    woScoreFor: r.woScoreFor,
    woScoreAgainst: r.woScoreAgainst,
    woPointsAwarded: r.woPointsAwarded,
    woPointsPenalty: r.woPointsPenalty,
    woEliminationLimit: r.woEliminationLimit,
    woNullifyResults: r.woNullifyResults,
    matchFormat: r.matchFormat,
    bestOf: r.matchFormat === "BEST_OF" ? r.bestOf : null,
    extraTime: r.extraTime,
    penalties: r.penalties,
    awayGoals: r.matchFormat === "HOME_AWAY" ? r.awayGoals : false,
    sportConfig: r.sportConfig ?? Prisma.DbNull,
    placePoints: r.placePoints ?? Prisma.DbNull,
    dropWorst: r.dropWorst,
  };

  await prisma.$transaction([
    prisma.eventRules.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, ...data },
      update: data,
    }),
    prisma.eventStage.deleteMany({ where: { eventId: event.id } }),
    prisma.eventStage.createMany({
      data: r.stages.map((s, index) => ({
        eventId: event.id,
        order: index + 1,
        ...s,
      })),
    }),
  ]);

  revalidatePath("/events", "layout");
  redirect(`/events/${event.id}`);
}
