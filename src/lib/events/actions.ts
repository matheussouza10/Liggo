"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationUser } from "@/lib/auth/guards";
import {
  PARTICIPATION_LABELS,
  isParticipationType,
} from "@/lib/catalog/config";
import { prisma } from "@/lib/prisma";
import { BR_STATES, EVENT_LIMITS, parseDateInput } from "./constants";

export type EventFormState = {
  values?: Record<string, string>;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const FIELDS = [
  "name",
  "description",
  "startDate",
  "endDate",
  "eventTypeId",
  "formatId",
  "sportId",
  "participationType",
  "locationName",
  "city",
  "state",
] as const;

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireOrganizationUser();
  if (!user.organization) {
    return { error: "Sua conta não está ligada a uma organização." };
  }

  const values = Object.fromEntries(
    FIELDS.map((key) => [key, String(formData.get(key) ?? "").trim()]),
  ) as Record<(typeof FIELDS)[number], string>;
  const e: Record<string, string> = {};
  const L = EVENT_LIMITS;

  if (values.name.length < L.nameMin) e.name = "Informe o nome do evento.";
  else if (values.name.length > L.nameMax)
    e.name = `Use no máximo ${L.nameMax} caracteres.`;
  if (values.description.length > L.descriptionMax)
    e.description = `Use no máximo ${L.descriptionMax} caracteres.`;

  const start = parseDateInput(values.startDate);
  const end = parseDateInput(values.endDate);
  if (!start) e.startDate = "Informe a data de início.";
  if (!end) e.endDate = "Informe a data de fim.";
  else if (start && end < start)
    e.endDate = "O fim não pode ser antes do início.";

  if (!values.eventTypeId) e.eventTypeId = "Escolha o tipo.";
  if (!values.formatId) e.formatId = "Escolha o formato.";
  if (!values.sportId) e.sportId = "Escolha a modalidade.";
  if (!isParticipationType(values.participationType))
    e.participationType = "Escolha o formato de participação.";

  if (values.locationName.length < L.locationMin)
    e.locationName = "Informe o local.";
  else if (values.locationName.length > L.locationMax)
    e.locationName = `Use no máximo ${L.locationMax} caracteres.`;
  if (values.city.length > L.cityMax)
    e.city = `Use no máximo ${L.cityMax} caracteres.`;
  const state = values.state.toUpperCase();
  if (state && !(BR_STATES as readonly string[]).includes(state))
    e.state = "Escolha uma UF válida.";

  // Referenced catalog entries must exist and be active, with an active category.
  const active = { active: true, category: { active: true } };
  const [eventType, format, sport] = await Promise.all([
    values.eventTypeId && !e.eventTypeId
      ? prisma.eventType.findFirst({
          where: { id: values.eventTypeId, ...active },
          select: { id: true },
        })
      : null,
    values.formatId && !e.formatId
      ? prisma.competitionFormat.findFirst({
          where: { id: values.formatId, ...active },
          select: { id: true, name: true, participationTypes: true },
        })
      : null,
    values.sportId && !e.sportId
      ? prisma.sport.findFirst({
          where: { id: values.sportId, ...active },
          select: { id: true },
        })
      : null,
  ]);
  if (values.eventTypeId && !e.eventTypeId && !eventType)
    e.eventTypeId = "Esse tipo não está disponível.";
  if (values.formatId && !e.formatId && !format)
    e.formatId = "Esse formato não está disponível.";
  if (values.sportId && !e.sportId && !sport)
    e.sportId = "Essa modalidade não está disponível.";

  // A format may restrict who can take part (empty list = anyone).
  if (
    format &&
    isParticipationType(values.participationType) &&
    format.participationTypes.length > 0 &&
    !format.participationTypes.includes(values.participationType)
  ) {
    const allowed = format.participationTypes
      .map((t) => PARTICIPATION_LABELS[t])
      .join(" ou ");
    e.participationType = `O formato "${format.name}" aceita apenas: ${allowed}.`;
  }

  if (
    Object.keys(e).length > 0 ||
    !start ||
    !end ||
    !isParticipationType(values.participationType)
  ) {
    return { values, fieldErrors: e };
  }

  const event = await prisma.event.create({
    data: {
      organizationId: user.organization.id,
      createdById: user.id,
      name: values.name,
      description: values.description || null,
      startDate: start,
      endDate: end,
      eventTypeId: values.eventTypeId,
      formatId: values.formatId,
      sportId: values.sportId,
      participationType: values.participationType,
      locationName: values.locationName,
      city: values.city || null,
      state: state || null,
      // Registrations need a category, so every event starts with a general one.
      categories: { create: { name: "Geral", gender: "MIXED", sortOrder: 0 } },
    },
    select: { id: true },
  });

  // Refresh the events list and the count shown in the sidebar.
  revalidatePath("/", "layout");
  redirect(`/events/${event.id}`);
}
