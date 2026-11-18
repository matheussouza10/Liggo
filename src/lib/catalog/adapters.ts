import "server-only";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sameName } from "@/lib/text";
import type { CatalogKey, CategoryRow, ItemInput, ItemRow } from "./types";

/**
 * One adapter per catalog. The three catalogs live in separate tables (strong
 * foreign keys from events), so each adapter calls its own Prisma delegates
 * with concrete, typed arguments.
 */
type Adapter = {
  listCategories(): Promise<CategoryRow[]>;
  listItems(): Promise<ItemRow[]>;
  categoryByName(
    name: string,
    excludeId?: string,
  ): Promise<{ id: string } | null>;
  createCategory(name: string): Promise<void>;
  updateCategory(
    id: string,
    data: { name?: string; active?: boolean },
  ): Promise<void>;
  getCategory(id: string): Promise<{ id: string; active: boolean } | null>;
  itemByName(
    categoryId: string,
    name: string,
    excludeId?: string,
  ): Promise<{ id: string } | null>;
  createItem(input: ItemInput): Promise<void>;
  updateItem(id: string, input: ItemInput): Promise<void>;
  setItemActive(id: string, active: boolean): Promise<void>;
  itemExists(id: string): Promise<boolean>;
};

const byOrder = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
) {
  const root = base || "item";
  let slug = root;
  for (let i = 2; await exists(slug); i++) slug = `${root}-${i}`;
  return slug;
}

const emptyExtras = {
  description: null,
  participationTypes: [] as ItemRow["participationTypes"],
  allowsGroups: false,
  allowsRepechage: false,
};

const sports: Adapter = {
  async listCategories() {
    const rows = await prisma.sportCategory.findMany({
      orderBy: byOrder,
      include: { _count: { select: { items: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      itemCount: c._count.items,
    }));
  },
  async listItems() {
    const rows = await prisma.sport.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, ...byOrder],
      include: { category: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      active: r.active,
      ...emptyExtras,
    }));
  },
  categoryByName: async (name, excludeId) =>
    (
      await prisma.sportCategory.findMany({ select: { id: true, name: true } })
    ).find((c) => c.id !== excludeId && sameName(c.name, name)) ?? null,
  async createCategory(name) {
    const last = await prisma.sportCategory.aggregate({
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(name, 60),
      async (s) =>
        !!(await prisma.sportCategory.findUnique({ where: { slug: s } })),
    );
    await prisma.sportCategory.create({
      data: { name, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  },
  async updateCategory(id, data) {
    await prisma.sportCategory.update({ where: { id }, data });
  },
  getCategory: (id) =>
    prisma.sportCategory.findUnique({
      where: { id },
      select: { id: true, active: true },
    }),
  itemByName: async (categoryId, name, excludeId) =>
    (
      await prisma.sport.findMany({
        where: { categoryId },
        select: { id: true, name: true },
      })
    ).find((i) => i.id !== excludeId && sameName(i.name, name)) ?? null,
  async createItem(input) {
    const last = await prisma.sport.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(input.name, 60),
      async (s) => !!(await prisma.sport.findUnique({ where: { slug: s } })),
    );
    await prisma.sport.create({
      data: {
        name: input.name,
        categoryId: input.categoryId,
        slug,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  },
  async updateItem(id, input) {
    await prisma.sport.update({
      where: { id },
      data: { name: input.name, categoryId: input.categoryId },
    });
  },
  async setItemActive(id, active) {
    await prisma.sport.update({ where: { id }, data: { active } });
  },
  async itemExists(id) {
    return !!(await prisma.sport.findUnique({
      where: { id },
      select: { id: true },
    }));
  },
};

const eventTypes: Adapter = {
  async listCategories() {
    const rows = await prisma.eventTypeCategory.findMany({
      orderBy: byOrder,
      include: { _count: { select: { items: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      itemCount: c._count.items,
    }));
  },
  async listItems() {
    const rows = await prisma.eventType.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, ...byOrder],
      include: { category: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      active: r.active,
      ...emptyExtras,
      description: r.description,
    }));
  },
  categoryByName: async (name, excludeId) =>
    (
      await prisma.eventTypeCategory.findMany({
        select: { id: true, name: true },
      })
    ).find((c) => c.id !== excludeId && sameName(c.name, name)) ?? null,
  async createCategory(name) {
    const last = await prisma.eventTypeCategory.aggregate({
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(name, 60),
      async (s) =>
        !!(await prisma.eventTypeCategory.findUnique({ where: { slug: s } })),
    );
    await prisma.eventTypeCategory.create({
      data: { name, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  },
  async updateCategory(id, data) {
    await prisma.eventTypeCategory.update({ where: { id }, data });
  },
  getCategory: (id) =>
    prisma.eventTypeCategory.findUnique({
      where: { id },
      select: { id: true, active: true },
    }),
  itemByName: async (categoryId, name, excludeId) =>
    (
      await prisma.eventType.findMany({
        where: { categoryId },
        select: { id: true, name: true },
      })
    ).find((i) => i.id !== excludeId && sameName(i.name, name)) ?? null,
  async createItem(input) {
    const last = await prisma.eventType.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(input.name, 60),
      async (s) =>
        !!(await prisma.eventType.findUnique({ where: { slug: s } })),
    );
    await prisma.eventType.create({
      data: {
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
        slug,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  },
  async updateItem(id, input) {
    await prisma.eventType.update({
      where: { id },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
      },
    });
  },
  async setItemActive(id, active) {
    await prisma.eventType.update({ where: { id }, data: { active } });
  },
  async itemExists(id) {
    return !!(await prisma.eventType.findUnique({
      where: { id },
      select: { id: true },
    }));
  },
};

const formats: Adapter = {
  async listCategories() {
    const rows = await prisma.formatCategory.findMany({
      orderBy: byOrder,
      include: { _count: { select: { items: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      itemCount: c._count.items,
    }));
  },
  async listItems() {
    const rows = await prisma.competitionFormat.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, ...byOrder],
      include: { category: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.categoryId,
      categoryName: r.category.name,
      active: r.active,
      description: r.description,
      participationTypes: r.participationTypes,
      allowsGroups: r.allowsGroups,
      allowsRepechage: r.allowsRepechage,
    }));
  },
  categoryByName: async (name, excludeId) =>
    (
      await prisma.formatCategory.findMany({ select: { id: true, name: true } })
    ).find((c) => c.id !== excludeId && sameName(c.name, name)) ?? null,
  async createCategory(name) {
    const last = await prisma.formatCategory.aggregate({
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(name, 60),
      async (s) =>
        !!(await prisma.formatCategory.findUnique({ where: { slug: s } })),
    );
    await prisma.formatCategory.create({
      data: { name, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
  },
  async updateCategory(id, data) {
    await prisma.formatCategory.update({ where: { id }, data });
  },
  getCategory: (id) =>
    prisma.formatCategory.findUnique({
      where: { id },
      select: { id: true, active: true },
    }),
  itemByName: async (categoryId, name, excludeId) =>
    (
      await prisma.competitionFormat.findMany({
        where: { categoryId },
        select: { id: true, name: true },
      })
    ).find((i) => i.id !== excludeId && sameName(i.name, name)) ?? null,
  async createItem(input) {
    const last = await prisma.competitionFormat.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    const slug = await uniqueSlug(
      slugify(input.name, 60),
      async (s) =>
        !!(await prisma.competitionFormat.findUnique({ where: { slug: s } })),
    );
    await prisma.competitionFormat.create({
      data: {
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
        slug,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        participationTypes: input.participationTypes,
        allowsGroups: input.allowsGroups,
        allowsRepechage: input.allowsRepechage,
      },
    });
  },
  async updateItem(id, input) {
    await prisma.competitionFormat.update({
      where: { id },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        description: input.description,
        participationTypes: input.participationTypes,
        allowsGroups: input.allowsGroups,
        allowsRepechage: input.allowsRepechage,
      },
    });
  },
  async setItemActive(id, active) {
    await prisma.competitionFormat.update({ where: { id }, data: { active } });
  },
  async itemExists(id) {
    return !!(await prisma.competitionFormat.findUnique({
      where: { id },
      select: { id: true },
    }));
  },
};

const ADAPTERS: Record<CatalogKey, Adapter> = {
  sports,
  "event-types": eventTypes,
  formats,
};

export function adapterFor(catalog: CatalogKey): Adapter {
  return ADAPTERS[catalog];
}
