import { z } from "zod";
import {
  GRAND_FINAL_MODES,
  LIMITS,
  MATCH_FORMATS,
  PERFORMANCE_AGGREGATIONS,
  PERFORMANCE_METRICS,
  SCORING_MODELS,
  SEEDING_MODES,
  STAGE_TYPES,
  TIEBREAKER_BY_KEY,
  TIEBREAKER_KEYS,
  TIEBREAKER_SCOPES,
} from "./catalog";

const points = z
  .number({ error: "Informe um número." })
  .min(LIMITS.points.min, `Use no mínimo ${LIMITS.points.min}.`)
  .max(LIMITS.points.max, `Use no máximo ${LIMITS.points.max}.`)
  // Half points exist (chess); anything finer is a typo.
  .refine(
    (n) => Number.isInteger(n * 2),
    "Use inteiros ou meios pontos (ex.: 0,5).",
  );

const int = (min: number, max: number, message?: string) =>
  z
    .number({ error: message ?? "Informe um número." })
    .int("Use um número inteiro.")
    .min(min, `Use no mínimo ${min}.`)
    .max(max, `Use no máximo ${max}.`);

export const tiebreakerSchema = z.object({
  key: z.enum(TIEBREAKER_KEYS),
  scope: z.enum(TIEBREAKER_SCOPES),
});

export const pointsRuleSchema = z.object({
  label: z.string().trim().min(1).max(60),
  points,
  when: z.object({
    outcome: z.enum(["WIN", "DRAW", "LOSS"]),
    setsFor: int(0, 9).optional(),
    setsAgainst: int(0, 9).optional(),
  }),
});

export const sportConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("SETS"),
    setsToWin: int(1, 5, "Informe os sets para vencer."),
    pointsPerSet: int(1, 100, "Informe os pontos por set."),
    decidingSetPoints: int(1, 100, "Informe os pontos do set decisivo."),
    winByTwo: z.boolean(),
  }),
  z.object({
    kind: z.literal("PERFORMANCE"),
    metric: z.enum(PERFORMANCE_METRICS),
    bestIs: z.enum(["LOWEST", "HIGHEST"]),
    attempts: int(1, 10, "Informe as tentativas."),
    finalists: int(1, 64).nullable(),
    extraAttempts: int(0, 10).nullable(),
    aggregation: z.enum(PERFORMANCE_AGGREGATIONS),
  }),
]);

export const placePointSchema = z.object({
  place: int(1, 100),
  points: z.number().min(0).max(1000),
});

export const stageSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Dê um nome à fase.")
      .max(40, "Use no máximo 40 caracteres."),
    type: z.enum(STAGE_TYPES),
    groupCount: int(2, 16).nullable(),
    groupSize: int(2, 12).nullable(),
    advancingPerGroup: int(1, 12).nullable(),
    roundRobinLegs: z.union([z.literal(1), z.literal(2)]),
    swissRounds: int(1, 15).nullable(),
    thirdPlaceMatch: z.boolean(),
    grandFinalMode: z.enum(GRAND_FINAL_MODES),
    seeding: z.enum(SEEDING_MODES),
  })
  .superRefine((stage, ctx) => {
    if (stage.type === "GROUPS") {
      if (stage.groupCount == null)
        ctx.addIssue({
          code: "custom",
          path: ["groupCount"],
          message: "Informe quantos grupos.",
        });
      if (stage.groupSize == null)
        ctx.addIssue({
          code: "custom",
          path: ["groupSize"],
          message: "Informe o tamanho dos grupos.",
        });
      if (stage.advancingPerGroup == null)
        ctx.addIssue({
          code: "custom",
          path: ["advancingPerGroup"],
          message: "Informe quantos avançam por grupo.",
        });
      else if (
        stage.groupSize != null &&
        stage.advancingPerGroup > stage.groupSize
      )
        ctx.addIssue({
          code: "custom",
          path: ["advancingPerGroup"],
          message: "Não pode passar do tamanho do grupo.",
        });
    }
  });

export const rulesInputSchema = z
  .object({
    presetKey: z.string().max(40).nullable(),
    scoringModel: z.enum(SCORING_MODELS),
    winPoints: points,
    drawPoints: points,
    lossPoints: points,
    allowDraw: z.boolean(),
    pointsTable: z.array(pointsRuleSchema).max(12).nullable(),
    tiebreakers: z
      .array(tiebreakerSchema)
      .max(
        LIMITS.maxTiebreakers,
        `Use no máximo ${LIMITS.maxTiebreakers} critérios.`,
      ),
    woScoreFor: int(0, 100),
    woScoreAgainst: int(0, 100),
    woPointsAwarded: points,
    woPointsPenalty: points,
    woEliminationLimit: int(1, 10).nullable(),
    woNullifyResults: z.boolean(),
    matchFormat: z.enum(MATCH_FORMATS),
    bestOf: z.number().nullable(),
    extraTime: z.boolean(),
    penalties: z.boolean(),
    awayGoals: z.boolean(),
    sportConfig: sportConfigSchema.nullable(),
    placePoints: z.array(placePointSchema).max(30).nullable(),
    dropWorst: int(0, 10).nullable(),
    stages: z
      .array(stageSchema)
      .min(1, "Mantenha pelo menos uma fase.")
      .max(LIMITS.maxStages, `Use no máximo ${LIMITS.maxStages} fases.`),
  })
  .superRefine((r, ctx) => {
    const seen = new Set<string>();
    r.tiebreakers.forEach((t, i) => {
      const id = `${t.key}:${t.scope}`;
      if (seen.has(id))
        ctx.addIssue({
          code: "custom",
          path: ["tiebreakers", i],
          message: "Critério repetido.",
        });
      seen.add(id);
      if (t.scope === "HEAD_TO_HEAD" && !TIEBREAKER_BY_KEY[t.key].headToHead)
        ctx.addIssue({
          code: "custom",
          path: ["tiebreakers", i],
          message: "Esse critério não vale para confronto direto.",
        });
    });

    if (r.matchFormat === "BEST_OF") {
      if (r.bestOf == null || ![3, 5, 7, 9].includes(r.bestOf))
        ctx.addIssue({
          code: "custom",
          path: ["bestOf"],
          message: "Escolha melhor de 3, 5, 7 ou 9.",
        });
    }

    const expected = r.scoringModel === "POINTS" ? null : r.scoringModel;
    if ((r.sportConfig?.kind ?? null) !== expected)
      ctx.addIssue({
        code: "custom",
        path: ["sportConfig"],
        message:
          "As configurações da modalidade não combinam com o modelo de placar.",
      });
  });

export type RulesInput = z.infer<typeof rulesInputSchema>;
export type StageInput = z.infer<typeof stageSchema>;
export type SportConfig = z.infer<typeof sportConfigSchema>;

/** Flattens zod issues into { "path.to.field": "message" } (first message wins). */
export function issuesToFieldErrors(
  issues: z.core.$ZodIssue[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
