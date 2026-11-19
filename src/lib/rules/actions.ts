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

  // Stages that already have a draw or matches are referenced by them: they
  // must stay as they are (rewriting would erase the competition).
  const drawn = await prisma.stageRun.count({
    where: { stage: { eventId: event.id } },
  });
  const rulesUpsert = prisma.eventRules.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, ...data },
    update: data,
  });

  if (drawn > 0) {
    const current = await prisma.eventStage.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { runs: true } } },
    });
    const same =
      current.length === r.stages.length &&
      current.every((c, i) => {
        const n = r.stages[i];
        return (
          c.name === n.name &&
          c.type === n.type &&
          c.groupCount === n.groupCount &&
          c.groupSize === n.groupSize &&
          c.advancingPerGroup === n.advancingPerGroup &&
          c.roundRobinLegs === n.roundRobinLegs &&
          c.swissRounds === n.swissRounds &&
          c.thirdPlaceMatch === n.thirdPlaceMatch &&
          c.grandFinalMode === n.grandFinalMode &&
          c.seeding === n.seeding
        );
      });
    if (!same) {
      return {
        error:
          "As fases já têm sorteio. Desfaça o sorteio das fases antes de alterá-las.",
      };
    }
    // The matchups of a stage that has not started can still change.
    const changedStarted = current.find(
      (c, i) =>
        c._count.runs > 0 &&
        JSON.stringify(c.pairings ?? null) !==
          JSON.stringify(r.stages[i].pairings ?? null),
    );
    if (changedStarted) {
      return {
        error: `A fase "${changedStarted.name}" já começou: os confrontos dela não podem mais mudar.`,
      };
    }
    await prisma.$transaction([
      rulesUpsert,
      ...current
        .filter((c) => c._count.runs === 0)
        .map((c) =>
          prisma.eventStage.update({
            where: { id: c.id },
            data: {
              pairings: r.stages[c.order - 1].pairings ?? Prisma.DbNull,
            },
          }),
        ),
    ]);
  } else {
    await prisma.$transaction([
      rulesUpsert,
      prisma.eventStage.deleteMany({ where: { eventId: event.id } }),
      prisma.eventStage.createMany({
        data: r.stages.map((s, index) => ({
          eventId: event.id,
          order: index + 1,
          ...s,
          pairings: s.pairings ?? Prisma.DbNull,
        })),
      }),
    ]);
  }

  revalidatePath("/events", "layout");
  redirect(`/events/${event.id}`);
}
