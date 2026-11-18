/** "Matheus de Souza" -> "Matheus S.": shown when a CPF already belongs to someone. */
export function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  const last = parts.at(-1) ?? "";
  return `${parts[0]} ${last[0]?.toUpperCase() ?? ""}.`;
}

/** Whole years between a birth date (UTC midnight) and a reference date. */
export function ageOn(birthDate: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < birthDate.getUTCMonth() ||
    (reference.getUTCMonth() === birthDate.getUTCMonth() &&
      reference.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const GENDER_LABELS = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  OTHER: "Outro",
} as const;

export const REFEREE_ROLE_LABELS = {
  REFEREE: "Árbitro",
  JUDGE: "Juiz",
  ASSISTANT: "Auxiliar",
  TABLE_OFFICIAL: "Mesário",
} as const;
