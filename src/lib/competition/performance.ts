/** Performance events (athletics, swimming, cycling, shooting...): ranked by a measured result. Pure: no database. */
import { mulberry32 } from "./prng";

export type PerfMetric = "TIME" | "DISTANCE" | "HEIGHT" | "POINTS";
export type PerfConfig = {
  metric: PerfMetric;
  bestIs: "LOWEST" | "HIGHEST";
  /** Attempts everyone takes. */
  attempts: number;
  /** Only the best N after those attempts may take the extra ones (null: nobody is cut). */
  finalists: number | null;
  extraAttempts: number | null;
  aggregation: "BEST" | "SUM" | "AVERAGE";
  /** Circuit: points by finishing place. Each attempt is a stage and its value is the place. */
  placePoints?: { place: number; points: number }[] | null;
  /** Circuit: how many of the worst stage results are dropped from the total. */
  dropWorst?: number | null;
};
export type AttemptStatus = "OK" | "NM" | "DNF" | "DNS" | "DQ";
export type Attempt = {
  number: number;
  status: AttemptStatus;
  value: number | null;
};
export type PerfRowStatus = "OK" | "PENDING" | "NM" | "DNF" | "DNS" | "DQ";

export const STATUS_LABELS: Record<AttemptStatus, string> = {
  OK: "Marca válida",
  NM: "Sem marca",
  DNF: "Não terminou (DNF)",
  DNS: "Não largou (DNS)",
  DQ: "Desclassificado (DQ)",
};

const num = (text: string) => {
  const n = Number(text.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Reads what a person typed: "1:23.45", "83,45", "7,85". Returns seconds, meters or points. */
export function parseValue(
  metric: PerfMetric,
  text: string,
): { value: number } | { error: string } {
  const t = text.trim();
  if (!t) return { error: "Informe o valor." };
  if (metric === "TIME") {
    const parts = t.split(":");
    if (parts.length > 3)
      return { error: "Tempo inválido. Use 1:23.45 ou 83,45." };
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      const p =
        i === parts.length - 1
          ? num(parts[i])
          : /^\d+$/.test(parts[i].trim())
            ? Number(parts[i])
            : null;
      if (p === null || p < 0)
        return { error: "Tempo inválido. Use 1:23.45 ou 83,45." };
      if (i > 0 && i === parts.length - 1 && p >= 60)
        return { error: "Segundos de 0 a 59,99 quando há minutos." };
      seconds = seconds * 60 + p;
    }
    if (parts.length === 3 && Number(parts[1]) >= 60)
      return { error: "Minutos de 0 a 59." };
    if (seconds <= 0) return { error: "O tempo precisa ser maior que zero." };
    return { value: Math.round(seconds * 1000) / 1000 };
  }
  const n = num(t);
  if (n === null) return { error: "Use um número (ex.: 7,85)." };
  if (metric === "POINTS") {
    if (n < 0 || n > 100000) return { error: "Pontuação de 0 a 100000." };
    return { value: Math.round(n * 1000) / 1000 };
  }
  if (n <= 0 || n > 1000)
    return { error: "Informe um valor em metros maior que zero." };
  return { value: Math.round(n * 1000) / 1000 };
}

/** Shows a value: 1:23.45, 7.85 m, 120 pts. */
export function formatValue(metric: PerfMetric, v: number | null): string {
  if (v === null) return "–";
  if (metric === "TIME") {
    const cs = Math.round(v * 100);
    const h = Math.floor(cs / 360000);
    const m = Math.floor((cs % 360000) / 6000);
    const s = (cs % 6000) / 100;
    const sec = s.toFixed(2).padStart(5, "0");
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sec}`;
    if (m > 0) return `${m}:${sec}`;
    return s.toFixed(2);
  }
  if (metric === "POINTS")
    return `${Math.round(v * 100) / 100}`.replace(".", ",");
  return `${v.toFixed(2).replace(".", ",")} m`;
}

/** A circuit adds up points by place over several stages. */
export const isCircuit = (c: PerfConfig) =>
  !!c.placePoints && c.placePoints.length > 0;

/** Points of finishing in `place` (0 beyond the table). */
export const placePointsFor = (c: PerfConfig, place: number): number =>
  c.placePoints?.find((p) => p.place === place)?.points ?? 0;

/**
 * Relay and other cumulative times: the result is the sum of every leg, lowest
 * wins. A team only counts once every leg has a time; a leg that was not
 * finished voids the team.
 */
export const isCumulative = (c: PerfConfig) =>
  c.metric === "TIME" &&
  c.aggregation === "SUM" &&
  c.bestIs === "LOWEST" &&
  !isCircuit(c);

/**
 * High jump and pole vault: the bar goes up, each jump is a height with a
 * clear (O) or a miss (X), three misses in a row end it, and the result is
 * the highest height cleared.
 */
export const isBarMode = (c: PerfConfig, tiebreakers: readonly string[]) =>
  c.metric === "HEIGHT" &&
  !isCircuit(c) &&
  (tiebreakers.includes("JUMPS_AT_FINAL_HEIGHT") ||
    tiebreakers.includes("TOTAL_FAILURES"));

/** Why a list of jumps is not a legal bar competition, or null. */
export function validateBar(
  jumps: readonly { status: AttemptStatus; value: number | null }[],
): string | null {
  let misses = 0;
  let lastHeight = 0;
  let lastCleared = false;
  for (let i = 0; i < jumps.length; i++) {
    const j = jumps[i];
    if (j.status === "DNS" || j.status === "DQ") continue;
    if (j.value === null) return `Salto ${i + 1}: informe a altura.`;
    if (misses >= 3)
      return `Salto ${i + 1}: o atleta já foi eliminado (3 falhas seguidas).`;
    if (j.value < lastHeight)
      return `Salto ${i + 1}: a barra só sobe (a altura anterior foi ${lastHeight}).`;
    if (lastCleared && j.value === lastHeight)
      return `Salto ${i + 1}: quem passou a altura ${lastHeight} não salta nela de novo.`;
    lastHeight = j.value;
    lastCleared = j.status === "OK";
    misses = j.status === "OK" ? 0 : misses + 1;
  }
  return null;
}

const valid = (a: Attempt) => a.status === "OK" && a.value !== null;

/** The participant's result from their attempts, or null without a valid mark. */
export function aggregate(
  c: PerfConfig,
  attempts: readonly Attempt[],
): number | null {
  if (isCumulative(c)) {
    if (attempts.length < c.attempts || !attempts.every(valid)) return null;
    return (
      Math.round(attempts.reduce((t, a) => t + (a.value as number), 0) * 1000) /
      1000
    );
  }
  if (isCircuit(c)) {
    if (!attempts.some(valid)) return null;
    // Every stage counts (a missing result is worth nothing); the worst ones may be dropped.
    const pts = attempts
      .map((a) => (valid(a) ? placePointsFor(c, a.value as number) : 0))
      .sort((x, y) => y - x);
    const drop = Math.min(c.dropWorst ?? 0, Math.max(0, pts.length - 1));
    return (
      Math.round(
        pts.slice(0, pts.length - drop).reduce((t, x) => t + x, 0) * 1000,
      ) / 1000
    );
  }
  const v = attempts.filter(valid).map((a) => a.value as number);
  if (v.length === 0) return null;
  if (c.aggregation === "SUM")
    return Math.round(v.reduce((t, x) => t + x, 0) * 1000) / 1000;
  if (c.aggregation === "AVERAGE")
    return Math.round((v.reduce((t, x) => t + x, 0) / v.length) * 1000) / 1000;
  return c.bestIs === "LOWEST" ? Math.min(...v) : Math.max(...v);
}

export function rowStatus(
  c: PerfConfig,
  attempts: readonly Attempt[],
): PerfRowStatus {
  if (attempts.some((a) => a.status === "DQ")) return "DQ";
  if (isCumulative(c)) {
    // Every leg counts: unfinished legs void the team, missing legs keep it waiting.
    if (attempts.some((a) => a.status === "DNF")) return "DNF";
    if (attempts.some((a) => a.status === "DNS")) return "DNS";
    if (attempts.some((a) => a.status === "NM")) return "NM";
    return attempts.length < c.attempts ? "PENDING" : "OK";
  }
  if (aggregate(c, attempts) !== null) return "OK";
  if (attempts.length === 0) return "PENDING";
  if (attempts.every((a) => a.status === "DNS")) return "DNS";
  if (attempts.some((a) => a.status === "DNF")) return "DNF";
  return "NM";
}

export type PerfParticipant = { id: string; attempts: readonly Attempt[] };
export type PerfRank = {
  id: string;
  position: number;
  value: number | null;
  status: PerfRowStatus;
  tied: boolean;
};

const ORDER: PerfRowStatus[] = ["OK", "PENDING", "NM", "DNF", "DNS", "DQ"];

/**
 * Ranks the participants. Equal results are broken by the criteria in order:
 * COUNTBACK_BEST_ATTEMPT (next best attempts) then DRAW_LOTS; what is still
 * level shares the position (1, 2, 2, 4).
 */
export function rankPerformance(
  c: PerfConfig,
  participants: readonly PerfParticipant[],
  options: { tiebreakers?: readonly string[]; lotsSeed?: number } = {},
): PerfRank[] {
  const tb = options.tiebreakers ?? [];
  const lots = new Map<string, number>();
  const rnd = mulberry32(options.lotsSeed ?? 1);
  for (const p of participants) lots.set(p.id, rnd());
  // A circuit always ranks the most points first.
  const dir = !isCircuit(c) && c.bestIs === "LOWEST" ? 1 : -1;

  const items = participants.map((p) => ({
    id: p.id,
    status: rowStatus(c, p.attempts),
    value: aggregate(c, p.attempts),
    // Valid marks from best to worst, for the countback.
    // Bar mode tiebreakers: jumps taken at the best height, misses up to it.
    bestJumps: (() => {
      const best = aggregateBest(p.attempts);
      return best === null
        ? 0
        : p.attempts.filter((a) => a.value === best).length;
    })(),
    failures: (() => {
      const best = aggregateBest(p.attempts);
      return best === null
        ? 0
        : p.attempts.filter(
            (a) => a.status === "NM" && a.value !== null && a.value <= best,
          ).length;
    })(),
    places: p.attempts.filter(valid).map((a) => a.value as number),
    marks: p.attempts
      .filter(valid)
      .map((a) => a.value as number)
      .sort((a, b) => dir * (a - b)),
  }));

  const cmp = (a: (typeof items)[number], b: (typeof items)[number]) => {
    const g = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    if (g !== 0) return g;
    if (a.status !== "OK") return 0;
    const d = dir * ((a.value as number) - (b.value as number));
    if (d !== 0) return d;
    if (isCircuit(c) && tb.includes("COUNTBACK_PLACES")) {
      // More wins, then more seconds, and so on.
      const most = Math.max(0, ...a.places, ...b.places);
      for (let place = 1; place <= most; place++) {
        const x = a.places.filter((p) => p === place).length;
        const y = b.places.filter((p) => p === place).length;
        if (x !== y) return y - x;
      }
    }
    if (!isCircuit(c) && tb.includes("COUNTBACK_BEST_ATTEMPT")) {
      for (let i = 1; i < Math.max(a.marks.length, b.marks.length); i++) {
        const x = a.marks[i];
        const y = b.marks[i];
        if (x === undefined && y === undefined) break;
        if (x === undefined) return 1;
        if (y === undefined) return -1;
        if (x !== y) return dir * (x - y);
      }
    }
    if (isBarMode(c, tb)) {
      // In the order the rules list them.
      for (const key of tb) {
        if (key === "JUMPS_AT_FINAL_HEIGHT" && a.bestJumps !== b.bestJumps)
          return a.bestJumps - b.bestJumps;
        if (key === "TOTAL_FAILURES" && a.failures !== b.failures)
          return a.failures - b.failures;
      }
    }
    return 0;
  };
  const sorted = [...items].sort(cmp);
  // Draw lots only among those that are still level, and only when asked for.
  const out: PerfRank[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && cmp(sorted[i], sorted[j]) === 0) j++;
    let group = sorted.slice(i, j);
    const level = group.length > 1;
    if (level && group[0].status === "OK" && tb.includes("DRAW_LOTS")) {
      group = [...group].sort(
        (a, b) => (lots.get(a.id) ?? 0) - (lots.get(b.id) ?? 0),
      );
      group.forEach((g, k) =>
        out.push({
          id: g.id,
          position: i + k + 1,
          value: g.value,
          status: g.status,
          tied: false,
        }),
      );
    } else {
      group.forEach((g) =>
        out.push({
          id: g.id,
          position: i + 1,
          value: g.value,
          status: g.status,
          tied: level && g.status === "OK",
        }),
      );
    }
    i = j;
  }
  return out;
}

/** The highest valid mark, or null. */
function aggregateBest(attempts: readonly Attempt[]): number | null {
  const v = attempts.filter(valid).map((a) => a.value as number);
  return v.length ? Math.max(...v) : null;
}

/** Whether everyone has taken the attempts all participants take. */
export const preliminaryDone = (
  c: PerfConfig,
  participants: readonly PerfParticipant[],
) =>
  participants.length > 0 &&
  participants.every((p) => p.attempts.length >= c.attempts);

/** The participants who may take the extra attempts (all of them when nobody is cut). */
export function finalistIds(
  c: PerfConfig,
  participants: readonly PerfParticipant[],
  options: { tiebreakers?: readonly string[]; lotsSeed?: number } = {},
): Set<string> {
  if (isCircuit(c) || !c.finalists || !c.extraAttempts)
    return new Set(participants.map((p) => p.id));
  if (!preliminaryDone(c, participants)) return new Set();
  const prelim = participants.map((p) => ({
    id: p.id,
    attempts: p.attempts.filter((a) => a.number <= c.attempts),
  }));
  const ranks = rankPerformance(c, prelim, options);
  return new Set(
    ranks
      .filter((r) => r.status === "OK" && r.position <= (c.finalists as number))
      .map((r) => r.id),
  );
}

/** How many attempts this participant may have right now. */
export function maxAttemptsFor(
  c: PerfConfig,
  participants: readonly PerfParticipant[],
  id: string,
  options: { tiebreakers?: readonly string[]; lotsSeed?: number } = {},
): number {
  if (isCircuit(c)) return c.attempts;
  // A bar competition has as many jumps as the bar needs.
  if (isBarMode(c, options.tiebreakers ?? [])) return 60;
  if (!c.finalists || !c.extraAttempts)
    return c.attempts + (c.extraAttempts ?? 0);
  return (
    c.attempts +
    (finalistIds(c, participants, options).has(id) ? c.extraAttempts : 0)
  );
}

/** The performance configuration of the event rules, or null for other scoring models. */
export function perfConfigOf(
  rules:
    | {
        scoringModel: string;
        sportConfig: unknown;
        placePoints?: unknown;
        dropWorst?: number | null;
      }
    | null
    | undefined,
): PerfConfig | null {
  if (!rules || rules.scoringModel !== "PERFORMANCE") return null;
  const c = rules.sportConfig as Partial<PerfConfig> & { kind?: string };
  if (
    !c ||
    c.kind !== "PERFORMANCE" ||
    !c.metric ||
    !c.bestIs ||
    typeof c.attempts !== "number" ||
    !c.aggregation
  )
    return null;
  return {
    metric: c.metric,
    bestIs: c.bestIs,
    attempts: c.attempts,
    finalists: c.finalists ?? null,
    extraAttempts: c.extraAttempts ?? null,
    aggregation: c.aggregation,
    placePoints:
      Array.isArray(rules.placePoints) && rules.placePoints.length
        ? (rules.placePoints as { place: number; points: number }[])
        : null,
    dropWorst: rules.dropWorst ?? null,
  };
}

/** The tiebreaker keys of the event rules, in order. */
export function tiebreakerKeys(
  rules: { tiebreakers: unknown } | null | undefined,
): string[] {
  const t = rules?.tiebreakers;
  return Array.isArray(t)
    ? t.map((x) => (x as { key?: string }).key ?? "").filter(Boolean)
    : [];
}

/** What a person typed for one attempt: a measure, or the place in a circuit stage. */
export function parseAttempt(
  c: PerfConfig,
  text: string,
): { value: number } | { error: string } {
  if (!isCircuit(c)) return parseValue(c.metric, text);
  const n = Number(text.trim());
  if (!text.trim() || !Number.isInteger(n) || n < 1 || n > 500)
    return { error: "Informe a posição na etapa (1, 2, 3...)." };
  return { value: n };
}
