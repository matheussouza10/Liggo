import "server-only";

import { prisma } from "@/lib/prisma";
import {
  pointsRuleSchema,
  placePointSchema,
  sportConfigSchema,
  stageSchema,
  tiebreakerSchema,
  type RulesInput,
} from "./schema";
import { z } from "zod";

/** Event + sport (with category) + rules + stages, only for the user's organization. */
export function getEventForRules(organizationId: string, id: string) {
  return prisma.event.findFirst({
    where: { id, organizationId },
    include: {
      sport: { include: { category: true } },
      eventType: { select: { name: true } },
      format: { select: { name: true } },
      rules: true,
      stages: { orderBy: { order: "asc" } },
    },
  });
}

type EventWithRules = NonNullable<Awaited<ReturnType<typeof getEventForRules>>>;

const parseJson = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  fallback: z.infer<T>,
): z.infer<T> => {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
};

/** Turns the stored rows back into the form shape. Returns null when none were saved. */
export function storedRulesToInput(
  event: Pick<EventWithRules, "rules" | "stages">,
): RulesInput | null {
  const r = event.rules;
  if (!r) return null;
  return {
    presetKey: r.presetKey,
    scoringModel: r.scoringModel,
    winPoints: r.winPoints,
    drawPoints: r.drawPoints,
    lossPoints: r.lossPoints,
    allowDraw: r.allowDraw,
    pointsTable:
      r.pointsTable == null
        ? null
        : parseJson(z.array(pointsRuleSchema), r.pointsTable, []),
    tiebreakers: parseJson(z.array(tiebreakerSchema), r.tiebreakers, []),
    woScoreFor: r.woScoreFor,
    woScoreAgainst: r.woScoreAgainst,
    woPointsAwarded: r.woPointsAwarded,
    woPointsPenalty: r.woPointsPenalty,
    woEliminationLimit: r.woEliminationLimit,
    woNullifyResults: r.woNullifyResults,
    matchFormat: r.matchFormat,
    bestOf: r.bestOf,
    extraTime: r.extraTime,
    penalties: r.penalties,
    awayGoals: r.awayGoals,
    sportConfig:
      r.sportConfig == null
        ? null
        : (sportConfigSchema.safeParse(r.sportConfig).data ?? null),
    placePoints:
      r.placePoints == null
        ? null
        : parseJson(z.array(placePointSchema), r.placePoints, []),
    dropWorst: r.dropWorst,
    stages: event.stages.map((s) =>
      stageSchema.parse({
        name: s.name,
        type: s.type,
        groupCount: s.groupCount,
        groupSize: s.groupSize,
        advancingPerGroup: s.advancingPerGroup,
        roundRobinLegs: s.roundRobinLegs,
        swissRounds: s.swissRounds,
        thirdPlaceMatch: s.thirdPlaceMatch,
        grandFinalMode: s.grandFinalMode,
        seeding: s.seeding,
      }),
    ),
  };
}
