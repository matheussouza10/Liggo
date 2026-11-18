"use server";

import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { adapterFor } from "./adapters";
import {
  CATALOGS,
  PARTICIPATION_TYPES,
  isCatalogKey,
  isParticipationType,
} from "./config";
import type { CatalogFormState, ItemInput } from "./types";

const NAME_MIN = 2;
const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function validName(name: string): string | undefined {
  if (name.length < NAME_MIN) return "Informe o nome.";
  if (name.length > NAME_MAX) return `Use no máximo ${NAME_MAX} caracteres.`;
}

function refresh(catalog: keyof typeof CATALOGS) {
  revalidatePath(CATALOGS[catalog].path, "layout");
}

export async function saveCategoryAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireSystemAdmin();
  const catalog = formData.get("catalog");
  if (!isCatalogKey(catalog)) return { error: "Cadastro desconhecido." };

  const id = text(formData, "id");
  const name = text(formData, "name");
  const values = { name };

  const nameError = validName(name);
  if (nameError) return { values, fieldErrors: { name: nameError } };

  const adapter = adapterFor(catalog);
  if (await adapter.categoryByName(name, id || undefined)) {
    return {
      values,
      fieldErrors: { name: "Já existe uma categoria com esse nome." },
    };
  }

  if (id) {
    if (!(await adapter.getCategory(id)))
      return { values, error: "Categoria não encontrada." };
    await adapter.updateCategory(id, { name });
  } else {
    await adapter.createCategory(name);
  }
  refresh(catalog);
  return { ok: true };
}

export async function saveItemAction(
  _prev: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireSystemAdmin();
  const catalog = formData.get("catalog");
  if (!isCatalogKey(catalog)) return { error: "Cadastro desconhecido." };
  const config = CATALOGS[catalog];

  const id = text(formData, "id");
  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  const description = text(formData, "description");
  const participationTypes = formData
    .getAll("participationTypes")
    .filter(isParticipationType);
  const allowsGroups = formData.get("allowsGroups") === "on";
  const allowsRepechage = formData.get("allowsRepechage") === "on";

  const values = { name, categoryId, description };
  const fieldErrors: Record<string, string> = {};

  const nameError = validName(name);
  if (nameError) fieldErrors.name = nameError;
  if (!categoryId) fieldErrors.categoryId = "Escolha a categoria.";
  if (description.length > DESCRIPTION_MAX)
    fieldErrors.description = `Use no máximo ${DESCRIPTION_MAX} caracteres.`;
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };

  const adapter = adapterFor(catalog);
  const category = await adapter.getCategory(categoryId);
  if (!category)
    return { values, fieldErrors: { categoryId: "Categoria não encontrada." } };

  if (await adapter.itemByName(categoryId, name, id || undefined)) {
    return {
      values,
      fieldErrors: {
        name: `Já existe ${config.singular === "modalidade" ? "uma" : "um"} ${config.singular} com esse nome nessa categoria.`,
      },
    };
  }

  const input: ItemInput = {
    name,
    categoryId,
    description: config.hasDescription && description ? description : null,
    participationTypes: config.isFormat
      ? PARTICIPATION_TYPES.filter((t) => participationTypes.includes(t))
      : [],
    allowsGroups: config.isFormat && allowsGroups,
    allowsRepechage: config.isFormat && allowsRepechage,
  };

  if (id) {
    if (!(await adapter.itemExists(id)))
      return { values, error: "Registro não encontrado." };
    await adapter.updateItem(id, input);
  } else {
    await adapter.createItem(input);
  }
  refresh(catalog);
  return { ok: true };
}

export async function setItemActiveAction(
  catalog: string,
  id: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  await requireSystemAdmin();
  if (
    !isCatalogKey(catalog) ||
    typeof id !== "string" ||
    typeof active !== "boolean"
  )
    return { ok: false };
  const adapter = adapterFor(catalog);
  if (!(await adapter.itemExists(id))) return { ok: false };
  await adapter.setItemActive(id, active);
  refresh(catalog);
  return { ok: true };
}

export async function setCategoryActiveAction(
  catalog: string,
  id: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  await requireSystemAdmin();
  if (
    !isCatalogKey(catalog) ||
    typeof id !== "string" ||
    typeof active !== "boolean"
  )
    return { ok: false };
  const adapter = adapterFor(catalog);
  if (!(await adapter.getCategory(id))) return { ok: false };
  await adapter.updateCategory(id, { active });
  refresh(catalog);
  return { ok: true };
}
