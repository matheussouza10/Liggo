"use server";

import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/text";
import type { CatalogFormState } from "./types";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function savePositionAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireSystemAdmin();
  const id = text(formData, "id");
  const sportId = text(formData, "sportId");
  const name = text(formData, "name");
  const abbreviation = text(formData, "abbreviation").toUpperCase();
  const values = { name, abbreviation };

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Informe o nome da posição.";
  else if (name.length > 40) fieldErrors.name = "Use no máximo 40 caracteres.";
  if (abbreviation.length > 6)
    fieldErrors.abbreviation = "Use até 6 caracteres.";
  if (!sportId) fieldErrors.sportId = "Escolha a modalidade.";
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };

  const sport = await prisma.sport.findUnique({
    where: { id: sportId },
    select: { id: true },
  });
  if (!sport) return { values, error: "Modalidade não encontrada." };

  const siblings = await prisma.sportPosition.findMany({
    where: { sportId },
    select: { id: true, name: true, sortOrder: true },
  });
  if (siblings.some((p) => p.id !== id && sameName(p.name, name))) {
    return {
      values,
      fieldErrors: {
        name: "Essa modalidade já tem uma posição com esse nome.",
      },
    };
  }

  if (id) {
    const current = siblings.find((p) => p.id === id);
    if (!current) return { values, error: "Posição não encontrada." };
    await prisma.sportPosition.update({
      where: { id },
      data: { name, abbreviation: abbreviation || null },
    });
  } else {
    const next = Math.max(-1, ...siblings.map((p) => p.sortOrder)) + 1;
    await prisma.sportPosition.create({
      data: {
        sportId,
        name,
        abbreviation: abbreviation || null,
        sortOrder: next,
      },
    });
  }
  revalidatePath("/admin/positions", "layout");
  return { ok: true };
}

export async function setPositionActiveAction(
  id: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  await requireSystemAdmin();
  if (typeof id !== "string" || typeof active !== "boolean")
    return { ok: false };
  const result = await prisma.sportPosition.updateMany({
    where: { id },
    data: { active },
  });
  revalidatePath("/admin/positions", "layout");
  return { ok: result.count === 1 };
}
