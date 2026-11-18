import type { CatalogKey, ParticipationType } from "./types";

export type CatalogConfig = {
  key: CatalogKey;
  /** Page title and sidebar label. */
  title: string;
  /** Singular, lowercase, for messages ("Nova modalidade"). */
  singular: string;
  newLabel: string;
  path: string;
  description: string;
  hasDescription: boolean;
  isFormat: boolean;
};

export const CATALOGS: Record<CatalogKey, CatalogConfig> = {
  sports: {
    key: "sports",
    title: "Modalidades",
    singular: "modalidade",
    newLabel: "Nova modalidade",
    path: "/admin/sports",
    description:
      "Modalidades esportivas que os organizadores podem escolher ao criar um evento.",
    hasDescription: false,
    isFormat: false,
  },
  "event-types": {
    key: "event-types",
    title: "Tipos de evento",
    singular: "tipo de evento",
    newLabel: "Novo tipo",
    path: "/admin/event-types",
    description:
      "Natureza do evento: campeonato, torneio, liga, corrida, amistoso e outros.",
    hasDescription: true,
    isFormat: false,
  },
  formats: {
    key: "formats",
    title: "Formatos",
    singular: "formato",
    newLabel: "Novo formato",
    path: "/admin/formats",
    description:
      "Formatos de competição e de disputa: pontos corridos, mata-mata, grupos e outros.",
    hasDescription: true,
    isFormat: true,
  },
};

export const CATALOG_KEYS = Object.keys(CATALOGS) as CatalogKey[];

export function isCatalogKey(value: unknown): value is CatalogKey {
  return typeof value === "string" && value in CATALOGS;
}

export const PARTICIPATION_TYPES: ParticipationType[] = [
  "INDIVIDUAL",
  "PAIR",
  "TEAM",
];

export const PARTICIPATION_LABELS: Record<ParticipationType, string> = {
  INDIVIDUAL: "Individual",
  PAIR: "Dupla",
  TEAM: "Equipe",
};

export function isParticipationType(
  value: unknown,
): value is ParticipationType {
  return (
    typeof value === "string" &&
    (PARTICIPATION_TYPES as string[]).includes(value)
  );
}
