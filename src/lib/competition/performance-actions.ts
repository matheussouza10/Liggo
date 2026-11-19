"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  maxAttemptsFor,
  parseAttempt,
  perfConfigOf,
  tiebreakerKeys,
} from "./performance";

export type PerfResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): PerfResult => ({ ok: false, error });

const payloadSchema = z.object({
  attempts: z
    .array(
      z.object({
        status: z.enum(["OK", "NM", "DNF", "DNS", "DQ"]),
        value: z.string().max(20),
      }),
    )
    .max(20),
});

/**
 * Saves every attempt of one participant, replacing the previous ones.
 * Extra attempts (after the cut to finalists) are only accepted for finalists.
 */
export async function savePerformanceAttemptsAction(
  eventId: string,
  entryId: string,
  payload: unknown,
): Promise<PerfResult> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof eventId !== "string" ||
    typeof entryId !== "string"
  )
    return fail("Participante não encontrado.");

  const entry = await prisma.stageEntry.findFirst({
    where: {
      id: entryId,
      stageRun: {
        stage: { type: "PERFORMANCE", event: { id: eventId, organizationId } },
      },
    },
    include: {
      stageRun: {
        include: {
          stage: { include: { event: { include: { rules: true } } } },
        },
      },
    },
  });
  if (!entry) return fail("Participante não encontrado.");
  const run = entry.stageRun;
  if (run.status !== "LIVE") return fail("A prova não está em andamento.");
  const rules = run.stage.event.rules;
  const cfg = perfConfigOf(rules);
  if (!cfg) return fail("O evento não tem regras de prova por desempenho.");

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return fail("Tentativas inválidas.");

  // The others' attempts decide who may take the extra ones.
  const all = await prisma.stageEntry.findMany({
    where: { stageRunId: run.id },
    include: { attempts: { orderBy: { number: "asc" } } },
  });
  const parts = all.map((e) => ({
    id: e.id,
    attempts:
      e.id === entryId
        ? []
        : e.attempts.map((a) => ({
            number: a.number,
            status: a.status,
            value: a.value,
          })),
  }));
  // Own attempts do not decide eligibility of the extras (the cut is made on the first ones), so keep the saved ones for the cut.
  const saved = all.find((e) => e.id === entryId)?.attempts ?? [];
  const forCut = parts.map((p) =>
    p.id === entryId
      ? {
          id: p.id,
          attempts: saved.map((a) => ({
            number: a.number,
            status: a.status,
            value: a.value,
          })),
        }
      : p,
  );
  const limit = maxAttemptsFor(cfg, forCut, entryId, {
    tiebreakers: tiebreakerKeys(rules),
    lotsSeed: run.drawSeed ?? 1,
  });

  const rows = parsed.data.attempts;
  if (rows.length > limit)
    return fail(
      limit === cfg.attempts && cfg.extraAttempts
        ? `Só os ${cfg.finalists} melhores fazem as ${cfg.extraAttempts} tentativas extras, depois que todos terminarem as ${cfg.attempts} primeiras.`
        : `Este participante pode ter no máximo ${limit} tentativas.`,
    );

  const data: {
    entryId: string;
    number: number;
    status: "OK" | "NM" | "DNF" | "DNS" | "DQ";
    value: number | null;
  }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.status === "OK") {
      const v = parseAttempt(cfg, r.value);
      if ("error" in v) return fail(`Tentativa ${i + 1}: ${v.error}`);
      data.push({ entryId, number: i + 1, status: "OK", value: v.value });
    } else {
      data.push({ entryId, number: i + 1, status: r.status, value: null });
    }
  }

  await prisma.$transaction([
    prisma.performanceAttempt.deleteMany({ where: { entryId } }),
    prisma.performanceAttempt.createMany({ data }),
    // The first result locks the rules for good.
    prisma.event.updateMany({
      where: { id: eventId, rulesLockedAt: null },
      data: { rulesLockedAt: new Date() },
    }),
  ]);
  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/watch", "layout");
  return { ok: true };
}
