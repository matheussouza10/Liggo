"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { parseMoney } from "@/lib/payments/money";
import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/text";
import { categorySchema } from "./schemas";

export type CategoryFormState = {
  values?: Record<string, string>;
  fieldErrors?: Record<string, string>;
  error?: string;
  ok?: boolean;
};

const FIELDS = [
  "name",
  "gender",
  "minAge",
  "maxAge",
  "rosterMin",
  "rosterMax",
  "fee",
] as const;

async function ownEvent(eventId: string) {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  if (!organizationId || typeof eventId !== "string") return null;
  return prisma.event.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true },
  });
}

export async function saveCategoryAction(
  eventId: string,
  categoryId: string | null,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const event = await ownEvent(eventId);
  if (!event) return { error: "Evento não encontrado." };

  const values = Object.fromEntries(
    FIELDS.map((k) => [k, String(formData.get(k) ?? "")]),
  );
  // The fee is optional; empty means free.
  const feeText = values.fee.trim();
  const feeCents = feeText === "" ? 0 : parseMoney(feeText);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    if (feeCents === null) fieldErrors.fee = "Valor inválido (ex.: 50,00).";
    return { values, fieldErrors };
  }
  if (feeCents === null)
    return { values, fieldErrors: { fee: "Valor inválido (ex.: 50,00)." } };
  const d = parsed.data;

  const siblings = await prisma.eventCategory.findMany({
    where: { eventId },
    select: { id: true, name: true, sortOrder: true },
  });
  if (categoryId && !siblings.some((c) => c.id === categoryId))
    return { values, error: "Categoria não encontrada." };
  if (siblings.some((c) => c.id !== categoryId && sameName(c.name, d.name))) {
    return {
      values,
      fieldErrors: {
        name: "Já existe uma categoria com esse nome neste evento.",
      },
    };
  }

  const data = {
    name: d.name,
    gender: d.gender,
    minAge: d.minAge,
    maxAge: d.maxAge,
    rosterMin: d.rosterMin,
    rosterMax: d.rosterMax,
    feeCents,
  };
  if (categoryId) {
    await prisma.eventCategory.update({ where: { id: categoryId }, data });
  } else {
    const next = Math.max(-1, ...siblings.map((c) => c.sortOrder)) + 1;
    await prisma.eventCategory.create({
      data: { ...data, eventId, sortOrder: next },
    });
  }
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true };
}

export async function deleteCategoryAction(
  eventId: string,
  categoryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const event = await ownEvent(eventId);
  if (!event || typeof categoryId !== "string")
    return { ok: false, error: "Categoria não encontrada." };

  const category = await prisma.eventCategory.findFirst({
    where: { id: categoryId, eventId },
    select: { id: true, _count: { select: { registrations: true } } },
  });
  if (!category) return { ok: false, error: "Categoria não encontrada." };
  if (category._count.registrations > 0) {
    return {
      ok: false,
      error:
        "Essa categoria já tem inscrições. Remova as inscrições antes de excluí-la.",
    };
  }
  const total = await prisma.eventCategory.count({ where: { eventId } });
  if (total <= 1)
    return { ok: false, error: "O evento precisa ter ao menos uma categoria." };

  await prisma.eventCategory.delete({ where: { id: categoryId } });
  revalidatePath(`/events/${eventId}`, "layout");
  return { ok: true };
}
