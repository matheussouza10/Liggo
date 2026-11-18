export const BR_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const EVENT_LIMITS = {
  nameMin: 3,
  nameMax: 120,
  descriptionMax: 2000,
  locationMin: 2,
  locationMax: 120,
  cityMax: 80,
} as const;

/** "2026-06-12" -> Date at UTC midnight, or null when it is not a real calendar date. */
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

/** Dates are stored as plain days (UTC midnight), so they are shown in UTC. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
