"use server";

import {
  buildDoubleElimination,
  canBuildDoubleElimination,
} from "./double-elim";
import { evaluateSets, setsConfigOf } from "./sets";
import { WIN_METHODS } from "./win-method";
import {
  isBarMode,
  maxAttemptsFor,
  perfConfigOf,
  tiebreakerKeys,
} from "./performance";
import { maxSwissRounds, pairSwiss } from "./swiss";
import { evaluateSeries, seriesConfigOf } from "./series";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/text";
import { crossQualified } from "./advance";
import { isValidOrder } from "./pairings";
import {
  resolveTemplate,
  validateTemplate,
  type StageCfg,
} from "./pairing-template";
import { Prisma } from "@/generated/prisma/client";
import { pairingSchema } from "@/lib/rules/schema";
import { buildSingleElimination, planRound } from "./bracket";
import { drawBracketOrder, drawGroups, type DrawMode } from "./draw";
import { roundRobin } from "./fixtures";
import { mulberry32, newSeed, shuffle } from "./prng";
import {
  entryName,
  isSupportedStage,
  runTables,
  standingsRules,
  getRunDetail,
} from "./queries";
import { autoSchedule, localDateTime } from "./timeslots";

export type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

async function orgEvent(eventId: string) {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (!organizationId || typeof eventId !== "string") return null;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    include: { rules: true, stages: { orderBy: { order: "asc" } } },
  });
  return event ? { organizationId, event, userId: user.id } : null;
}

const refresh = (eventId: string): ActionResult => {
  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/calendar");
  return { ok: true };
};

/** A run of this event, with its stage; null when it is not the organization's. */
async function loadRun(eventId: string, runId: string) {
  const ctx = await orgEvent(eventId);
  if (!ctx || typeof runId !== "string") return null;
  const run = await prisma.stageRun.findFirst({
    where: { id: runId, stage: { eventId } },
    include: { stage: true },
  });
  return run ? { ...ctx, run } : null;
}

async function resultsCount(runId: string) {
  const [matches, attempts] = await Promise.all([
    // A bye (sitting out a swiss round) is not a result somebody entered.
    prisma.match.count({
      where: {
        stageRunId: runId,
        status: { not: "SCHEDULED" },
        NOT: { status: "WALKOVER", awayEntryId: null },
      },
    }),
    prisma.performanceAttempt.count({
      where: { entry: { stageRunId: runId } },
    }),
  ]);
  return matches + attempts;
}

// ---------------------------------------------------------------- draw

const drawSchema = z.object({
  mode: z.enum(["MANUAL", "RANDOM", "RANKING", "SNAKE"]),
  seeds: z.record(z.string(), z.number().int().min(1).max(999).nullable()),
});

export async function drawStageAction(
  eventId: string,
  stageId: string,
  categoryId: string,
  payload: unknown,
): Promise<ActionResult> {
  const ctx = await orgEvent(eventId);
  if (!ctx || typeof stageId !== "string" || typeof categoryId !== "string")
    return fail("Evento não encontrado.");
  const { event } = ctx;

  const stageIndex = event.stages.findIndex((s) => s.id === stageId);
  const stage = event.stages[stageIndex];
  if (!stage) return fail("Fase não encontrada.");
  if (!event.rules)
    return fail("Configure as regras do evento antes de sortear.");
  if (!isSupportedStage(stage.type))
    return fail("Este tipo de fase ainda não está disponível.");
  if (stageIndex > 0)
    return fail("Os participantes desta fase vêm da fase anterior.");

  const category = await prisma.eventCategory.findFirst({
    where: { id: categoryId, eventId },
  });
  if (!category) return fail("Categoria não encontrada.");

  const parsed = drawSchema.safeParse(payload);
  if (!parsed.success)
    return fail("Escolha o modo de sorteio e use cabeças de chave de 1 a 999.");
  const { mode, seeds } = parsed.data;
  const given = Object.values(seeds).filter((s): s is number => s != null);
  if (new Set(given).size !== given.length)
    return fail("Há cabeças de chave repetidas.");

  const registrations = await prisma.registration.findMany({
    where: { eventId, categoryId },
    select: { id: true },
  });
  const needed = stage.type === "GROUPS" ? (stage.groupCount ?? 2) * 2 : 2;
  if (registrations.length < needed) {
    return fail(
      stage.type === "GROUPS"
        ? `Esta fase precisa de pelo menos ${needed} inscrições (2 por grupo).`
        : "É preciso ter pelo menos 2 inscrições.",
    );
  }

  const existing = await prisma.stageRun.findUnique({
    where: { stageId_categoryId: { stageId, categoryId } },
  });
  if (existing) {
    if ((await resultsCount(existing.id)) > 0)
      return fail(
        "Já existem resultados nesta fase. Não é possível sortear de novo.",
      );
    const later = await prisma.stageRun.count({
      where: { categoryId, stage: { eventId, order: { gt: stage.order } } },
    });
    if (later > 0)
      return fail(
        "A fase seguinte já foi montada. Desfaça-a antes de sortear de novo.",
      );
  }

  const rnd = mulberry32(newSeed());
  const drawSeed = newSeed();
  const entries = registrations.map((r) => ({
    id: r.id,
    seed: seeds[r.id] ?? null,
  }));
  const runId = randomUUID();
  const rows: {
    id: string;
    stageRunId: string;
    registrationId: string;
    groupId: string | null;
    seed: number | null;
    position: number;
  }[] = [];
  let groupRows: {
    id: string;
    stageRunId: string;
    name: string;
    order: number;
  }[] = [];
  const seedOf = new Map(entries.map((e) => [e.id, e.seed]));

  if (stage.type === "GROUPS") {
    const count = stage.groupCount ?? 2;
    groupRows = Array.from({ length: count }, (_, i) => ({
      id: randomUUID(),
      stageRunId: runId,
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      order: i + 1,
    }));
    const distribution = drawGroups(mode as DrawMode, entries, count, rnd);
    if (mode === "MANUAL") {
      entries.forEach((e, i) =>
        rows.push({
          id: randomUUID(),
          stageRunId: runId,
          registrationId: e.id,
          groupId: null,
          seed: seedOf.get(e.id) ?? null,
          position: i,
        }),
      );
    } else {
      // The slot inside a group is drawn too (it sets the fixture order).
      distribution.forEach((ids, g) =>
        shuffle(ids, rnd).forEach((id, i) =>
          rows.push({
            id: randomUUID(),
            stageRunId: runId,
            registrationId: id,
            groupId: groupRows[g].id,
            seed: seedOf.get(id) ?? null,
            position: i,
          }),
        ),
      );
    }
  } else {
    drawBracketOrder(mode as DrawMode, entries, rnd).forEach((id, i) =>
      rows.push({
        id: randomUUID(),
        stageRunId: runId,
        registrationId: id,
        groupId: null,
        seed: seedOf.get(id) ?? null,
        position: i,
      }),
    );
  }

  await prisma.$transaction(async (tx) => {
    if (existing) await tx.stageRun.delete({ where: { id: existing.id } });
    await tx.stageRun.create({
      data: { id: runId, stageId, categoryId, drawSeed, drawMode: mode },
    });
    if (groupRows.length) await tx.stageGroup.createMany({ data: groupRows });
    await tx.stageEntry.createMany({ data: rows });
  });
  return refresh(eventId);
}

export async function moveEntryAction(
  eventId: string,
  entryId: string,
  groupId: string | null,
): Promise<ActionResult> {
  const ctx = await orgEvent(eventId);
  if (!ctx || typeof entryId !== "string")
    return fail("Evento não encontrado.");
  const entry = await prisma.stageEntry.findFirst({
    where: { id: entryId, stageRun: { stage: { eventId } } },
    include: { stageRun: { select: { id: true, status: true } } },
  });
  if (!entry) return fail("Participante não encontrado.");
  if (entry.stageRun.status !== "DRAWN")
    return fail(
      "Os jogos já foram gerados. Desfaça os jogos para mover participantes.",
    );
  if (groupId !== null) {
    const group = await prisma.stageGroup.findFirst({
      where: { id: String(groupId), stageRunId: entry.stageRun.id },
      select: { id: true },
    });
    if (!group) return fail("Grupo não encontrado.");
  }
  await prisma.stageEntry.update({ where: { id: entryId }, data: { groupId } });
  return refresh(eventId);
}

/** Undoes a draw. Only without results and without a later stage built from it. */
export async function resetRunAction(
  eventId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run, event } = ctx;
  if ((await resultsCount(run.id)) > 0)
    return fail("Já existem resultados. Não é possível desfazer o sorteio.");
  const later = await prisma.stageRun.count({
    where: {
      categoryId: run.categoryId,
      stage: { eventId, order: { gt: run.stage.order } },
    },
  });
  if (later > 0)
    return fail("A fase seguinte já foi montada. Desfaça-a primeiro.");

  await prisma.$transaction(async (tx) => {
    await tx.stageRun.delete({ where: { id: run.id } });
    // The previous stage was closed to build this one; reopen it.
    const previous = event.stages.find((s) => s.order === run.stage.order - 1);
    if (previous)
      await tx.stageRun.updateMany({
        where: { stageId: previous.id, categoryId: run.categoryId },
        data: { status: "LIVE" },
      });
  });
  return refresh(eventId);
}

// ---------------------------------------------------------------- matchups

/**
 * Chooses who plays whom in a knockout stage that was not played yet. `order`
 * lists the participants so that slot 1 plays slot 2, slot 3 plays slot 4 and
 * so on. `null` goes back to the automatic matchups.
 */
export async function savePairingsAction(
  eventId: string,
  runId: string,
  order: unknown,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run } = ctx;
  if (run.stage.type !== "SINGLE_ELIM" && run.stage.type !== "DOUBLE_ELIM")
    return fail("Só o mata-mata tem confrontos para escolher.");
  if (run.status !== "DRAWN")
    return fail(
      "Os jogos já foram gerados. Desfaça os jogos para mudar os confrontos.",
    );

  const entries = await prisma.stageEntry.findMany({
    where: { stageRunId: run.id },
    select: { id: true, seed: true },
  });

  if (order === null) {
    if (entries.some((e) => e.seed == null))
      return fail("Não há ordem automática guardada. Sorteie de novo.");
    await prisma.$transaction([
      ...entries.map((e) =>
        prisma.stageEntry.update({
          where: { id: e.id },
          data: { position: (e.seed as number) - 1 },
        }),
      ),
      prisma.stageRun.update({
        where: { id: run.id },
        data: { manualPairing: false },
      }),
    ]);
    return refresh(eventId);
  }

  if (
    !Array.isArray(order) ||
    !order.every((x) => typeof x === "string") ||
    !isValidOrder(
      order,
      entries.map((e) => e.id),
    )
  ) {
    return fail(
      "Os confrontos precisam usar cada participante uma vez, em número par.",
    );
  }
  await prisma.$transaction([
    ...(order as string[]).map((id, position) =>
      prisma.stageEntry.update({ where: { id }, data: { position } }),
    ),
    prisma.stageRun.update({
      where: { id: run.id },
      data: { manualPairing: true },
    }),
  ]);
  return refresh(eventId);
}

/**
 * Sets the matchups of a knockout stage by origin, at configuration time. Works
 * even when the rules are locked, as long as the stage has not started in any
 * category. `null` goes back to the automatic cross.
 */
export async function saveStagePairingsAction(
  eventId: string,
  stageId: string,
  template: unknown,
): Promise<ActionResult> {
  const ctx = await orgEvent(eventId);
  if (!ctx || typeof stageId !== "string")
    return fail("Evento não encontrado.");
  const { event } = ctx;
  const index = event.stages.findIndex((x) => x.id === stageId);
  const stage = event.stages[index];
  if (!stage) return fail("Fase não encontrada.");
  if (stage.type !== "SINGLE_ELIM")
    return fail("Só o mata-mata tem confrontos para escolher.");
  if ((await prisma.stageRun.count({ where: { stageId } })) > 0)
    return fail(
      "Esta fase já começou. Para mudar os confrontos, use a aba Participantes da fase.",
    );

  if (template === null) {
    await prisma.eventStage.update({
      where: { id: stageId },
      data: { pairings: Prisma.DbNull },
    });
    return refresh(eventId);
  }
  const parsed = z.array(pairingSchema).max(32).safeParse(template);
  if (!parsed.success) return fail("Confrontos inválidos.");
  const cfg: StageCfg[] = event.stages.map((x) => ({
    name: x.name,
    type: x.type,
    groupCount: x.groupCount,
    advancingPerGroup: x.advancingPerGroup,
  }));
  const message = validateTemplate(cfg, index, parsed.data);
  if (message) return fail(message);
  await prisma.eventStage.update({
    where: { id: stageId },
    data: { pairings: parsed.data },
  });
  return refresh(eventId);
}

// ---------------------------------------------------------------- matches

export async function generateMatchesAction(
  eventId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run, event } = ctx;
  const { stage } = run;
  if (run.status !== "DRAWN")
    return fail("Os jogos desta fase já foram gerados.");
  if (!event.rules) return fail("Configure as regras do evento primeiro.");

  const entries = await prisma.stageEntry.findMany({
    where: { stageRunId: run.id },
    orderBy: { position: "asc" },
    select: { id: true, groupId: true, seed: true },
  });
  type NewMatch = {
    id: string;
    stageRunId: string;
    groupId: string | null;
    round: number;
    position: number;
    label: string;
    homeEntryId: string | null;
    awayEntryId: string | null;
    nextMatchId?: string | null;
    nextSlot?: "HOME" | "AWAY" | null;
    loserMatchId?: string | null;
    loserSlot?: "HOME" | "AWAY" | null;
    /** Sits out the round (swiss with an odd field): a win with no opponent. */
    bye?: boolean;
  };
  const data: NewMatch[] = [];

  const league = (ids: string[], groupId: string | null) => {
    const perRound = new Map<number, number>();
    for (const m of roundRobin(ids, stage.roundRobinLegs as 1 | 2)) {
      const pos = perRound.get(m.round) ?? 0;
      perRound.set(m.round, pos + 1);
      data.push({
        id: randomUUID(),
        stageRunId: run.id,
        groupId,
        round: m.round,
        position: pos,
        label: `Rodada ${m.round}`,
        homeEntryId: m.home,
        awayEntryId: m.away,
      });
    }
  };

  if (stage.type === "ROUND_ROBIN") {
    league(
      entries.map((e) => e.id),
      null,
    );
  } else if (stage.type === "GROUPS") {
    const groups = await prisma.stageGroup.findMany({
      where: { stageRunId: run.id },
      orderBy: { order: "asc" },
    });
    if (entries.some((e) => !e.groupId))
      return fail(
        "Distribua todos os participantes nos grupos antes de gerar os jogos.",
      );
    for (const g of groups) {
      const ids = entries.filter((e) => e.groupId === g.id).map((e) => e.id);
      if (ids.length < 2)
        return fail(`${g.name} precisa de pelo menos 2 participantes.`);
      league(ids, g.id);
    }
  } else if (stage.type === "PERFORMANCE") {
    // A performance event has no matches: starting it just opens the results.
  } else if (stage.type === "SWISS") {
    // Round one now; the next rounds are generated one at a time from the standings.
    const rounds = stage.swissRounds ?? 0;
    if (rounds < 1)
      return fail("Informe o número de rodadas nas regras desta fase.");
    if (rounds > maxSwissRounds(entries.length))
      return fail(
        `Com ${entries.length} participantes o máximo é ${maxSwissRounds(entries.length)} rodadas, para ninguém repetir adversário.`,
      );
    const first = pairSwiss(
      entries.map((e, i) => ({
        id: e.id,
        points: 0,
        rank: e.seed ?? i + 1,
        played: new Set<string>(),
      })),
    );
    if ("error" in first) return fail(first.error);
    if (first.bye)
      data.push({
        id: randomUUID(),
        stageRunId: run.id,
        groupId: null,
        round: 1,
        position: first.pairs.length,
        label: "Rodada 1 (folga)",
        homeEntryId: first.bye,
        awayEntryId: null,
        bye: true,
      });
    first.pairs.forEach((p, i) =>
      data.push({
        id: randomUUID(),
        stageRunId: run.id,
        groupId: null,
        round: 1,
        position: i,
        label: "Rodada 1",
        homeEntryId: p.home,
        awayEntryId: p.away,
      }),
    );
  } else if (stage.type === "SINGLE_ELIM" || stage.type === "DOUBLE_ELIM") {
    const index = event.stages.findIndex((s) => s.id === stage.id);
    const adjacent =
      event.stages[index - 1]?.type === "SINGLE_ELIM" || run.manualPairing;
    const roundOnly = event.stages[index + 1]?.type === "SINGLE_ELIM";
    const order = entries.map((e) => e.id);
    const double = stage.type === "DOUBLE_ELIM";
    if (double) {
      if (!canBuildDoubleElimination(order.length))
        return fail(
          `A dupla eliminação aceita de 3 a 64 participantes (são ${order.length}). Ajuste as inscrições ou use outro formato.`,
        );
      if (stage.grandFinalMode === "NONE")
        return fail(
          "A dupla eliminação precisa de uma final. Escolha Final única ou Final com jogo extra nas regras da fase.",
        );
    }

    // A knockout followed by another knockout is one round only (for example
    // "Quartas", "Semifinal" and "Final" as separate stages).
    const plan = double
      ? buildDoubleElimination(order, { adjacent: run.manualPairing })
      : roundOnly
        ? (() => {
            const r = planRound(order, stage.thirdPlaceMatch, { adjacent });
            return [...r.matches, ...(r.third ? [r.third] : [])];
          })()
        : buildSingleElimination(order, stage.thirdPlaceMatch, { adjacent });
    const ids = new Map(plan.map((m) => [m.key, randomUUID()]));
    for (const m of plan) {
      data.push({
        id: ids.get(m.key)!,
        stageRunId: run.id,
        groupId: null,
        round: m.round,
        position: m.position,
        label: m.label,
        homeEntryId: m.home,
        awayEntryId: m.away,
        nextMatchId: m.next ? (ids.get(m.next.key) ?? null) : null,
        nextSlot: m.next?.slot ?? null,
        loserMatchId: m.loser ? (ids.get(m.loser.key) ?? null) : null,
        loserSlot: m.loser?.slot ?? null,
      });
    }
  } else {
    return fail("Este tipo de fase ainda não está disponível.");
  }

  // Matches reference each other, so insert without the links first, then link.
  await prisma.$transaction(async (tx) => {
    await tx.match.createMany({
      data: data.map((m) => ({
        id: m.id,
        stageRunId: m.stageRunId,
        groupId: m.groupId,
        round: m.round,
        position: m.position,
        label: m.label,
        homeEntryId: m.homeEntryId,
        awayEntryId: m.awayEntryId,
        // A bye is a win already: the participant sits out and gets the walkover points.
        ...(m.bye
          ? {
              status: "WALKOVER" as const,
              winnerEntryId: m.homeEntryId,
              homeScore: event.rules?.woScoreFor ?? 0,
              awayScore: event.rules?.woScoreAgainst ?? 0,
            }
          : {}),
      })),
    });
    for (const m of data) {
      if (m.nextMatchId || m.loserMatchId) {
        await tx.match.update({
          where: { id: m.id },
          data: {
            nextMatchId: m.nextMatchId ?? null,
            nextSlot: m.nextSlot ?? null,
            loserMatchId: m.loserMatchId ?? null,
            loserSlot: m.loserSlot ?? null,
          },
        });
      }
    }
    await tx.stageRun.update({
      where: { id: run.id },
      data: { status: "LIVE" },
    });
  });
  return refresh(eventId);
}

export async function resetMatchesAction(
  eventId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run } = ctx;
  if (run.status !== "LIVE")
    return fail("Só é possível desfazer os jogos de uma fase em andamento.");
  if ((await resultsCount(run.id)) > 0)
    return fail("Já existem resultados. Não é possível desfazer os jogos.");
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { stageRunId: run.id } }),
    prisma.stageRun.update({
      where: { id: run.id },
      data: { status: "DRAWN" },
    }),
  ]);
  return refresh(eventId);
}

// ---------------------------------------------------------------- results

const resultSchema = z
  .object({
    homeScore: z
      .number()
      .int("Use números inteiros.")
      .min(0, "Placar de 0 a 999.")
      .max(999, "Placar de 0 a 999.")
      .nullable(),
    awayScore: z
      .number()
      .int("Use números inteiros.")
      .min(0, "Placar de 0 a 999.")
      .max(999, "Placar de 0 a 999.")
      .nullable(),
    homePenalties: z.number().int().min(0).max(99).nullable(),
    awayPenalties: z.number().int().min(0).max(99).nullable(),
    walkover: z.enum(["HOME", "AWAY"]).nullable(),
    /** Score of each set (scoring by sets only). */
    sets: z
      .array(
        z.object({
          home: z.number().int().min(0).max(999),
          away: z.number().int().min(0).max(999),
        }),
      )
      .max(9)
      .optional(),
    /** How the match was won (combat sports), optional. */
    winMethod: z.enum(WIN_METHODS).nullable().optional(),
    /** Games of a knockout tie played as a series (best of N or two legs). */
    games: z
      .array(
        z.object({
          home: z.number().int().min(0).max(999),
          away: z.number().int().min(0).max(999),
        }),
      )
      .max(9)
      .optional(),
  })
  .refine(
    (r) =>
      r.walkover !== null ||
      (r.sets?.length ?? 0) > 0 ||
      (r.games?.length ?? 0) > 0 ||
      (r.homeScore !== null && r.awayScore !== null),
    { message: "Informe o placar dos dois lados." },
  );

async function loadMatch(eventId: string, matchId: string) {
  const ctx = await orgEvent(eventId);
  if (!ctx || typeof matchId !== "string") return null;
  const match = await prisma.match.findFirst({
    where: { id: matchId, stageRun: { stage: { eventId } } },
    include: { stageRun: { include: { stage: true } } },
  });
  return match ? { ...ctx, match } : null;
}

const DECISIVE_LABEL = "Final decisiva";

/**
 * Grand final with a reset: the extra game exists only if the losers bracket
 * champion wins the first one (both would then have one loss).
 */
const isResetGrandFinal = (m: {
  label: string | null;
  stageRun: { stage: { type: string; grandFinalMode: string } };
}) =>
  m.stageRun.stage.type === "DOUBLE_ELIM" &&
  m.stageRun.stage.grandFinalMode === "RESET" &&
  m.label === "Final";

const playedStatuses = ["FINISHED", "WALKOVER"];

export async function saveResultAction(
  eventId: string,
  matchId: string,
  payload: unknown,
): Promise<ActionResult> {
  const ctx = await loadMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match, event } = ctx;
  const rules = event.rules;
  if (!rules) return fail("O evento não tem regras.");
  if (match.stageRun.status !== "LIVE")
    return fail("A fase não está em andamento.");
  if (!match.homeEntryId || !match.awayEntryId)
    return fail("Este jogo ainda não tem os dois participantes.");

  const parsed = resultSchema.safeParse(payload);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Resultado inválido.");
  const r = parsed.data;
  const knockout =
    match.stageRun.stage.type === "SINGLE_ELIM" ||
    match.stageRun.stage.type === "DOUBLE_ELIM";
  const setsConfig = setsConfigOf(rules);
  const series = knockout ? seriesConfigOf(rules) : null;

  const resetFinal = isResetGrandFinal(match);
  if (resetFinal) {
    const decisive = await prisma.match.findFirst({
      where: { stageRunId: match.stageRunId, label: DECISIVE_LABEL },
      select: { status: true },
    });
    if (decisive && decisive.status !== "SCHEDULED")
      return fail(
        "A final decisiva já foi disputada. Desfaça o resultado dela antes de corrigir esta.",
      );
  }

  if (playedStatuses.includes(match.status)) {
    const downstream = [match.nextMatchId, match.loserMatchId].filter(
      (x): x is string => !!x,
    );
    if (
      downstream.length &&
      (await prisma.match.count({
        where: { id: { in: downstream }, status: { not: "SCHEDULED" } },
      })) > 0
    ) {
      return fail(
        "O jogo seguinte já foi disputado. Desfaça o resultado dele antes de corrigir este.",
      );
    }
  }

  let homeScore: number, awayScore: number;
  let homePen: number | null = null,
    awayPen: number | null = null;
  let winner: string | null;
  if (r.walkover) {
    homeScore = r.walkover === "HOME" ? rules.woScoreFor : rules.woScoreAgainst;
    awayScore = r.walkover === "AWAY" ? rules.woScoreFor : rules.woScoreAgainst;
    winner = r.walkover === "HOME" ? match.homeEntryId : match.awayEntryId;
  } else if (series) {
    // A tie over several games: the games decide the score and the winner.
    const games = r.games ?? [];
    const pens =
      r.homePenalties != null && r.awayPenalties != null
        ? { home: r.homePenalties, away: r.awayPenalties }
        : null;
    const out = evaluateSeries(series, games, pens);
    if (out.error) return fail(out.error);
    if (!out.complete) {
      // Not decided yet: keep the games played so far and leave the tie open.
      if (playedStatuses.includes(match.status))
        return fail(
          "Este confronto já foi decidido. Limpe o resultado antes de reabrir a série.",
        );
      await prisma.$transaction([
        prisma.matchGame.deleteMany({ where: { matchId: match.id } }),
        prisma.matchGame.createMany({
          data: games.map((g, i) => ({
            matchId: match.id,
            number: i + 1,
            homeScore: g.home,
            awayScore: g.away,
          })),
        }),
        // The game that was live is over: the next one starts from zero.
        prisma.match.update({
          where: { id: match.id },
          data: { startedAt: null, liveHome: 0, liveAway: 0 },
        }),
      ]);
      return refresh(eventId);
    }
    homeScore = out.homeScore;
    awayScore = out.awayScore;
    winner = out.winner === "HOME" ? match.homeEntryId : match.awayEntryId;
    if (out.decidedBy === "PENALTIES" && pens) {
      homePen = pens.home;
      awayPen = pens.away;
    }
  } else if (setsConfig) {
    // Scored by sets: the sets decide the score and the winner, never a draw.
    const outcome = evaluateSets(setsConfig, r.sets ?? []);
    if (outcome.error) return fail(outcome.error);
    if (!outcome.complete)
      return fail(
        `O jogo ainda não tem vencedor: são necessários ${setsConfig.setsToWin} sets.`,
      );
    homeScore = outcome.homeSets;
    awayScore = outcome.awaySets;
    winner = outcome.winner === "HOME" ? match.homeEntryId : match.awayEntryId;
  } else {
    homeScore = r.homeScore as number;
    awayScore = r.awayScore as number;
    if (homeScore !== awayScore) {
      winner = homeScore > awayScore ? match.homeEntryId : match.awayEntryId;
    } else if (knockout) {
      if (!rules.penalties)
        return fail("No mata-mata não há empate. Corrija o placar.");
      if (r.homePenalties == null || r.awayPenalties == null)
        return fail("Empate no mata-mata: informe os pênaltis.");
      if (r.homePenalties === r.awayPenalties)
        return fail("Os pênaltis não podem terminar empatados.");
      homePen = r.homePenalties;
      awayPen = r.awayPenalties;
      winner = homePen > awayPen ? match.homeEntryId : match.awayEntryId;
    } else {
      if (!rules.allowDraw) return fail("Esta modalidade não admite empate.");
      winner = null;
    }
  }
  const loser =
    winner === match.homeEntryId
      ? match.awayEntryId
      : winner === match.awayEntryId
        ? match.homeEntryId
        : null;

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: r.walkover ? "WALKOVER" : "FINISHED",
        homeScore,
        awayScore,
        homePenalties: homePen,
        awayPenalties: awayPen,
        winnerEntryId: winner,
        winMethod: r.walkover ? null : (r.winMethod ?? null),
      },
    });
    // The sets of a corrected result replace the old ones.
    await tx.matchGame.deleteMany({ where: { matchId: match.id } });
    if (series && !r.walkover && r.games?.length) {
      await tx.matchGame.createMany({
        data: r.games.map((g, i) => ({
          matchId: match.id,
          number: i + 1,
          homeScore: g.home,
          awayScore: g.away,
        })),
      });
    }
    await tx.matchSet.deleteMany({ where: { matchId: match.id } });
    if (setsConfig && !r.walkover && r.sets?.length) {
      await tx.matchSet.createMany({
        data: r.sets.map((x, i) => ({
          matchId: match.id,
          number: i + 1,
          homePoints: x.home,
          awayPoints: x.away,
        })),
      });
    }
    if (resetFinal) {
      // The extra game only exists when the losers bracket champion won.
      await tx.match.deleteMany({
        where: { stageRunId: match.stageRunId, label: DECISIVE_LABEL },
      });
      if (winner && winner === match.awayEntryId) {
        await tx.match.create({
          data: {
            stageRunId: match.stageRunId,
            round: match.round + 1,
            position: 0,
            label: DECISIVE_LABEL,
            homeEntryId: match.homeEntryId,
            awayEntryId: match.awayEntryId,
          },
        });
      }
    }
    if (knockout && winner) {
      if (match.nextMatchId && match.nextSlot) {
        await tx.match.update({
          where: { id: match.nextMatchId },
          data:
            match.nextSlot === "HOME"
              ? { homeEntryId: winner }
              : { awayEntryId: winner },
        });
      }
      if (match.loserMatchId && match.loserSlot) {
        await tx.match.update({
          where: { id: match.loserMatchId },
          data:
            match.loserSlot === "HOME"
              ? { homeEntryId: loser }
              : { awayEntryId: loser },
        });
      }
    }
    // A match that was played live closes with a "Fim de jogo" moment.
    if (match.startedAt && !r.walkover) {
      const has = await tx.matchEvent.count({
        where: { matchId: match.id, type: "FULL_TIME" },
      });
      if (has === 0) {
        await tx.matchEvent.create({
          data: {
            matchId: match.id,
            type: "FULL_TIME",
            createdById: ctx.userId,
          },
        });
      }
    }
    // The first result locks the rules for good.
    await tx.event.updateMany({
      where: { id: eventId, rulesLockedAt: null },
      data: { rulesLockedAt: new Date() },
    });
  });
  return refresh(eventId);
}

export async function clearResultAction(
  eventId: string,
  matchId: string,
): Promise<ActionResult> {
  const ctx = await loadMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match } = ctx;
  if (match.stageRun.status !== "LIVE")
    return fail("A fase não está em andamento.");
  if (!playedStatuses.includes(match.status)) {
    // A series in progress has games saved but no result yet.
    const saved = await prisma.matchGame.count({
      where: { matchId: match.id },
    });
    if (saved === 0) return fail("Este jogo não tem resultado.");
    await prisma.matchGame.deleteMany({ where: { matchId: match.id } });
    return refresh(eventId);
  }
  if (isResetGrandFinal(match)) {
    const decisive = await prisma.match.findFirst({
      where: { stageRunId: match.stageRunId, label: DECISIVE_LABEL },
      select: { status: true },
    });
    if (decisive && decisive.status !== "SCHEDULED")
      return fail(
        "A final decisiva já foi disputada. Desfaça o resultado dela primeiro.",
      );
  }
  const downstream = [match.nextMatchId, match.loserMatchId].filter(
    (x): x is string => !!x,
  );
  if (
    downstream.length &&
    (await prisma.match.count({
      where: { id: { in: downstream }, status: { not: "SCHEDULED" } },
    })) > 0
  ) {
    return fail(
      "O jogo seguinte já foi disputado. Desfaça o resultado dele primeiro.",
    );
  }
  await prisma.$transaction(async (tx) => {
    // Clearing the result reopens a match that was played live.
    await tx.matchEvent.deleteMany({
      where: { matchId: match.id, type: "FULL_TIME" },
    });
    await tx.matchSet.deleteMany({ where: { matchId: match.id } });
    await tx.matchGame.deleteMany({ where: { matchId: match.id } });
    if (isResetGrandFinal(match))
      await tx.match.deleteMany({
        where: { stageRunId: match.stageRunId, label: DECISIVE_LABEL },
      });
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "SCHEDULED",
        homeScore: null,
        awayScore: null,
        homePenalties: null,
        awayPenalties: null,
        winnerEntryId: null,
        winMethod: null,
      },
    });
    if (match.nextMatchId && match.nextSlot)
      await tx.match.update({
        where: { id: match.nextMatchId },
        data:
          match.nextSlot === "HOME"
            ? { homeEntryId: null }
            : { awayEntryId: null },
      });
    if (match.loserMatchId && match.loserSlot)
      await tx.match.update({
        where: { id: match.loserMatchId },
        data:
          match.loserSlot === "HOME"
            ? { homeEntryId: null }
            : { awayEntryId: null },
      });
  });
  return refresh(eventId);
}

// ---------------------------------------------------------------- advance

/**
 * Swiss system: pairs the next round from the standings, once every game of
 * the current round has a result. Nobody faces the same opponent twice.
 */
export async function generateNextRoundAction(
  eventId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run, event } = ctx;
  const { stage } = run;
  if (stage.type !== "SWISS")
    return fail("Só o sistema suíço gera rodadas aos poucos.");
  if (run.status !== "LIVE") return fail("A fase não está em andamento.");
  const detail = await getRunDetail(run.stageId, run.categoryId);
  if (!detail || detail.matches.length === 0)
    return fail("Gere os jogos da fase primeiro.");
  const current = Math.max(...detail.matches.map((m) => m.round));
  if (current >= (stage.swissRounds ?? 0))
    return fail("Todas as rodadas já foram geradas.");
  if (
    detail.matches.some((m) => m.round === current && m.status === "SCHEDULED")
  )
    return fail(`Faltam resultados da rodada ${current}.`);
  const rules = standingsRules(event);
  if (!rules) return fail("O evento não tem regras.");

  const { tables } = runTables(detail, rules);
  const rows = tables[0]?.rows ?? [];
  const faced = new Map<string, Set<string>>(
    detail.entries.map((e) => [e.id, new Set<string>()]),
  );
  for (const m of detail.matches) {
    if (m.homeEntryId && m.awayEntryId) {
      faced.get(m.homeEntryId)?.add(m.awayEntryId);
      faced.get(m.awayEntryId)?.add(m.homeEntryId);
    }
  }
  const sat = new Set(
    detail.matches
      .filter((m) => !m.awayEntryId && m.homeEntryId)
      .map((m) => m.homeEntryId as string),
  );
  const result = pairSwiss(
    rows.map((r) => ({
      id: r.id,
      points: r.points,
      rank: r.position,
      played: faced.get(r.id) ?? new Set<string>(),
      hadBye: sat.has(r.id),
    })),
  );
  if ("error" in result) return fail(result.error);

  await prisma.match.createMany({
    data: [
      ...result.pairs.map((p, i) => ({
        stageRunId: run.id,
        groupId: null,
        round: current + 1,
        position: i,
        label: `Rodada ${current + 1}`,
        homeEntryId: p.home,
        awayEntryId: p.away,
      })),
      ...(result.bye
        ? [
            {
              stageRunId: run.id,
              groupId: null,
              round: current + 1,
              position: result.pairs.length,
              label: `Rodada ${current + 1} (folga)`,
              homeEntryId: result.bye,
              awayEntryId: null,
              status: "WALKOVER" as const,
              winnerEntryId: result.bye,
              homeScore: event.rules?.woScoreFor ?? 0,
              awayScore: event.rules?.woScoreAgainst ?? 0,
            },
          ]
        : []),
    ],
  });
  return refresh(eventId);
}

export async function completeStageAction(
  eventId: string,
  runId: string,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run, event } = ctx;
  const { stage } = run;
  if (run.status !== "LIVE") return fail("A fase não está em andamento.");

  if (stage.type === "PERFORMANCE") {
    const cfg = perfConfigOf(event.rules);
    const full = await getRunDetail(run.stageId, run.categoryId);
    if (!cfg || !full) return fail("Fase não encontrada.");
    const parts = full.entries.map((e) => ({
      id: e.id,
      attempts: e.attempts.map((a) => ({
        number: a.number,
        status: a.status,
        value: a.value,
      })),
    }));
    const opts = {
      tiebreakers: tiebreakerKeys(event.rules),
      lotsSeed: run.drawSeed ?? 1,
    };
    for (const e of full.entries) {
      // A bar competition ends when the organizer says so: one jump each is enough to close.
      const need = isBarMode(cfg, opts.tiebreakers)
        ? 1
        : maxAttemptsFor(cfg, parts, e.id, opts);
      const has = e.attempts.length;
      if (has < need)
        return fail(
          `Faltam tentativas de ${entryName(e)} (${has} de ${need}).`,
        );
    }
    if (event.stages.some((s) => s.order === stage.order + 1))
      return fail(
        "Por enquanto a prova por desempenho deve ser a última fase do evento.",
      );
    await prisma.stageRun.update({
      where: { id: run.id },
      data: { status: "DONE" },
    });
    return refresh(eventId);
  }

  const detail = await getRunDetail(run.stageId, run.categoryId);
  if (!detail) return fail("Fase não encontrada.");
  if (
    detail.matches.length === 0 ||
    detail.matches.some((m) => m.status === "SCHEDULED")
  )
    return fail("Ainda há jogos sem resultado.");

  if (stage.type === "SWISS") {
    const played = Math.max(...detail.matches.map((m) => m.round));
    if (played < (stage.swissRounds ?? 0))
      return fail(
        `Gere todas as rodadas antes de concluir (jogadas ${played} de ${stage.swissRounds}).`,
      );
  }

  const next = event.stages.find((s) => s.order === stage.order + 1);
  if (!next) {
    await prisma.stageRun.update({
      where: { id: run.id },
      data: { status: "DONE" },
    });
    return refresh(eventId);
  }
  if (stage.type === "DOUBLE_ELIM")
    return fail("A dupla eliminação deve ser a última fase do evento.");
  if (!isSupportedStage(next.type))
    return fail("A fase seguinte ainda não está disponível.");
  const regOf = new Map(detail.entries.map((e) => [e.id, e.registrationId]));
  let flat: string[];
  // Where each qualified team came from, to name the matchups later.
  const origins = new Map<
    string,
    { g: number | null; r: number | null; m: number | null }
  >();

  if (stage.type === "SINGLE_ELIM") {
    // One knockout round feeding another: winners (and byes) continue in slot order.
    if (next.type !== "SINGLE_ELIM")
      return fail("Depois de um mata-mata só pode haver outro mata-mata.");
    const index = event.stages.findIndex((x) => x.id === stage.id);
    const adjacent =
      event.stages[index - 1]?.type === "SINGLE_ELIM" || run.manualPairing;
    const plan = planRound(
      detail.entries.map((e) => e.id),
      stage.thirdPlaceMatch,
      { adjacent },
    );
    const winners = new Map(
      detail.matches
        .filter((m) => m.round === 1 && m.label !== "Disputa de 3º lugar")
        .map((m) => [m.position, m.winnerEntryId]),
    );
    const slots: string[] = [];
    for (let p = 0; p < plan.slots; p++) {
      const entryId =
        plan.byes.find((b) => b.position === p)?.team ?? winners.get(p);
      if (!entryId) return fail("Há jogo sem vencedor.");
      slots.push(regOf.get(entryId) as string);
      origins.set(regOf.get(entryId) as string, { g: null, r: null, m: p + 1 });
    }
    flat = slots;
  } else {
    const rules = standingsRules(event);
    if (!rules) return fail("O evento não tem regras.");

    const { tables } = runTables(detail, rules);
    const keep = stage.advancingPerGroup;
    const qualified: string[][] = [];
    for (const t of tables) {
      const k = keep ?? t.rows.length;
      const cut = t.rows.slice(0, k);
      // A tie that nothing can break around the cut line would decide who advances by luck.
      if (k < t.rows.length && t.rows.slice(0, k + 1).some((r) => r.tied)) {
        return fail(
          `${t.name}: há empate sem critério de desempate na zona de classificação. Adicione o sorteio como último critério nas regras.`,
        );
      }
      qualified.push(cut.map((r) => regOf.get(r.id) as string));
    }
    qualified.forEach((list, ti) =>
      list.forEach((reg, ri) =>
        origins.set(reg, {
          g: stage.type === "GROUPS" ? ti + 1 : null,
          r: ri + 1,
          m: null,
        }),
      ),
    );

    flat =
      tables.length === 1 && stage.type === "ROUND_ROBIN"
        ? qualified[0]
        : crossQualified(qualified);
  }
  if (flat.length < 2)
    return fail("Menos de 2 participantes se classificam para a próxima fase.");
  if (next.type === "GROUPS" && flat.length < (next.groupCount ?? 2) * 2)
    return fail("Poucos classificados para os grupos da próxima fase.");

  const nextRunId = randomUUID();
  const entries = flat.map((registrationId, i) => ({
    id: randomUUID(),
    stageRunId: nextRunId,
    registrationId,
    groupId: null as string | null,
    seed: i + 1,
    position: i,
    originGroup: origins.get(registrationId)?.g ?? null,
    originRank: origins.get(registrationId)?.r ?? null,
    originMatch: origins.get(registrationId)?.m ?? null,
  }));
  let groupRows: {
    id: string;
    stageRunId: string;
    name: string;
    order: number;
  }[] = [];
  if (next.type === "GROUPS") {
    const count = next.groupCount ?? 2;
    groupRows = Array.from({ length: count }, (_, i) => ({
      id: randomUUID(),
      stageRunId: nextRunId,
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      order: i + 1,
    }));
    const dist = drawGroups(
      "SNAKE",
      entries.map((e) => ({ id: e.registrationId, seed: e.seed })),
      count,
      mulberry32(run.drawSeed),
    );
    dist.forEach((ids, g) =>
      ids.forEach((regId) => {
        entries.find((e) => e.registrationId === regId)!.groupId =
          groupRows[g].id;
      }),
    );
  }

  // Matchups chosen when the stage was configured ("1st of A against 2nd of B"):
  // resolve them to the teams that actually qualified. If anything does not fit,
  // the automatic cross stays.
  let manualPairing = false;
  if (next.type === "SINGLE_ELIM" && next.pairings) {
    const template = z.array(pairingSchema).safeParse(next.pairings);
    const cfg: StageCfg[] = event.stages.map((x) => ({
      name: x.name,
      type: x.type,
      groupCount: x.groupCount,
      advancingPerGroup: x.advancingPerGroup,
    }));
    const nextIndex = event.stages.findIndex((x) => x.id === next.id);
    if (
      template.success &&
      validateTemplate(cfg, nextIndex, template.data) === null
    ) {
      const order = resolveTemplate(template.data, entries);
      if (order) {
        order.forEach((id, position) => {
          const entry = entries.find((e) => e.id === id);
          if (entry) entry.position = position;
        });
        manualPairing = true;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.stageRun.update({
      where: { id: run.id },
      data: { status: "DONE" },
    });
    await tx.stageRun.create({
      data: {
        id: nextRunId,
        stageId: next.id,
        categoryId: run.categoryId,
        drawSeed: run.drawSeed,
        drawMode: "SNAKE",
        manualPairing,
      },
    });
    if (groupRows.length) await tx.stageGroup.createMany({ data: groupRows });
    await tx.stageEntry.createMany({ data: entries });
  });
  return refresh(eventId);
}

// ---------------------------------------------------------------- calendar

const scheduleSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
      .or(z.literal("")),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.")
      .or(z.literal("")),
    venue: z.string().trim().max(60, "Use no máximo 60 caracteres."),
    refereeId: z.string().min(1).nullable(),
  })
  .refine((s) => (s.date === "") === (s.time === ""), {
    message: "Informe a data e a hora juntas.",
  });

export async function scheduleMatchAction(
  eventId: string,
  matchId: string,
  payload: unknown,
): Promise<ActionResult> {
  const ctx = await loadMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match, organizationId, event } = ctx;
  const parsed = scheduleSchema.safeParse(payload);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const s = parsed.data;
  const at = s.date
    ? localDateTime(
        s.date,
        Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3)),
      )
    : null;

  if (s.refereeId) {
    const referee = await prisma.referee.findFirst({
      where: {
        id: s.refereeId,
        organizationId,
        active: true,
        sports: { some: { sportId: event.sportId } },
      },
      select: { id: true },
    });
    if (!referee)
      return fail(
        "Esse árbitro não está disponível para a modalidade do evento.",
      );
  }
  if (at) {
    const same = await prisma.match.findMany({
      where: {
        scheduledAt: at,
        id: { not: match.id },
        stageRun: { stage: { event: { organizationId } } },
      },
      select: { venue: true, refereeId: true },
    });
    if (s.refereeId && same.some((m) => m.refereeId === s.refereeId))
      return fail("Esse árbitro já tem outro jogo neste horário.");
    if (s.venue && same.some((m) => m.venue && sameName(m.venue, s.venue)))
      return fail("Esse local já está ocupado neste horário.");
  }
  await prisma.match.update({
    where: { id: match.id },
    data: { scheduledAt: at, venue: s.venue || null, refereeId: s.refereeId },
  });
  return refresh(eventId);
}

const autoSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data inicial."),
  firstTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o primeiro horário."),
  lastTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o último horário."),
  slotMinutes: z
    .number()
    .int()
    .min(10, "Duração de 10 a 480 minutos.")
    .max(480, "Duração de 10 a 480 minutos."),
  venues: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Informe ao menos um local.")
    .max(12, "Use no máximo 12 locais."),
  assignReferees: z.boolean(),
});

export async function autoScheduleAction(
  eventId: string,
  runId: string,
  payload: unknown,
): Promise<ActionResult> {
  const ctx = await loadRun(eventId, runId);
  if (!ctx) return fail("Fase não encontrada.");
  const { run, organizationId, event } = ctx;
  if (run.status !== "LIVE")
    return fail("Gere os jogos da fase antes de agendar.");
  const parsed = autoSchema.safeParse(payload);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const o = parsed.data;
  if (o.firstTime > o.lastTime)
    return fail("O último horário não pode ser antes do primeiro.");

  const matches = await prisma.match.findMany({
    where: { stageRunId: run.id, status: "SCHEDULED" },
    orderBy: [{ round: "asc" }, { position: "asc" }],
    select: { id: true, round: true, label: true },
  });
  if (matches.length === 0) return fail("Não há jogos pendentes para agendar.");

  // Rounds in play order; the third-place match is played before the final.
  const roundKey = (m: { round: number; label: string | null }) =>
    m.round + (m.label === "Final" ? 0.5 : 0);
  const keys = [...new Set(matches.map(roundKey))].sort((a, b) => a - b);
  const rounds = keys.map((k) =>
    matches.filter((m) => roundKey(m) === k).map((m) => m.id),
  );
  const slots = autoSchedule(rounds, {
    startDate: o.startDate,
    firstTime: o.firstTime,
    lastTime: o.lastTime,
    slotMinutes: o.slotMinutes,
    venues: o.venues,
  });

  // Do not collide with what the organization already scheduled elsewhere.
  const taken = await prisma.match.findMany({
    where: {
      scheduledAt: { in: slots.map((s) => s.at) },
      stageRunId: { not: run.id },
      stageRun: { stage: { event: { organizationId } } },
    },
    select: { scheduledAt: true, venue: true, refereeId: true },
  });
  const busy = (at: Date, venue: string) =>
    taken.some(
      (t) =>
        t.scheduledAt?.getTime() === at.getTime() &&
        t.venue &&
        sameName(t.venue, venue),
    );
  if (slots.some((s) => busy(s.at, s.venue)))
    return fail(
      "Alguns horários e locais já estão ocupados por outros jogos. Mude o início ou os locais.",
    );

  let referees: string[] = [];
  if (o.assignReferees) {
    referees = (
      await prisma.referee.findMany({
        where: {
          organizationId,
          active: true,
          role: "REFEREE",
          sports: { some: { sportId: event.sportId } },
        },
        orderBy: { name: "asc" },
        select: { id: true },
      })
    ).map((r) => r.id);
    if (referees.length === 0)
      return fail("Não há árbitros ativos para a modalidade do evento.");
  }
  const usedAt = new Map<number, Set<string>>();
  for (const t of taken)
    if (t.scheduledAt && t.refereeId)
      (
        usedAt.get(t.scheduledAt.getTime()) ??
        usedAt
          .set(t.scheduledAt.getTime(), new Set())
          .get(t.scheduledAt.getTime())!
      ).add(t.refereeId);
  let cursor = 0;

  const updates = slots.map((s) => {
    let refereeId: string | null = null;
    if (referees.length) {
      const used = usedAt.get(s.at.getTime()) ?? new Set<string>();
      for (let tries = 0; tries < referees.length; tries++) {
        const candidate = referees[(cursor + tries) % referees.length];
        if (!used.has(candidate)) {
          refereeId = candidate;
          cursor = (cursor + tries + 1) % referees.length;
          used.add(candidate);
          usedAt.set(s.at.getTime(), used);
          break;
        }
      }
    }
    return prisma.match.update({
      where: { id: s.matchId },
      data: { scheduledAt: s.at, venue: s.venue, refereeId },
    });
  });
  await prisma.$transaction(updates);
  return refresh(eventId);
}
