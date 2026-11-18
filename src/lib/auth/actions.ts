"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// scrypt is deliberately slow; cap the input so a huge password cannot be
// used to burn server time.
const MAX_PASSWORD_LENGTH = 200;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "organization";
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, passwordHash: true, role: true },
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
    return { email, error: "E-mail ou senha incorretos." };
  }

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
  if (password.length < MIN_PASSWORD_LENGTH)
    fieldErrors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  else if (password.length > MAX_PASSWORD_LENGTH)
    fieldErrors.password = `Use no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  if (!confirmPassword) fieldErrors.confirmPassword = "Repita a senha.";
  else if (confirmPassword !== password)
    fieldErrors.confirmPassword = "As senhas não coincidem.";
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
  const baseSlug = slugify(organization);

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

  // Recuperação de senha ainda não implementada: não simulamos o envio.
  return {
    email,
    error:
      "A recuperação de senha ainda não está conectada. O e-mail foi validado, mas nenhum link foi enviado.",
  };
}
