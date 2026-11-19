"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationUser, requireOwner } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  confirmationProblem,
  passwordProblem,
} from "@/lib/auth/password-policy";
import { destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type FormState = {
  /** Changes on every success, so a form can remount and clear itself. */
  done?: number;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOrganizationUser();
  const name = text(formData, "name");
  if (name.length < 2)
    return { fieldErrors: { name: "Informe o seu nome." }, values: { name } };
  if (name.length > 120)
    return {
      fieldErrors: { name: "Use no máximo 120 caracteres." },
      values: { name },
    };
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { done: Date.now(), message: "Perfil atualizado.", values: { name } };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOrganizationUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!current) fieldErrors.current = "Informe a senha atual.";
  const problem = passwordProblem(next);
  if (problem) fieldErrors.next = problem;
  const confirmProblem = confirmationProblem(next, confirm);
  if (confirmProblem) fieldErrors.confirm = confirmProblem;
  if (!fieldErrors.next && next === current)
    fieldErrors.next = "A nova senha precisa ser diferente da atual.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(current, row?.passwordHash)))
    return { fieldErrors: { current: "A senha atual não confere." } };

  const passwordHash = await hashPassword(next);
  const [, others] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // The other devices lose access; this one stays signed in.
    prisma.session.deleteMany({
      where: { userId: user.id, id: { not: user.sessionId } },
    }),
  ]);
  revalidatePath("/settings", "layout");
  return {
    done: Date.now(),
    message:
      others.count > 0
        ? `Senha alterada. ${others.count === 1 ? "1 outro aparelho foi desconectado" : `${others.count} outros aparelhos foram desconectados`}.`
        : "Senha alterada.",
  };
}

/** Ends every session, this one included. */
export async function signOutEverywhereAction(): Promise<void> {
  const user = await requireOrganizationUser();
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await destroySession();
  redirect("/login");
}

export async function updateOrganizationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOwner();
  const name = text(formData, "name");
  if (name.length < 2)
    return {
      fieldErrors: { name: "Informe o nome da organização." },
      values: { name },
    };
  if (name.length > 120)
    return {
      fieldErrors: { name: "Use no máximo 120 caracteres." },
      values: { name },
    };
  await prisma.organization.update({
    where: { id: user.organization!.id },
    data: { name },
  });
  revalidatePath("/", "layout");
  return {
    done: Date.now(),
    message: "Dados da organização atualizados.",
    values: { name },
  };
}
