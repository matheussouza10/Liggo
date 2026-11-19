"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ineligibleReason } from "./eligibility";
import { registrationSchema } from "./schemas";

export type RegistrationResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const fail = (
  fieldErrors: Record<string, string>,
  error = "Revise os campos destacados.",
): RegistrationResult => ({ error, fieldErrors });

/**
 * Creates or updates one registration (entry + roster + staff) in a single
 * transaction. Everything is validated here; the client only helps.
 */
export async function saveRegistrationAction(
  eventId: string,
  registrationId: string | null,
  payload: unknown,
): Promise<RegistrationResult> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (!organizationId || typeof eventId !== "string")
    return { error: "Evento não encontrado." };

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    select: {
      id: true,
      sportId: true,
      startDate: true,
      participationType: true,
    },
  });
  if (!event) return { error: "Evento não encontrado." };

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return fail(fieldErrors);
  }
  const r = parsed.data;

  if (registrationId) {
    const existing = await prisma.registration.findFirst({
      where: { id: registrationId, eventId },
      select: { id: true },
    });
    if (!existing) return { error: "Inscrição não encontrada." };
  }

  const category = await prisma.eventCategory.findFirst({
    where: { id: r.categoryId, eventId },
  });
  if (!category)
    return fail({ categoryId: "Categoria não encontrada neste evento." });

  // Who takes part depends on the event's participation type.
  const type = event.participationType;
  const count = r.members.length;
  if (type === "INDIVIDUAL") {
    if (r.teamId) return fail({ teamId: "Evento individual não usa time." });
    if (count !== 1)
      return fail({
        members: "A inscrição individual tem exatamente 1 atleta.",
      });
  } else if (type === "PAIR") {
    if (r.teamId) return fail({ teamId: "Evento de duplas não usa time." });
    if (count !== 2)
      return fail({ members: "A dupla tem exatamente 2 atletas." });
  } else {
    if (!r.teamId) return fail({ teamId: "Escolha o time." });
    if (count < category.rosterMin)
      return fail({
        members: `O elenco precisa de pelo menos ${category.rosterMin} atletas nesta categoria.`,
      });
    if (category.rosterMax != null && count > category.rosterMax)
      return fail({
        members: `O elenco pode ter no máximo ${category.rosterMax} atletas nesta categoria.`,
      });
  }

  if (r.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: r.teamId, organizationId, active: true },
      select: { id: true },
    });
    if (!team) return fail({ teamId: "Esse time não está disponível." });
    const taken = await prisma.registration.findFirst({
      where: {
        categoryId: category.id,
        teamId: r.teamId,
        ...(registrationId ? { NOT: { id: registrationId } } : {}),
      },
      select: { id: true },
    });
    if (taken)
      return fail({ teamId: "Esse time já está inscrito nesta categoria." });
  }

  // Athletes: unique, known to the organization, eligible, not taken in the category.
  const ids = r.members.map((m) => m.athleteId);
  if (new Set(ids).size !== ids.length)
    return fail({ members: "Há atletas repetidos no elenco." });

  const athletes = await prisma.athlete.findMany({
    where: { id: { in: ids }, organizations: { some: { organizationId } } },
    select: { id: true, name: true, gender: true, birthDate: true },
  });
  if (athletes.length !== ids.length)
    return fail({
      members: "Algum atleta não está no cadastro da sua organização.",
    });
  const byId = new Map(athletes.map((a) => [a.id, a]));

  const errors: Record<string, string> = {};
  for (const m of r.members) {
    const a = byId.get(m.athleteId)!;
    const reason = ineligibleReason(category, a, event.startDate);
    if (reason)
      errors[`member.${m.athleteId}`] =
        `${a.name} não pode jogar esta categoria: ${reason}.`;
  }
  const busy = await prisma.registrationMember.findMany({
    where: {
      categoryId: category.id,
      athleteId: { in: ids },
      ...(registrationId ? { NOT: { registrationId } } : {}),
    },
    select: { athleteId: true },
  });
  for (const b of busy)
    errors[`member.${b.athleteId}`] =
      `${byId.get(b.athleteId)!.name} já está inscrito nesta categoria.`;

  // Roster details.
  const shirts = r.members
    .map((m) => m.shirtNumber)
    .filter((n): n is number => n != null);
  if (new Set(shirts).size !== shirts.length)
    errors.shirts = "Há camisas repetidas.";
  const captains = r.members.filter((m) => m.isCaptain).length;
  if (captains > 1) errors.captain = "Escolha só um capitão.";

  const positionIds = [
    ...new Set(
      r.members.map((m) => m.positionId).filter((p): p is string => p != null),
    ),
  ];
  if (positionIds.length) {
    const valid = await prisma.sportPosition.count({
      where: { id: { in: positionIds }, sportId: event.sportId, active: true },
    });
    if (valid !== positionIds.length)
      errors.positions = "Alguma posição não vale para a modalidade do evento.";
  }
  if (Object.keys(errors).length) return fail(errors);

  const memberRows = (id: string) =>
    r.members.map((m) => ({
      registrationId: id,
      athleteId: m.athleteId,
      categoryId: category.id,
      shirtNumber: m.shirtNumber,
      positionId: m.positionId,
      isCaptain: type === "TEAM" ? m.isCaptain : false,
    }));
  const staffRows = (id: string) =>
    r.staff.map((s) => ({
      registrationId: id,
      name: s.name,
      role: s.role,
      contact: s.contact,
    }));

  try {
    if (registrationId) {
      await prisma.$transaction([
        prisma.registration.update({
          where: { id: registrationId },
          data: { categoryId: category.id, teamId: r.teamId },
        }),
        prisma.registrationMember.deleteMany({ where: { registrationId } }),
        prisma.registrationStaff.deleteMany({ where: { registrationId } }),
        prisma.registrationMember.createMany({
          data: memberRows(registrationId),
        }),
        prisma.registrationStaff.createMany({
          data: staffRows(registrationId),
        }),
      ]);
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.registration.create({
          data: {
            eventId,
            categoryId: category.id,
            teamId: r.teamId,
            createdById: user.id,
          },
          select: { id: true },
        });
        await tx.registrationMember.createMany({
          data: memberRows(created.id),
        });
        await tx.registrationStaff.createMany({ data: staffRows(created.id) });
      });
    }
  } catch (error) {
    // Two people registering the same athlete or team at the same moment.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error:
          "Alguém acabou de inscrever um desses atletas ou o time nesta categoria. Atualize a página e tente de novo.",
      };
    }
    throw error;
  }

  revalidatePath(`/events/${eventId}`, "layout");
  redirect(`/events/${eventId}/registrations`);
}

export async function deleteRegistrationAction(
  eventId: string,
  registrationId: string,
): Promise<{ error?: string }> {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (
    !organizationId ||
    typeof eventId !== "string" ||
    typeof registrationId !== "string"
  )
    return { error: "Inscrição não encontrada." };

  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, eventId, event: { organizationId } },
    select: { id: true },
  });
  if (!registration) return { error: "Inscrição não encontrada." };

  // Members and staff go with it (cascade), freeing the athletes and the team.
  await prisma.registration.delete({ where: { id: registrationId } });
  revalidatePath(`/events/${eventId}`, "layout");
  redirect(`/events/${eventId}/registrations`);
}
