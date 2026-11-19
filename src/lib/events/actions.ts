"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ineligibleReason } from "@/lib/registrations/eligibility";
import { parseDateInput } from "./constants";
import { readEventValues, validateEventValues } from "./validate";

export type EventFormState = {
  values?: Record<string, string>;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireOrganizationUser();
  if (!user.organization) {
    return { error: "Sua conta não está ligada a uma organização." };
  }

  const values = readEventValues(formData);
  const { errors, data } = await validateEventValues(values);
  if (!data) return { values, fieldErrors: errors };

  const event = await prisma.event.create({
    data: {
      ...data,
      organizationId: user.organization.id,
      createdById: user.id,
      // Registrations need a category, so every event starts with a general one.
      categories: { create: { name: "Geral", gender: "MIXED", sortOrder: 0 } },
    },
    select: { id: true },
  });

  // Refresh the events list and the count shown in the sidebar.
  revalidatePath("/", "layout");
  redirect(`/events/${event.id}`);
}

/** An event of the user's organization with what decides what can still change. */
async function ownEvent(eventId: string) {
  const user = await requireOrganizationUser();
  if (!user.organization || typeof eventId !== "string") return null;
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organization.id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) return null;
  const runs = await prisma.stageRun.count({ where: { stage: { eventId } } });
  return { user, event, locked: event._count.registrations > 0 || runs > 0 };
}

export async function updateEventAction(
  eventId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const ctx = await ownEvent(eventId);
  if (!ctx) return { error: "Evento não encontrado." };
  const { event, locked } = ctx;

  const values = readEventValues(formData);
  // With registrations or phases in place, the modality and the way people take
  // part cannot change: they shape eligibility, positions and the rules.
  if (locked) {
    values.sportId = event.sportId;
    values.participationType = event.participationType;
  }
  const { errors, data } = await validateEventValues(values);
  if (!data) return { values, fieldErrors: errors };

  // Age is measured on the start date: a new date must keep everyone eligible.
  if (
    data.startDate.getTime() !== event.startDate.getTime() &&
    event._count.registrations > 0
  ) {
    const members = await prisma.registrationMember.findMany({
      where: { registration: { eventId } },
      select: {
        athlete: { select: { name: true, gender: true, birthDate: true } },
        registration: {
          select: {
            category: {
              select: { name: true, gender: true, minAge: true, maxAge: true },
            },
          },
        },
      },
    });
    const out = members.filter(
      (m) =>
        ineligibleReason(m.registration.category, m.athlete, data.startDate) !==
        null,
    );
    if (out.length > 0) {
      const names = [...new Set(out.map((m) => m.athlete.name))];
      return {
        values,
        fieldErrors: {
          startDate: `Com essa data de início, ${names.length} ${names.length === 1 ? "atleta deixaria" : "atletas deixariam"} de caber na categoria por idade: ${names.slice(0, 4).join(", ")}${names.length > 4 ? " e outros" : ""}.`,
        },
      };
    }
  }

  await prisma.event.update({ where: { id: eventId }, data });
  revalidatePath("/", "layout");
  redirect(`/events/${eventId}?saved=1`);
}

/** The dates of the copy, in the same shape as the form. */
export type DuplicateState = {
  values?: Record<string, string>;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const jsonOrNull = (value: Prisma.JsonValue | null) =>
  value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

/**
 * Copies an event as a model for the next edition: categories, rules and
 * phases (with the chosen matchups) come along; registrations, draws, matches
 * and results do not.
 */
export async function duplicateEventAction(
  eventId: string,
  _prev: DuplicateState,
  formData: FormData,
): Promise<DuplicateState> {
  const ctx = await ownEvent(eventId);
  if (!ctx) return { error: "Evento não encontrado." };
  const { user, event } = ctx;

  const name = String(formData.get("name") ?? "").trim();
  const startRaw = String(formData.get("startDate") ?? "").trim();
  const endRaw = String(formData.get("endDate") ?? "").trim();
  const values = { name, startDate: startRaw, endDate: endRaw };
  const e: Record<string, string> = {};
  if (name.length < 3) e.name = "Informe o nome do novo evento.";
  else if (name.length > 120) e.name = "Use no máximo 120 caracteres.";
  const start = parseDateInput(startRaw);
  const end = parseDateInput(endRaw);
  if (!start) e.startDate = "Informe a data de início.";
  if (!end) e.endDate = "Informe a data de fim.";
  else if (start && end < start)
    e.endDate = "O fim não pode ser antes do início.";
  if (Object.keys(e).length || !start || !end)
    return { values, fieldErrors: e };

  const [categories, rules, stages] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.eventRules.findUnique({ where: { eventId } }),
    prisma.eventStage.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
    }),
  ]);

  const copy = await prisma.event.create({
    data: {
      organizationId: event.organizationId,
      createdById: user.id,
      name,
      description: event.description,
      startDate: start,
      endDate: end,
      eventTypeId: event.eventTypeId,
      formatId: event.formatId,
      sportId: event.sportId,
      participationType: event.participationType,
      locationName: event.locationName,
      city: event.city,
      state: event.state,
      publicVisible: event.publicVisible,
      categories: {
        create: (categories.length
          ? categories
          : [
              {
                name: "Geral",
                gender: "MIXED" as const,
                minAge: null,
                maxAge: null,
                rosterMin: 1,
                rosterMax: null,
                sortOrder: 0,
              },
            ]
        ).map((c) => ({
          name: c.name,
          gender: c.gender,
          minAge: c.minAge,
          maxAge: c.maxAge,
          rosterMin: c.rosterMin,
          rosterMax: c.rosterMax,
          sortOrder: c.sortOrder,
        })),
      },
      ...(rules
        ? {
            rules: {
              create: {
                presetKey: rules.presetKey,
                schemaVersion: rules.schemaVersion,
                scoringModel: rules.scoringModel,
                winPoints: rules.winPoints,
                drawPoints: rules.drawPoints,
                lossPoints: rules.lossPoints,
                allowDraw: rules.allowDraw,
                pointsTable: jsonOrNull(rules.pointsTable),
                tiebreakers: rules.tiebreakers as Prisma.InputJsonValue,
                woScoreFor: rules.woScoreFor,
                woScoreAgainst: rules.woScoreAgainst,
                woPointsAwarded: rules.woPointsAwarded,
                woPointsPenalty: rules.woPointsPenalty,
                woEliminationLimit: rules.woEliminationLimit,
                woNullifyResults: rules.woNullifyResults,
                matchFormat: rules.matchFormat,
                bestOf: rules.bestOf,
                extraTime: rules.extraTime,
                penalties: rules.penalties,
                awayGoals: rules.awayGoals,
                sportConfig: jsonOrNull(rules.sportConfig),
                placePoints: jsonOrNull(rules.placePoints),
                dropWorst: rules.dropWorst,
              },
            },
          }
        : {}),
      stages: {
        create: stages.map((s) => ({
          order: s.order,
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
          pairings: jsonOrNull(s.pairings),
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/", "layout");
  redirect(`/events/${copy.id}?copied=1`);
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Removes an event and everything inside it. Owner only, confirmed by typing the name. */
export async function deleteEventAction(
  eventId: string,
  confirmName: string,
): Promise<DeleteResult> {
  const ctx = await ownEvent(eventId);
  if (!ctx) return { ok: false, error: "Evento não encontrado." };
  if (ctx.user.role !== "OWNER")
    return {
      ok: false,
      error: "Só o proprietário da organização pode excluir eventos.",
    };
  if (
    typeof confirmName !== "string" ||
    confirmName.trim() !== ctx.event.name.trim()
  ) {
    return {
      ok: false,
      error:
        "Digite o nome do evento exatamente como ele aparece para confirmar.",
    };
  }

  await prisma.$transaction([
    // Draws and matches first (they reference registrations), then registrations, then the event.
    prisma.stageRun.deleteMany({ where: { stage: { eventId } } }),
    prisma.registration.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}
