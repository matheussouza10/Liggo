"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/guards";
import { LIMITS, isBlocked, recordAttempt } from "@/lib/auth/throttle";
import { newToken } from "@/lib/auth/tokens";
import { MailNotConfiguredError, sendMail } from "@/lib/mail";
import { inviteMail } from "@/lib/mail/templates";
import { prisma } from "@/lib/prisma";
import type { FormState } from "@/lib/settings/actions";
import { INVITE_DAYS } from "./invitations";

export type TeamResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): TeamResult => ({ ok: false, error });
const refresh = (): TeamResult => {
  revalidatePath("/settings/team");
  return { ok: true };
};

const EMAIL = z.string().trim().toLowerCase().email();

async function sendInvite(args: {
  to: string;
  organization: string;
  inviter: string;
  role: "OWNER" | "MEMBER";
  token: string;
}): Promise<string | null> {
  try {
    await sendMail(
      inviteMail(
        args.to,
        args.organization,
        args.inviter,
        args.role,
        args.token,
      ),
    );
    return null;
  } catch (error) {
    console.error("Falha ao enviar o convite:", error);
    return error instanceof MailNotConfiguredError
      ? "O envio de e-mail ainda não está configurado neste ambiente."
      : "Não foi possível enviar o e-mail agora. Tente novamente em instantes.";
  }
}

export async function inviteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const owner = await requireOwner();
  const organizationId = owner.organization!.id;
  const parsed = EMAIL.safeParse(String(formData.get("email") ?? ""));
  const role = formData.get("role") === "OWNER" ? "OWNER" : "MEMBER";
  const values = { email: String(formData.get("email") ?? "").trim(), role };
  if (!parsed.success)
    return { fieldErrors: { email: "Informe um e-mail válido." }, values };
  const email = parsed.data;

  if (
    await isBlocked(
      "INVITE",
      organizationId,
      LIMITS.invitePerHour.max,
      LIMITS.invitePerHour.windowMs,
    )
  ) {
    return {
      error: "Muitos convites em pouco tempo. Tente de novo mais tarde.",
      values,
    };
  }
  if (
    await prisma.user.findUnique({ where: { email }, select: { id: true } })
  ) {
    return {
      fieldErrors: {
        email:
          "Este e-mail já tem uma conta. Cada pessoa participa de uma organização.",
      },
      values,
    };
  }
  const pending = await prisma.invitation.findFirst({
    where: {
      organizationId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (pending)
    return {
      fieldErrors: {
        email:
          "Já existe um convite pendente para este e-mail. Use Reenviar na lista.",
      },
      values,
    };

  const { token, hash } = newToken();
  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      email,
      role,
      tokenHash: hash,
      invitedById: owner.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });
  await recordAttempt("INVITE", organizationId);
  const problem = await sendInvite({
    to: email,
    organization: owner.organization!.name,
    inviter: owner.name,
    role,
    token,
  });
  if (problem) {
    await prisma.invitation.delete({ where: { id: invitation.id } });
    return { error: problem, values };
  }
  revalidatePath("/settings/team");
  return { done: Date.now(), message: `Convite enviado para ${email}.` };
}

async function ownInvitation(id: string, organizationId: string) {
  return typeof id === "string"
    ? prisma.invitation.findFirst({
        where: { id, organizationId, acceptedAt: null, revokedAt: null },
      })
    : null;
}

export async function resendInviteAction(id: string): Promise<TeamResult> {
  const owner = await requireOwner();
  const invitation = await ownInvitation(id, owner.organization!.id);
  if (!invitation) return fail("Convite não encontrado.");
  if (
    await isBlocked(
      "INVITE",
      owner.organization!.id,
      LIMITS.invitePerHour.max,
      LIMITS.invitePerHour.windowMs,
    )
  )
    return fail("Muitos envios em pouco tempo. Tente de novo mais tarde.");

  // A new link replaces the old one.
  const { token, hash } = newToken();
  await prisma.invitation.update({
    where: { id },
    data: {
      tokenHash: hash,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await recordAttempt("INVITE", owner.organization!.id);
  const problem = await sendInvite({
    to: invitation.email,
    organization: owner.organization!.name,
    inviter: owner.name,
    role: invitation.role === "OWNER" ? "OWNER" : "MEMBER",
    token,
  });
  return problem ? fail(problem) : refresh();
}

export async function revokeInviteAction(id: string): Promise<TeamResult> {
  const owner = await requireOwner();
  const invitation = await ownInvitation(id, owner.organization!.id);
  if (!invitation) return fail("Convite não encontrado.");
  await prisma.invitation.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return refresh();
}

/** Counts the active owners other than `exceptUserId`. */
const otherActiveOwners = (organizationId: string, exceptUserId: string) =>
  prisma.user.count({
    where: {
      organizationId,
      role: "OWNER",
      disabledAt: null,
      id: { not: exceptUserId },
    },
  });

export async function changeRoleAction(
  userId: string,
  role: "OWNER" | "MEMBER",
): Promise<TeamResult> {
  const owner = await requireOwner();
  const organizationId = owner.organization!.id;
  if (role !== "OWNER" && role !== "MEMBER") return fail("Papel inválido.");
  const target =
    typeof userId === "string"
      ? await prisma.user.findFirst({
          where: { id: userId, organizationId },
          select: { id: true, role: true, disabledAt: true },
        })
      : null;
  if (!target) return fail("Pessoa não encontrada.");
  if (target.role === role) return refresh();
  if (
    role === "MEMBER" &&
    target.role === "OWNER" &&
    !target.disabledAt &&
    (await otherActiveOwners(organizationId, target.id)) === 0
  ) {
    return fail("A organização precisa de pelo menos um proprietário ativo.");
  }
  await prisma.user.update({ where: { id: target.id }, data: { role } });
  return refresh();
}

export async function setMemberDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<TeamResult> {
  const owner = await requireOwner();
  const organizationId = owner.organization!.id;
  const target =
    typeof userId === "string"
      ? await prisma.user.findFirst({
          where: { id: userId, organizationId },
          select: { id: true, role: true, disabledAt: true },
        })
      : null;
  if (!target) return fail("Pessoa não encontrada.");
  if (disabled) {
    if (target.id === owner.id)
      return fail("Você não pode desativar a sua própria conta aqui.");
    if (
      target.role === "OWNER" &&
      (await otherActiveOwners(organizationId, target.id)) === 0
    )
      return fail("A organização precisa de pelo menos um proprietário ativo.");
    await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: { disabledAt: new Date() },
      }),
      // Signed out everywhere, immediately.
      prisma.session.deleteMany({ where: { userId: target.id } }),
    ]);
  } else {
    await prisma.user.update({
      where: { id: target.id },
      data: { disabledAt: null },
    });
  }
  return refresh();
}
