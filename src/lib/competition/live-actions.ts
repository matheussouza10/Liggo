"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { EVENT_META, MATCH_EVENT_TYPES, scoreDelta } from "./live";
import { seriesConfigOf } from "./series";
import { liveState, setsConfigOf } from "./sets";

export type LiveResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): LiveResult => ({ ok: false, error });

/** A match of an event of the user's organization. */
async function ownMatch(eventId: string, matchId: string) {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof eventId !== "string" ||
    typeof matchId !== "string"
  )
    return null;
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      stageRun: { stage: { event: { id: eventId, organizationId } } },
    },
    include: {
      stageRun: { select: { status: true } },
      home: {
        select: {
          registration: {
            select: { members: { select: { athleteId: true } } },
          },
        },
      },
      away: {
        select: {
          registration: {
            select: { members: { select: { athleteId: true } } },
          },
        },
      },
    },
  });
  return match ? { user, match } : null;
}

const refresh = (eventId: string, matchId: string): LiveResult => {
  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/watch", "layout");
  void matchId;
  return { ok: true };
};

const isLive = (m: { startedAt: Date | null; status: string }) =>
  m.startedAt !== null && m.status === "SCHEDULED";

export async function startMatchAction(
  eventId: string,
  matchId: string,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { user, match } = ctx;
  if (match.stageRun.status !== "LIVE")
    return fail("A fase não está em andamento.");
  if (!match.homeEntryId || !match.awayEntryId)
    return fail("Este jogo ainda não tem os dois participantes.");
  if (match.status !== "SCHEDULED") return fail("Este jogo já foi encerrado.");
  if (match.startedAt) return fail("Este jogo já foi iniciado.");
  // A tie played over several games is scored game by game, not live.
  const tie = await prisma.match.findUnique({
    where: { id: match.id },
    select: {
      stageRun: {
        select: {
          stage: {
            select: {
              type: true,
              event: {
                select: {
                  rules: {
                    select: {
                      matchFormat: true,
                      bestOf: true,
                      awayGoals: true,
                      penalties: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const stage = tie?.stageRun.stage;
  if (stage?.type === "SINGLE_ELIM" && seriesConfigOf(stage.event.rules))
    return fail(
      "Neste formato o confronto tem vários jogos: lance o placar de cada jogo em Resultado.",
    );

  await prisma.$transaction([
    prisma.match.update({
      where: { id: match.id },
      data: { startedAt: new Date(), liveHome: 0, liveAway: 0 },
    }),
    prisma.matchEvent.create({
      data: {
        matchId: match.id,
        type: "KICKOFF",
        minute: 0,
        createdById: user.id,
      },
    }),
  ]);
  return refresh(eventId, matchId);
}

const eventSchema = z.object({
  type: z.enum(MATCH_EVENT_TYPES),
  side: z.enum(["HOME", "AWAY"]).nullable(),
  minute: z
    .number()
    .int()
    .min(0, "Minuto de 0 a 300.")
    .max(300, "Minuto de 0 a 300.")
    .nullable(),
  athleteId: z.string().min(1).nullable(),
  otherAthleteId: z.string().min(1).nullable(),
  value: z
    .number()
    .int()
    .min(1, "Valor de 1 a 10.")
    .max(10, "Valor de 1 a 10."),
  text: z.string().trim().max(160, "Use no máximo 160 caracteres."),
});

/**
 * Point by point, for sports scored by sets. Adds (+1) or takes back (-1) a
 * point of one side in the set being played; a set closes by itself when won,
 * and the sets won become the live score.
 */
export async function scoreSetPointAction(
  eventId: string,
  matchId: string,
  side: "HOME" | "AWAY",
  delta: 1 | -1,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match } = ctx;
  if (!isLive(match))
    return fail(
      "Só é possível marcar pontos em um jogo ao vivo. Inicie o jogo primeiro.",
    );
  if ((side !== "HOME" && side !== "AWAY") || (delta !== 1 && delta !== -1))
    return fail("Ponto inválido.");
  const rules = await prisma.eventRules.findUnique({
    where: { eventId },
    select: { scoringModel: true, sportConfig: true },
  });
  const config = setsConfigOf(rules);
  if (!config) return fail("Este evento não é pontuado por sets.");

  const rows = await prisma.matchSet.findMany({
    where: { matchId },
    orderBy: { number: "asc" },
  });
  const state = liveState(
    config,
    rows.map((r) => ({ home: r.homePoints, away: r.awayPoints })),
  );
  const list = state.finished.map((x) => ({ ...x }));
  if (state.current.home + state.current.away > 0)
    list.push({ ...state.current });
  const key = side === "HOME" ? "home" : "away";

  if (delta === 1) {
    if (state.complete)
      return fail(
        "O jogo já tem vencedor. Confirme o resultado ou desfaça o último ponto.",
      );
    if (state.current.home + state.current.away > 0)
      list[list.length - 1][key]++;
    else
      list.push({ home: 0, away: 0, [key]: 1 } as {
        home: number;
        away: number;
      });
  } else {
    const last = list[list.length - 1];
    if (!last || last[key] === 0)
      return fail("Não há ponto para desfazer desse lado.");
    last[key]--;
    if (last.home + last.away === 0) list.pop();
  }

  const next = liveState(config, list);
  await prisma.$transaction([
    prisma.matchSet.deleteMany({ where: { matchId } }),
    prisma.matchSet.createMany({
      data: list.map((x, i) => ({
        matchId,
        number: i + 1,
        homePoints: x.home,
        awayPoints: x.away,
      })),
    }),
    prisma.match.update({
      where: { id: matchId },
      data: { liveHome: next.homeSets, liveAway: next.awaySets },
    }),
  ]);
  return refresh(eventId, matchId);
}

export async function addMatchEventAction(
  eventId: string,
  matchId: string,
  payload: unknown,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { user, match } = ctx;
  if (!isLive(match))
    return fail(
      "Só é possível lançar lances em um jogo ao vivo. Inicie o jogo primeiro.",
    );

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Lance inválido.");
  const e = parsed.data;
  // In sports scored by sets the score comes from the sets, not from lances.
  if (EVENT_META[e.type].scores) {
    const r = await prisma.eventRules.findUnique({
      where: { eventId },
      select: { scoringModel: true, sportConfig: true },
    });
    if (setsConfigOf(r))
      return fail(
        "Neste esporte o placar vem dos sets. Marque os pontos no painel de sets.",
      );
  }
  const meta = EVENT_META[e.type];
  if (!meta.manual)
    return fail("Esse lance é lançado pelos botões de início e fim do jogo.");
  if (meta.needsSide && !e.side) return fail("Escolha de qual time é o lance.");
  if (e.type === "NOTE" && e.text === "") return fail("Descreva o lance.");
  if (meta.player === "required" && !e.athleteId)
    return fail(
      `Escolha ${meta.playerLabel ? `quem ${meta.playerLabel.toLowerCase()}` : "o atleta"}.`,
    );
  if (meta.other === "required" && !e.otherAthleteId)
    return fail(
      `Escolha quem ${meta.otherLabel?.toLowerCase() ?? "participa"}.`,
    );

  // Players must belong to the roster registered on that side.
  const side = meta.needsSide || e.type === "NOTE" ? e.side : null;
  const roster =
    side === "HOME" ? match.home : side === "AWAY" ? match.away : null;
  const rosterIds = new Set(
    roster?.registration.members.map((m) => m.athleteId) ?? [],
  );
  const athleteId = meta.player === "none" ? null : e.athleteId;
  const otherAthleteId = meta.other === "none" ? null : e.otherAthleteId;
  for (const id of [athleteId, otherAthleteId]) {
    if (id && !rosterIds.has(id))
      return fail("Esse atleta não está no elenco desse time neste evento.");
  }
  if (athleteId && otherAthleteId && athleteId === otherAthleteId)
    return fail("Escolha atletas diferentes.");

  const value = meta.scores ? e.value : 1;
  const delta = scoreDelta(e.type, side, value);
  await prisma.$transaction([
    prisma.matchEvent.create({
      data: {
        matchId: match.id,
        type: e.type,
        side,
        minute: e.minute,
        athleteId,
        otherAthleteId,
        value,
        text: e.text || null,
        createdById: user.id,
      },
    }),
    prisma.match.update({
      where: { id: match.id },
      data: {
        liveHome: { increment: delta.home },
        liveAway: { increment: delta.away },
      },
    }),
  ]);
  return refresh(eventId, matchId);
}

export async function deleteMatchEventAction(
  eventId: string,
  matchId: string,
  id: string,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match } = ctx;
  if (!isLive(match)) return fail("O jogo não está ao vivo.");
  const ev =
    typeof id === "string"
      ? await prisma.matchEvent.findFirst({ where: { id, matchId: match.id } })
      : null;
  if (!ev) return fail("Lance não encontrado.");
  if (!EVENT_META[ev.type].manual)
    return fail(
      "Esse lance não pode ser excluído. Use 'Desfazer início' para recomeçar.",
    );

  const delta = scoreDelta(ev.type, ev.side, ev.value);
  await prisma.$transaction([
    prisma.matchEvent.delete({ where: { id: ev.id } }),
    prisma.match.update({
      where: { id: match.id },
      data: {
        liveHome: { decrement: delta.home },
        liveAway: { decrement: delta.away },
      },
    }),
  ]);
  return refresh(eventId, matchId);
}

/** Starts over: erases the lances and the start. Only while the match is live. */
export async function resetLiveAction(
  eventId: string,
  matchId: string,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match } = ctx;
  if (!isLive(match)) return fail("O jogo não está ao vivo.");
  await prisma.$transaction([
    prisma.matchEvent.deleteMany({ where: { matchId: match.id } }),
    prisma.match.update({
      where: { id: match.id },
      data: { startedAt: null, liveHome: 0, liveAway: 0 },
    }),
  ]);
  return refresh(eventId, matchId);
}

/** Shows or hides the event on the public pages. */
export async function setPublicVisibleAction(
  eventId: string,
  visible: boolean,
): Promise<LiveResult> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof eventId !== "string" ||
    typeof visible !== "boolean"
  )
    return fail("Evento não encontrado.");
  const done = await prisma.event.updateMany({
    where: { id: eventId, organizationId },
    data: { publicVisible: visible },
  });
  if (done.count === 0) return fail("Evento não encontrado.");
  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/watch", "layout");
  return { ok: true };
}

/** Records the home share of the ball (0 to 100); the away side is the rest. Empty clears it. */
export async function setPossessionAction(
  eventId: string,
  matchId: string,
  homePercent: number | null,
): Promise<LiveResult> {
  const ctx = await ownMatch(eventId, matchId);
  if (!ctx) return fail("Jogo não encontrado.");
  const { match } = ctx;
  if (!match.startedAt && match.status === "SCHEDULED")
    return fail("Inicie o jogo antes de registrar a posse de bola.");
  if (
    homePercent !== null &&
    (!Number.isInteger(homePercent) || homePercent < 0 || homePercent > 100)
  )
    return fail("A posse de bola vai de 0 a 100.");
  await prisma.match.update({
    where: { id: match.id },
    data: { possessionHome: homePercent },
  });
  return refresh(eventId, matchId);
}
