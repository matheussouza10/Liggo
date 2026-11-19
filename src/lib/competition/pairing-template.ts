/**
 * Matchups defined at configuration time, by origin: "1st of Group A against
 * 2nd of Group B", "winner of game 1 against winner of game 3". The system
 * resolves them to real teams when the previous stage ends. Pure and client-safe.
 */
import { seedOrder } from "./bracket";
import { crossQualified } from "./advance";

export type Source =
  | { type: "GROUP_RANK"; group: number; rank: number }
  | { type: "WINNER"; match: number };
export type Template = { a: Source; b: Source }[];

export type StageCfg = {
  name: string;
  type: string;
  groupCount: number | null;
  advancingPerGroup: number | null;
};

const isPow2 = (n: number) => n >= 2 && (n & (n - 1)) === 0;
const letter = (n: number) => String.fromCharCode(64 + n);

export const sourceKey = (s: Source) =>
  s.type === "GROUP_RANK" ? `g${s.group}r${s.rank}` : `w${s.match}`;

export function sourceLabel(
  s: Source,
  previousStageName?: string | null,
): string {
  return s.type === "GROUP_RANK"
    ? `${s.rank}º do Grupo ${letter(s.group)}`
    : `Vencedor do jogo ${s.match}${previousStageName ? ` (${previousStageName})` : ""}`;
}

/** Participants and games of each stage, when they can be known from the configuration. */
export function stageSizes(
  stages: readonly StageCfg[],
): { participants: number | null; games: number | null }[] {
  const out: { participants: number | null; games: number | null }[] = [];
  stages.forEach((s, i) => {
    let participants: number | null = null;
    if (s.type === "SINGLE_ELIM" && i > 0) {
      const prev = stages[i - 1];
      if (prev.type === "GROUPS" && prev.groupCount && prev.advancingPerGroup)
        participants = prev.groupCount * prev.advancingPerGroup;
      else if (prev.type === "SINGLE_ELIM") participants = out[i - 1].games;
    }
    out.push({
      participants,
      games:
        s.type === "SINGLE_ELIM" && participants && isPow2(participants)
          ? participants / 2
          : null,
    });
  });
  return out;
}

/** The origins that feed stage `index`, or null when its matchups cannot be chosen. */
export function expectedSources(
  stages: readonly StageCfg[],
  index: number,
): Source[] | null {
  const s = stages[index];
  if (!s || s.type !== "SINGLE_ELIM" || index === 0) return null;
  const participants = stageSizes(stages)[index].participants;
  if (!participants || !isPow2(participants)) return null;
  const prev = stages[index - 1];
  if (prev.type === "GROUPS" && prev.groupCount && prev.advancingPerGroup) {
    const out: Source[] = [];
    for (let rank = 1; rank <= prev.advancingPerGroup; rank++)
      for (let group = 1; group <= prev.groupCount; group++)
        out.push({ type: "GROUP_RANK", group, rank });
    return out;
  }
  if (prev.type === "SINGLE_ELIM")
    return Array.from({ length: participants }, (_, i) => ({
      type: "WINNER" as const,
      match: i + 1,
    }));
  return null;
}

/** Pairs a flat list of sources: slots 1+2 play, 3+4 play... */
export function templateFromOrder(order: readonly Source[]): Template {
  const out: Template = [];
  for (let i = 0; i + 1 < order.length; i += 2)
    out.push({ a: order[i], b: order[i + 1] });
  return out;
}
export const templateToOrder = (t: Template): Source[] =>
  t.flatMap((p) => [p.a, p.b]);

/** What the system plays by itself (1st against the last, winners side by side). */
export function defaultTemplate(
  stages: readonly StageCfg[],
  index: number,
): Template | null {
  const sources = expectedSources(stages, index);
  if (!sources) return null;
  const prev = stages[index - 1];
  if (prev.type === "GROUPS" && prev.groupCount && prev.advancingPerGroup) {
    const byKey = new Map(sources.map((s) => [sourceKey(s), s]));
    const groups = Array.from({ length: prev.groupCount }, (_, g) =>
      Array.from(
        { length: prev.advancingPerGroup as number },
        (_, r) => `g${g + 1}r${r + 1}`,
      ),
    );
    const seeded = crossQualified(groups); // best seed first
    return templateFromOrder(
      seedOrder(seeded.length).map(
        (seed) => byKey.get(seeded[seed - 1]) as Source,
      ),
    );
  }
  return templateFromOrder(sources);
}

/** A message in Portuguese when the template does not fit the configuration, or null when it does. */
export function validateTemplate(
  stages: readonly StageCfg[],
  index: number,
  template: Template,
): string | null {
  const sources = expectedSources(stages, index);
  if (!sources)
    return "Os confrontos desta fase não podem ser escolhidos: confira a fase anterior (precisa terminar em 2, 4, 8, 16... participantes).";
  if (template.length * 2 !== sources.length)
    return `Esta fase tem ${sources.length / 2} jogos: defina todos os confrontos.`;
  const want = new Set(sources.map(sourceKey));
  const seen = new Set<string>();
  for (const s of templateToOrder(template)) {
    const k = sourceKey(s);
    if (!want.has(k)) return `${sourceLabel(s)} não existe na fase anterior.`;
    if (seen.has(k)) return `${sourceLabel(s)} aparece mais de uma vez.`;
    seen.add(k);
  }
  return null;
}

type OriginEntry = {
  id: string;
  originGroup: number | null;
  originRank: number | null;
  originMatch: number | null;
};

/** Turns the template into the participants order of the stage (slot 1 plays slot 2...), or null when something is missing. */
export function resolveTemplate(
  template: Template,
  entries: readonly OriginEntry[],
): string[] | null {
  const find = (s: Source) =>
    entries.find((e) =>
      s.type === "GROUP_RANK"
        ? e.originGroup === s.group && e.originRank === s.rank
        : e.originMatch === s.match,
    );
  const order: string[] = [];
  for (const s of templateToOrder(template)) {
    const e = find(s);
    if (!e) return null;
    order.push(e.id);
  }
  return new Set(order).size === order.length && order.length === entries.length
    ? order
    : null;
}
