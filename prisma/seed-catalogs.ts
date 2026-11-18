import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

export type ParsedCategory = { name: string; items: string[] };

/**
 * Reads a catalog document: `## Category` starts a category, `- Item` adds an
 * item to it. Everything from the first `---` on (suggested fields, notes) is
 * ignored, as are the title and `>` quotes.
 */
export function parseCatalog(markdown: string): ParsedCategory[] {
  const categories: ParsedCategory[] = [];
  let current: ParsedCategory | null = null;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "---") break;
    if (line.startsWith("## ")) {
      current = { name: line.slice(3).trim(), items: [] };
      categories.push(current);
    } else if (line.startsWith("- ") && current) {
      const name = line.slice(2).trim();
      if (name) current.items.push(name);
    }
  }
  return categories.filter((c) => c.items.length > 0);
}

function readDoc(file: string): ParsedCategory[] {
  return parseCatalog(
    readFileSync(resolve(process.cwd(), "docs", file), "utf8"),
  );
}

type Row = {
  name: string;
  slug: string;
  sortOrder: number;
  categorySlug: string;
};

/** Flattens categories into item rows with unique slugs (first one keeps the plain slug). */
function toRows(categories: ParsedCategory[]): {
  cats: { name: string; slug: string; sortOrder: number }[];
  rows: Row[];
} {
  const used = new Set<string>();
  const cats = categories.map((c, i) => ({
    name: c.name,
    slug: slugify(c.name, 60),
    sortOrder: i,
  }));
  const rows: Row[] = [];
  categories.forEach((category, ci) => {
    category.items.forEach((name, ii) => {
      const categorySlug = cats[ci].slug;
      let slug = slugify(name, 60);
      if (used.has(slug)) slug = `${slug}-${categorySlug}`;
      used.add(slug);
      rows.push({ name, slug, sortOrder: ii, categorySlug });
    });
  });
  return { cats, rows };
}

// Metadata inferred from the format names. The admin can change all of it.
const FORMAT_META: Record<
  string,
  {
    participationTypes?: ("INDIVIDUAL" | "PAIR" | "TEAM")[];
    allowsGroups?: true;
    allowsRepechage?: true;
  }
> = {
  "Desafio Individual": { participationTypes: ["INDIVIDUAL"] },
  "Desafio por Equipes": { participationTypes: ["TEAM"] },
  "Fase de Grupos": { allowsGroups: true },
  "Grupos + Mata-mata": { allowsGroups: true },
  "Grupo Único": { allowsGroups: true },
  "Múltiplos Grupos": { allowsGroups: true },
  "Cruzamento entre Grupos": { allowsGroups: true },
  Repescagem: { allowsRepechage: true },
  "Eliminatória Dupla (Double Elimination)": { allowsRepechage: true },
};

/**
 * Idempotent: rows that already exist (same slug or same name in the category)
 * are skipped, so edits made in the admin are never overwritten.
 */
export async function seedCatalogs(prisma: PrismaClient) {
  // Sports
  {
    const { cats, rows } = toRows(readDoc("Liggo_Modalidades_Esportivas.md"));
    await prisma.sportCategory.createMany({ data: cats, skipDuplicates: true });
    const map = new Map(
      (await prisma.sportCategory.findMany()).map((c) => [c.slug, c.id]),
    );
    await prisma.sport.createMany({
      data: rows.map(({ categorySlug, ...r }) => ({
        ...r,
        categoryId: map.get(categorySlug)!,
      })),
      skipDuplicates: true,
    });
  }
  // Event types
  {
    const { cats, rows } = toRows(readDoc("Liggo_Tipos_de_Eventos.md"));
    await prisma.eventTypeCategory.createMany({
      data: cats,
      skipDuplicates: true,
    });
    const map = new Map(
      (await prisma.eventTypeCategory.findMany()).map((c) => [c.slug, c.id]),
    );
    await prisma.eventType.createMany({
      data: rows.map(({ categorySlug, ...r }) => ({
        ...r,
        categoryId: map.get(categorySlug)!,
      })),
      skipDuplicates: true,
    });
  }
  // Competition formats
  {
    const { cats, rows } = toRows(readDoc("Liggo_Formatos_de_Competicao.md"));
    await prisma.formatCategory.createMany({
      data: cats,
      skipDuplicates: true,
    });
    const map = new Map(
      (await prisma.formatCategory.findMany()).map((c) => [c.slug, c.id]),
    );
    await prisma.competitionFormat.createMany({
      data: rows.map(({ categorySlug, ...r }) => ({
        ...r,
        categoryId: map.get(categorySlug)!,
        participationTypes: FORMAT_META[r.name]?.participationTypes ?? [],
        allowsGroups: FORMAT_META[r.name]?.allowsGroups ?? false,
        allowsRepechage: FORMAT_META[r.name]?.allowsRepechage ?? false,
      })),
      skipDuplicates: true,
    });
  }
}
