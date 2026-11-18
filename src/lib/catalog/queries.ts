import "server-only";

import { prisma } from "@/lib/prisma";
import { adapterFor } from "./adapters";
import type {
  CatalogKey,
  CategoryRow,
  ItemRow,
  ParticipationType,
} from "./types";

export async function getCatalogAdminData(
  catalog: CatalogKey,
): Promise<{ categories: CategoryRow[]; items: ItemRow[] }> {
  const adapter = adapterFor(catalog);
  const [categories, items] = await Promise.all([
    adapter.listCategories(),
    adapter.listItems(),
  ]);
  return { categories, items };
}

export type OptionGroup<T> = { category: string; options: T[] };
export type SimpleOption = { id: string; name: string };
export type FormatOption = SimpleOption & {
  participationTypes: ParticipationType[];
};

function group<T extends { name: string }>(
  rows: { category: { name: string }; value: T }[],
): OptionGroup<T>[] {
  const groups: OptionGroup<T>[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last.category === row.category.name)
      last.options.push(row.value);
    else groups.push({ category: row.category.name, options: [row.value] });
  }
  return groups;
}

const activeOnly = { active: true, category: { active: true } };
const inOrder = [
  { category: { sortOrder: "asc" as const } },
  { sortOrder: "asc" as const },
  { name: "asc" as const },
];

/** Active options only, grouped by category, for the event form. */
export async function getEventFormOptions() {
  const [types, formats, sports] = await Promise.all([
    prisma.eventType.findMany({
      where: activeOnly,
      orderBy: inOrder,
      include: { category: true },
    }),
    prisma.competitionFormat.findMany({
      where: activeOnly,
      orderBy: inOrder,
      include: { category: true },
    }),
    prisma.sport.findMany({
      where: activeOnly,
      orderBy: inOrder,
      include: { category: true },
    }),
  ]);
  return {
    types: group<SimpleOption>(
      types.map((t) => ({
        category: t.category,
        value: { id: t.id, name: t.name },
      })),
    ),
    formats: group<FormatOption>(
      formats.map((f) => ({
        category: f.category,
        value: {
          id: f.id,
          name: f.name,
          participationTypes: f.participationTypes,
        },
      })),
    ),
    sports: group<SimpleOption>(
      sports.map((s) => ({
        category: s.category,
        value: { id: s.id, name: s.name },
      })),
    ),
  };
}
