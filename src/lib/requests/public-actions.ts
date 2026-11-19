"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isBlocked, LIMITS, recordAttempt } from "@/lib/auth/throttle";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/mail";
import { newRequestMail, requestReceivedMail } from "@/lib/mail/templates";
import { prisma } from "@/lib/prisma";
import { ineligibleReason } from "@/lib/registrations/eligibility";
import { CLOSED_MESSAGES, registrationOpenState } from "./state";
import { parseSubmission } from "./submission";
import { wipePersonalData } from "./wipe";

export type SubmitResult = {
  ok?: boolean;
  /** The secret of the status link: the screen opens it right after sending. */
  token?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Never let a mail failure undo a request that was saved. */
async function trySend(build: () => Parameters<typeof sendMail>[0]) {
  try {
    await sendMail(build());
  } catch (error) {
    console.error(
      "[inscrição pública] e-mail não enviado:",
      error instanceof Error ? error.message : error,
    );
  }
}

async function clientKey(): Promise<string> {
  const h = await headers();
  // Behind a proxy the first address is the visitor; without one it is shared by everyone.
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** A visitor asks to take part in an event. Nothing enters the event before approval. */
export async function submitRequestAction(
  eventId: string,
  payload: unknown,
): Promise<SubmitResult> {
  if (typeof eventId !== "string") return { error: "Evento não encontrado." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      sportId: true,
      startDate: true,
      endDate: true,
      participationType: true,
      registrationOpen: true,
      registrationDeadline: true,
    },
  });
  if (!event) return { error: "Evento não encontrado." };
  const state = registrationOpenState(event, new Date());
  if (!state.open) return { error: CLOSED_MESSAGES[state.reason] };

  const ip = await clientKey();
  const L = LIMITS;
  if (
    await isBlocked(
      "REGISTRATION_REQUEST",
      `ip:${ip}`,
      L.requestPerIpHour.max,
      L.requestPerIpHour.windowMs,
    )
  ) {
    return {
      error: "Muitos pedidos vindos desta conexão. Tente de novo mais tarde.",
    };
  }

  const parsed = parseSubmission(payload, event.participationType);
  if (!parsed.ok)
    return {
      error: "Revise os campos destacados.",
      fieldErrors: parsed.fieldErrors,
    };
  const data = parsed.data;

  // A robot filled the hidden field: answer as if it worked and keep nothing.
  if (data.bot) {
    await recordAttempt("REGISTRATION_REQUEST", `ip:${ip}`);
    return { ok: true, token: newToken().token };
  }

  const emailKey = `email:${data.contactEmail}`;
  if (
    await isBlocked(
      "REGISTRATION_REQUEST",
      emailKey,
      L.requestPerEmailHour.max,
      L.requestPerEmailHour.windowMs,
    )
  ) {
    return {
      error: "Muitos pedidos com este e-mail. Tente de novo mais tarde.",
    };
  }

  const category = await prisma.eventCategory.findFirst({
    where: { id: data.categoryId, eventId },
    select: {
      id: true,
      gender: true,
      minAge: true,
      maxAge: true,
      rosterMin: true,
      rosterMax: true,
    },
  });
  if (!category)
    return {
      error: "Revise os campos destacados.",
      fieldErrors: { categoryId: "Categoria não encontrada neste evento." },
    };

  const errors: Record<string, string> = {};
  if (event.participationType === "TEAM") {
    if (data.members.length < category.rosterMin)
      errors.members = `O elenco precisa de pelo menos ${category.rosterMin} atletas nesta categoria.`;
    if (category.rosterMax != null && data.members.length > category.rosterMax)
      errors.members = `O elenco pode ter no máximo ${category.rosterMax} atletas nesta categoria.`;
  }
  data.members.forEach((m, i) => {
    const reason = ineligibleReason(
      category,
      { gender: m.gender, birthDate: m.birthDate },
      event.startDate,
    );
    if (reason)
      errors[`members.${i}.birthDate`] =
        `${m.name} não pode jogar esta categoria: ${reason}.`;
  });
  const positionIds = [
    ...new Set(
      data.members.map((m) => m.positionId).filter((p): p is string => !!p),
    ),
  ];
  if (positionIds.length) {
    const valid = await prisma.sportPosition.count({
      where: { id: { in: positionIds }, sportId: event.sportId, active: true },
    });
    if (valid !== positionIds.length)
      errors.members = "Alguma posição não vale para a modalidade do evento.";
  }
  if (Object.keys(errors).length)
    return { error: "Revise os campos destacados.", fieldErrors: errors };

  const pending = await prisma.registrationRequest.findFirst({
    where: {
      eventId,
      categoryId: category.id,
      contactEmail: data.contactEmail,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (pending)
    return {
      error:
        "Já existe um pedido pendente deste e-mail para esta categoria. Aguarde a resposta da organização.",
    };

  const { token, hash } = newToken();
  await prisma.registrationRequest.create({
    data: {
      eventId,
      categoryId: category.id,
      teamName: data.teamName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      notes: data.notes,
      consentAt: new Date(),
      tokenHash: hash,
      members: {
        create: data.members.map((m) => ({
          name: m.name,
          birthDate: m.birthDate,
          gender: m.gender,
          cpf: m.cpf,
          email: m.email,
          phone: m.phone,
          guardianName: m.guardianName,
          guardianCpf: m.guardianCpf,
          shirtNumber: m.shirtNumber,
          positionId: m.positionId,
          isCaptain: m.isCaptain,
        })),
      },
      staff: {
        create: data.staff.map((s) => ({
          name: s.name,
          role: s.role,
          contact: s.contact,
        })),
      },
    },
    select: { id: true },
  });
  await recordAttempt("REGISTRATION_REQUEST", `ip:${ip}`);
  await recordAttempt("REGISTRATION_REQUEST", emailKey);

  const who = data.teamName ?? data.members[0]?.name ?? data.contactName;
  await trySend(() =>
    requestReceivedMail(data.contactEmail, data.contactName, event.name, token),
  );
  const owners = await prisma.user.findMany({
    where: {
      organizationId: event.organizationId,
      role: "OWNER",
      disabledAt: null,
    },
    select: { email: true },
  });
  for (const o of owners)
    await trySend(() => newRequestMail(o.email, event.name, who, event.id));

  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true, token };
}

export type WithdrawResult = { ok?: boolean; error?: string };

/** The requester cancels a pending request through the secret link. */
export async function withdrawRequestAction(
  token: string,
): Promise<WithdrawResult> {
  if (typeof token !== "string" || token.length < 20)
    return { error: "Pedido não encontrado." };
  const request = await prisma.registrationRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, eventId: true, status: true },
  });
  if (!request) return { error: "Pedido não encontrado." };
  if (request.status !== "PENDING")
    return {
      error: "Este pedido já foi respondido e não pode mais ser cancelado.",
    };
  await prisma.$transaction([
    prisma.registrationRequest.update({
      where: { id: request.id },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    }),
    ...wipePersonalData(request.id),
  ]);
  revalidatePath(`/events/${request.eventId}`, "layout");
  // Refreshes the status page the visitor is looking at.
  revalidatePath(`/register/status/${token}`);
  return { ok: true };
}
