"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { MailNotConfiguredError, sendMail } from "@/lib/mail";
import { resetPasswordMail } from "@/lib/mail/templates";
import { hashPassword, verifyPassword } from "./password";
import {
  confirmationProblem,
  MAX_PASSWORD_LENGTH,
  passwordProblem,
} from "./password-policy";
import { LIMITS, clearAttempts, isBlocked, recordAttempt } from "./throttle";
import { hashToken, newToken } from "./tokens";
import { TERMS_VERSION } from "@/lib/legal/version";
import { findUsableInvitation } from "@/lib/team/invitations";
import { createSession, destroySession } from "./session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* ------------------------------ sign in ------------------------------ */

export type SignInState = {
  email: string;
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const area = formData.get("role") === "admin" ? "admin" : "organizer";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<SignInState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "Informe seu e-mail.";
  else if (!EMAIL_PATTERN.test(email))
    fieldErrors.email =
      "Esse e-mail não parece válido. Confira se há @ e domínio.";
  if (!password) fieldErrors.password = "Informe sua senha.";
  else if (password.length > MAX_PASSWORD_LENGTH)
    fieldErrors.password = "Senha ou e-mail incorretos.";

  if (fieldErrors.email || fieldErrors.password) {
    return { email, fieldErrors };
  }

  const normalized = email.toLowerCase();
  if (
    await isBlocked(
      "LOGIN_FAIL",
      normalized,
      LIMITS.login.max,
      LIMITS.login.windowMs,
    )
  ) {
    return {
      email,
      error:
        "Muitas tentativas de entrada. Aguarde alguns minutos e tente de novo.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, passwordHash: true, role: true, disabledAt: true },
  });

  // Always verify, even when the user does not exist, so timing is the same.
  const passwordOk = await verifyPassword(password, user?.passwordHash);

  // A system admin only signs in through the admin screen, and everyone else
  // only through the organizer screen.
  const areaOk =
    user !== null &&
    (area === "admin"
      ? user.role === "SYSTEM_ADMIN"
      : user.role !== "SYSTEM_ADMIN");

  if (!user || !passwordOk || !areaOk) {
    await recordAttempt("LOGIN_FAIL", normalized);
    return { email, error: "E-mail ou senha incorretos." };
  }
  if (user.disabledAt) {
    return {
      email,
      error:
        "Esta conta foi desativada. Fale com o proprietário da organização.",
    };
  }
  await clearAttempts("LOGIN_FAIL", normalized);

  await createSession(user.id);
  redirect(area === "admin" ? "/admin" : "/dashboard");
}

/* ------------------------------ sign up ------------------------------ */

export type SignUpState = {
  values: { organization: string; name: string; email: string };
  error?: string;
  fieldErrors?: {
    organization?: string;
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  };
};

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const organization = String(formData.get("organization") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const terms = formData.get("terms") === "on";

  const values = { organization, name, email };
  const fieldErrors: NonNullable<SignUpState["fieldErrors"]> = {};

  if (organization.length < 2)
    fieldErrors.organization = "Informe o nome da organização.";
  else if (organization.length > 120)
    fieldErrors.organization = "Use no máximo 120 caracteres.";
  if (name.length < 2) fieldErrors.name = "Informe o nome do responsável.";
  else if (name.length > 120)
    fieldErrors.name = "Use no máximo 120 caracteres.";
  if (!email) fieldErrors.email = "Informe seu e-mail.";
  else if (!EMAIL_PATTERN.test(email))
    fieldErrors.email =
      "Esse e-mail não parece válido. Confira se há @ e domínio.";
  const passwordIssue = passwordProblem(password);
  if (passwordIssue) fieldErrors.password = passwordIssue;
  const confirmIssue = confirmationProblem(password, confirmPassword);
  if (confirmIssue) fieldErrors.confirmPassword = confirmIssue;
  if (!terms) fieldErrors.terms = "Aceite os termos para criar a conta.";

  if (Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }

  const normalizedEmail = email.toLowerCase();
  const emailTaken: SignUpState = {
    values,
    fieldErrors: { email: "Já existe uma conta com este e-mail." },
  };

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) return emailTaken;

  const passwordHash = await hashPassword(password);
  const baseSlug = slugify(organization) || "organization";

  let userId: string | null = null;
  for (let attempt = 0; attempt < 2 && !userId; attempt++) {
    try {
      const slug = await uniqueSlug(baseSlug);
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          passwordHash,
          role: "OWNER",
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          organization: { create: { name: organization, slug } },
        },
        select: { id: true },
      });
      userId = created.id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Lost a race: either the e-mail or the slug was taken meanwhile.
      const nowTaken = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (nowTaken) return emailTaken;
    }
  }

  if (!userId) {
    return {
      values,
      error: "Não foi possível criar a conta agora. Tente novamente.",
    };
  }

  await createSession(userId);
  redirect("/dashboard");
}

/* ------------------------------ sign out ----------------------------- */

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/* -------------------------- forgot password -------------------------- */

export type ForgotPasswordState = {
  /** The request was accepted (the same message whether or not the account exists). */
  sent?: boolean;
  email: string;
  error?: string;
  fieldError?: string;
};

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { email, fieldError: "Informe seu e-mail." };
  if (!EMAIL_PATTERN.test(email))
    return {
      email,
      fieldError: "Esse e-mail não parece válido. Confira se há @ e domínio.",
    };

  const normalized = email.toLowerCase();
  // Counted by e-mail whether or not the account exists, so the limit says nothing about accounts.
  if (
    (await isBlocked(
      "RESET_REQUEST",
      normalized,
      LIMITS.resetPerMinute.max,
      LIMITS.resetPerMinute.windowMs,
    )) ||
    (await isBlocked(
      "RESET_REQUEST",
      normalized,
      LIMITS.resetPerHour.max,
      LIMITS.resetPerHour.windowMs,
    ))
  ) {
    return {
      email,
      error:
        "Você já pediu um link há pouco. Aguarde um minuto (ou verifique a caixa de spam) antes de pedir outro.",
    };
  }
  await recordAttempt("RESET_REQUEST", normalized);

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, disabledAt: true },
  });
  if (user && !user.disabledAt) {
    const { token, hash } = newToken();
    await prisma.$transaction([
      // Only the newest link works.
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);
    try {
      await sendMail(resetPasswordMail(normalized, user.name, token));
    } catch (error) {
      console.error("Falha ao enviar o e-mail de recuperação de senha:", error);
      return {
        email,
        error:
          error instanceof MailNotConfiguredError
            ? "O envio de e-mail ainda não está configurado neste ambiente."
            : "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
      };
    }
  }

  // The same answer whether or not the account exists.
  return { email, sent: true };
}

/* --------------------------- reset password --------------------------- */

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: { password?: string; confirmPassword?: string };
};

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: NonNullable<ResetPasswordState["fieldErrors"]> = {};
  const passwordIssue = passwordProblem(password);
  if (passwordIssue) fieldErrors.password = passwordIssue;
  const confirmIssue = confirmationProblem(password, confirmPassword);
  if (confirmIssue) fieldErrors.confirmPassword = confirmIssue;
  if (fieldErrors.password || fieldErrors.confirmPassword)
    return { fieldErrors };

  const row = token
    ? await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          id: true,
          userId: true,
          usedAt: true,
          expiresAt: true,
          user: { select: { disabledAt: true } },
        },
      })
    : null;
  if (
    !row ||
    row.usedAt ||
    row.expiresAt.getTime() <= Date.now() ||
    row.user.disabledAt
  ) {
    return {
      error: "Este link não vale mais. Peça um novo link de recuperação.",
    };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    // Whoever had the old password loses their sessions.
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  await clearAttempts(
    "LOGIN_FAIL",
    (
      await prisma.user.findUnique({
        where: { id: row.userId },
        select: { email: true },
      })
    )?.email ?? "",
  );
  redirect("/login?reset=1");
}

/* ----------------------------- accept invite ---------------------------- */

export type AcceptInviteState = {
  values?: { name: string };
  error?: string;
  fieldErrors?: {
    name?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  };
};

export async function acceptInviteAction(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const terms = formData.get("terms") === "on";
  const values = { name };

  const fieldErrors: NonNullable<AcceptInviteState["fieldErrors"]> = {};
  if (name.length < 2) fieldErrors.name = "Informe o seu nome.";
  else if (name.length > 120)
    fieldErrors.name = "Use no máximo 120 caracteres.";
  const passwordIssue = passwordProblem(password);
  if (passwordIssue) fieldErrors.password = passwordIssue;
  const confirmIssue = confirmationProblem(password, confirmPassword);
  if (confirmIssue) fieldErrors.confirmPassword = confirmIssue;
  if (!terms) fieldErrors.terms = "Aceite os termos para criar a conta.";
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };

  const invitation = await findUsableInvitation(token);
  if (!invitation)
    return {
      values,
      error:
        "Este convite não vale mais. Peça um novo convite a quem convidou você.",
    };
  if (
    await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    })
  ) {
    return {
      values,
      error: "Já existe uma conta com o e-mail deste convite. Entre com ela.",
    };
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      // Single use, even with two clicks at once.
      const taken = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (taken.count !== 1) throw new Error("INVITE_TAKEN");
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          name,
          passwordHash,
          role: invitation.role === "OWNER" ? "OWNER" : "MEMBER",
          organizationId: invitation.organization.id,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
        select: { id: true },
      });
      return created.id;
    });
  } catch (error) {
    if (
      isUniqueViolation(error) ||
      (error instanceof Error && error.message === "INVITE_TAKEN")
    ) {
      return {
        values,
        error: "Este convite já foi usado ou o e-mail já tem conta.",
      };
    }
    throw error;
  }

  await createSession(userId);
  redirect("/dashboard");
}
