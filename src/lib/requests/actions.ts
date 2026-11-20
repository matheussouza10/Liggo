"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { sendMail } from "@/lib/mail";
import { requestDecisionMail } from "@/lib/mail/templates";
import { formatMoney } from "@/lib/payments/money";
import { checkLimit } from "@/lib/payments/plans";
import { chargeRegistration } from "@/lib/payments/registration-charge";
import { prisma } from "@/lib/prisma";
import { requestInclude, reviewRequest } from "./review";
import { deadlineEnd } from "./state";
import { wipePersonalData } from "./wipe";

export type Result =
  { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

async function ownRequest(requestId: string) {
  const user = await requireOrganizationUser();
  if (!user.organization || typeof requestId !== "string") return null;
  const request = await prisma.registrationRequest.findFirst({
    where: { id: requestId, event: { organizationId: user.organization.id } },
    include: requestInclude,
  });
  return request ? { user, request } : null;
}

function refresh(eventId: string) {
  revalidatePath(`/events/${eventId}`, "layout");
}

export async function saveRegistrationSettingsAction(
  eventId: string,
  input: { open: boolean; deadline: string; notes: string },
): Promise<Result> {
  const user = await requireOrganizationUser();
  if (!user.organization || typeof eventId !== "string")
    return fail("Evento não encontrado.");
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId: user.organization.id },
    select: { id: true },
  });
  if (!event) return fail("Evento não encontrado.");

  const deadlineRaw = String(input?.deadline ?? "").trim();
  const deadline = deadlineRaw ? deadlineEnd(deadlineRaw) : null;
  if (deadlineRaw && !deadline) return fail("Prazo inválido.");
  const notes = String(input?.notes ?? "").trim();
  if (notes.length > 1500)
    return fail("As instruções podem ter no máximo 1500 caracteres.");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      registrationOpen: !!input.open,
      registrationDeadline: deadline,
      registrationNotes: notes || null,
    },
  });
  refresh(eventId);
  return { ok: true };
}

async function notify(
  request: {
    contactEmail: string;
    contactName: string;
    eventId: string;
    event: { name: string };
  },
  decision: Parameters<typeof requestDecisionMail>[4],
) {
  try {
    await sendMail(
      requestDecisionMail(
        request.contactEmail,
        request.contactName,
        request.event.name,
        request.eventId,
        decision,
      ),
    );
  } catch (error) {
    console.error(
      "[inscrição pública] e-mail não enviado:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function rejectRequestAction(
  requestId: string,
  reason: string,
): Promise<Result> {
  const ctx = await ownRequest(requestId);
  if (!ctx) return fail("Pedido não encontrado.");
  const { user, request } = ctx;
  if (request.status !== "PENDING")
    return fail("Este pedido já foi respondido.");
  const why = String(reason ?? "").trim();
  if (why.length < 3)
    return fail("Explique o motivo da recusa (mínimo 3 caracteres).");
  if (why.length > 300)
    return fail("O motivo pode ter no máximo 300 caracteres.");

  await prisma.$transaction([
    prisma.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectionReason: why,
        decidedAt: new Date(),
        decidedById: user.id,
      },
    }),
    ...wipePersonalData(request.id),
  ]);
  await notify(request, { approved: false, reason: why });
  refresh(request.eventId);
  return { ok: true };
}

export async function changeRequestCategoryAction(
  requestId: string,
  categoryId: string,
): Promise<Result> {
  const ctx = await ownRequest(requestId);
  if (!ctx) return fail("Pedido não encontrado.");
  const { request } = ctx;
  if (request.status !== "PENDING")
    return fail("Este pedido já foi respondido.");
  const category = await prisma.eventCategory.findFirst({
    where: { id: String(categoryId), eventId: request.eventId },
    select: { id: true },
  });
  if (!category) return fail("Categoria não encontrada neste evento.");
  await prisma.registrationRequest.update({
    where: { id: request.id },
    data: { categoryId: category.id },
  });
  refresh(request.eventId);
  return { ok: true };
}

export async function removeRequestMemberAction(
  requestId: string,
  memberId: string,
): Promise<Result> {
  const ctx = await ownRequest(requestId);
  if (!ctx) return fail("Pedido não encontrado.");
  const { request } = ctx;
  if (request.status !== "PENDING")
    return fail("Este pedido já foi respondido.");
  if (!request.members.some((m) => m.id === memberId))
    return fail("Atleta não encontrado no pedido.");
  if (request.members.length <= 1)
    return fail(
      "O pedido precisa de ao menos um atleta. Recuse o pedido, se for o caso.",
    );
  await prisma.registrationRequestMember.delete({ where: { id: memberId } });
  refresh(request.eventId);
  return { ok: true };
}

/**
 * Turns a pending request into a real registration: links or creates the
 * athletes, reuses or creates the team, and registers everyone in the category.
 */
export async function approveRequestAction(requestId: string): Promise<Result> {
  const ctx = await ownRequest(requestId);
  if (!ctx) return fail("Pedido não encontrado.");
  const { user, request } = ctx;
  const organizationId = request.event.organizationId;
  if (request.status !== "PENDING")
    return fail("Este pedido já foi respondido.");

  const regLimit = await checkLimit(organizationId, "registrations", {
    eventId: request.eventId,
  });
  if (regLimit) return fail(regLimit);
  const newAthletes = Object.values(
    (await reviewRequest(request)).members,
  ).filter((m) => m.isNew).length;
  if (newAthletes > 0) {
    const athleteLimit = await checkLimit(organizationId, "athletes", {
      adding: newAthletes,
    });
    if (athleteLimit) return fail(athleteLimit);
  }

  const review = await reviewRequest(request);
  if (!review.canApprove)
    return fail(
      "Há problemas a resolver antes de aprovar. Veja os avisos no pedido.",
    );

  try {
    await prisma.$transaction(async (tx) => {
      let teamId: string | null = review.teamId;
      if (request.event.participationType === "TEAM" && !teamId) {
        const team = await tx.team.create({
          data: { organizationId, name: request.teamName ?? "Time" },
          select: { id: true },
        });
        teamId = team.id;
      }

      const athleteIds: Record<string, string> = {};
      for (const m of request.members) {
        const known = review.members[m.id]?.athleteId ?? null;
        if (known) {
          // An athlete that exists elsewhere is linked, never copied or edited.
          await tx.organizationAthlete.upsert({
            where: {
              organizationId_athleteId: { organizationId, athleteId: known },
            },
            create: { organizationId, athleteId: known },
            update: {},
          });
          athleteIds[m.id] = known;
        } else {
          const created = await tx.athlete.create({
            data: {
              cpf: m.cpf,
              name: m.name,
              birthDate: m.birthDate,
              gender: m.gender,
              email: m.email,
              phone: m.phone,
              guardianName: m.guardianName,
              guardianCpf: m.guardianCpf,
              createdByOrganizationId: organizationId,
              organizations: { create: { organizationId } },
            },
            select: { id: true },
          });
          athleteIds[m.id] = created.id;
        }
      }

      const registration = await tx.registration.create({
        data: {
          eventId: request.eventId,
          categoryId: request.categoryId,
          teamId,
          createdById: user.id,
        },
        select: { id: true },
      });
      await tx.registrationMember.createMany({
        data: request.members.map((m) => ({
          registrationId: registration.id,
          athleteId: athleteIds[m.id],
          categoryId: request.categoryId,
          shirtNumber: m.shirtNumber,
          positionId: m.positionId,
          isCaptain:
            request.event.participationType === "TEAM" ? m.isCaptain : false,
        })),
      });
      if (request.staff.length)
        await tx.registrationStaff.createMany({
          data: request.staff.map((s) => ({
            registrationId: registration.id,
            name: s.name,
            role: s.role,
            contact: s.contact,
          })),
        });

      await tx.registrationRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          registrationId: registration.id,
          decidedAt: new Date(),
          decidedById: user.id,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(
        "Alguém acabou de cadastrar um desses atletas ou o time. Atualize a página e confira de novo.",
      );
    }
    throw error;
  }

  // Registration fee: charged in the organization's own account, link goes in the e-mail.
  const created = await prisma.registrationRequest.findUnique({
    where: { id: request.id },
    select: { registrationId: true, category: { select: { feeCents: true } } },
  });
  let charge: Awaited<ReturnType<typeof chargeRegistration>> = {
    status: "skipped",
    reason: "free",
  };
  if (created?.registrationId) {
    charge = await chargeRegistration(created.registrationId, {
      name: request.contactName,
      email: request.contactEmail,
    });
  }
  await notify(request, {
    approved: true,
    payUrl: charge.status === "created" ? charge.url : null,
    feeText:
      charge.status === "created" && created
        ? formatMoney(created.category.feeCents)
        : undefined,
  });
  refresh(request.eventId);
  const note =
    charge.status === "created"
      ? " Cobrança da taxa enviada por e-mail."
      : charge.status === "failed"
        ? ` A cobrança da taxa não pôde ser criada (${charge.error}).`
        : charge.status === "skipped" &&
            charge.reason === "no-account" &&
            created &&
            created.category.feeCents > 0
          ? " A categoria tem taxa, mas a conta de recebimento ainda não está aprovada: nada foi cobrado."
          : "";
  return { ok: true, message: `Pedido aprovado e inscrição criada.${note}` };
}
