/** What a plan allows, and whether one more of something still fits. Pure. */

export type PlanLimits = {
  maxEvents: number | null;
  maxAthletes: number | null;
  maxRegistrationsPerEvent: number | null;
};
export type LimitKind = "events" | "athletes" | "registrations";

const NAMES: Record<LimitKind, { one: string; many: string }> = {
  events: { one: "evento", many: "eventos" },
  athletes: { one: "atleta", many: "atletas" },
  registrations: { one: "inscrição por evento", many: "inscrições por evento" },
};

export function limitOf(plan: PlanLimits, kind: LimitKind): number | null {
  return kind === "events"
    ? plan.maxEvents
    : kind === "athletes"
      ? plan.maxAthletes
      : plan.maxRegistrationsPerEvent;
}

/** null when one more fits; otherwise the sentence to show. */
export function limitMessage(
  plan: PlanLimits & { name: string },
  kind: LimitKind,
  current: number,
): string | null {
  const max = limitOf(plan, kind);
  if (max === null || current < max) return null;
  const n = NAMES[kind];
  return `O plano ${plan.name} permite até ${max} ${max === 1 ? n.one : n.many}. Mude de plano para continuar.`;
}

/** "6 de 8" or "6 (sem limite)", and the share used (0 to 100, null without a limit). */
export function usageText(
  current: number,
  max: number | null,
): { text: string; percent: number | null } {
  return max === null
    ? { text: `${current} (sem limite)`, percent: null }
    : {
        text: `${current} de ${max}`,
        percent: Math.min(100, Math.round((current / max) * 100)),
      };
}
