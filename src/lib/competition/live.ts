/** Match events (the "súmula"). Client-safe: shared by the organizer and the public page. */

export const MATCH_EVENT_TYPES = [
  "KICKOFF",
  "PERIOD_START",
  "PERIOD_END",
  "FULL_TIME",
  "GOAL",
  "OWN_GOAL",
  "PENALTY_MISSED",
  "YELLOW_CARD",
  "RED_CARD",
  "FOUL",
  "SUBSTITUTION",
  "TIMEOUT",
  "INJURY",
  "NOTE",
] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export type EventMeta = {
  label: string;
  /** Short word for the timeline sentence ("Gol", "Cartão amarelo"). */
  short: string;
  /** Needs to say which team it belongs to. */
  needsSide: boolean;
  /** Which fields of the form apply. */
  player: "none" | "optional" | "required";
  other: "none" | "optional" | "required";
  otherLabel?: string;
  playerLabel?: string;
  /** Moves the live score. */
  scores?: "own" | "opposite";
  /** The organizer can add it by hand (start and end are done with their own buttons). */
  manual: boolean;
};

export const EVENT_META: Record<MatchEventType, EventMeta> = {
  KICKOFF: {
    label: "Início do jogo",
    short: "Início do jogo",
    needsSide: false,
    player: "none",
    other: "none",
    manual: false,
  },
  PERIOD_START: {
    label: "Início de período",
    short: "Início de período",
    needsSide: false,
    player: "none",
    other: "none",
    manual: true,
  },
  PERIOD_END: {
    label: "Fim de período / intervalo",
    short: "Fim de período",
    needsSide: false,
    player: "none",
    other: "none",
    manual: true,
  },
  FULL_TIME: {
    label: "Fim de jogo",
    short: "Fim de jogo",
    needsSide: false,
    player: "none",
    other: "none",
    manual: false,
  },
  GOAL: {
    label: "Gol / ponto",
    short: "Gol",
    needsSide: true,
    player: "optional",
    playerLabel: "Autor",
    other: "optional",
    otherLabel: "Assistência",
    scores: "own",
    manual: true,
  },
  OWN_GOAL: {
    label: "Gol contra",
    short: "Gol contra",
    needsSide: true,
    player: "optional",
    playerLabel: "Autor",
    other: "none",
    scores: "opposite",
    manual: true,
  },
  PENALTY_MISSED: {
    label: "Pênalti perdido",
    short: "Pênalti perdido",
    needsSide: true,
    player: "optional",
    playerLabel: "Cobrador",
    other: "none",
    manual: true,
  },
  YELLOW_CARD: {
    label: "Cartão amarelo",
    short: "Cartão amarelo",
    needsSide: true,
    player: "optional",
    playerLabel: "Atleta",
    other: "none",
    manual: true,
  },
  RED_CARD: {
    label: "Cartão vermelho",
    short: "Cartão vermelho",
    needsSide: true,
    player: "optional",
    playerLabel: "Atleta",
    other: "none",
    manual: true,
  },
  FOUL: {
    label: "Falta",
    short: "Falta",
    needsSide: true,
    player: "optional",
    playerLabel: "Autor da falta",
    other: "none",
    manual: true,
  },
  SUBSTITUTION: {
    label: "Substituição",
    short: "Substituição",
    needsSide: true,
    player: "required",
    playerLabel: "Sai",
    other: "required",
    otherLabel: "Entra",
    manual: true,
  },
  TIMEOUT: {
    label: "Tempo técnico",
    short: "Tempo técnico",
    needsSide: true,
    player: "none",
    other: "none",
    manual: true,
  },
  INJURY: {
    label: "Lesão",
    short: "Lesão",
    needsSide: true,
    player: "optional",
    playerLabel: "Atleta",
    other: "none",
    manual: true,
  },
  NOTE: {
    label: "Lance importante",
    short: "Lance",
    needsSide: false,
    player: "none",
    other: "none",
    manual: true,
  },
};

/** How a live score changes when an event is added (or removed, using the negative). */
export function scoreDelta(
  type: MatchEventType,
  side: "HOME" | "AWAY" | null,
  value: number,
): { home: number; away: number } {
  const scores = EVENT_META[type].scores;
  if (!scores || !side) return { home: 0, away: 0 };
  const scoringSide =
    scores === "own" ? side : side === "HOME" ? "AWAY" : "HOME";
  return scoringSide === "HOME"
    ? { home: value, away: 0 }
    : { home: 0, away: value };
}

/** Minutes since the match started, never negative. */
export function elapsedMinutes(
  startedAtIso: string | null,
  now = Date.now(),
): number {
  if (!startedAtIso) return 0;
  return Math.max(
    0,
    Math.floor((now - new Date(startedAtIso).getTime()) / 60000),
  );
}

export type EventLike = {
  type: MatchEventType;
  side: "HOME" | "AWAY" | null;
  text: string | null;
  player: string | null;
  other: string | null;
  value: number;
};

/** A sentence for the timeline: a title and, when there is one, the details. */
export function describeEvent(
  e: EventLike,
  names: { home: string | null; away: string | null },
): { title: string; detail: string | null } {
  const team =
    e.side === "HOME" ? names.home : e.side === "AWAY" ? names.away : null;
  const meta = EVENT_META[e.type];
  const parts: string[] = [];
  let title = meta.short;

  if (e.type === "GOAL" && e.value > 1) title = `Gol de ${e.value} pontos`;
  if (e.type === "SUBSTITUTION") {
    if (team) parts.push(team);
    if (e.player) parts.push(`Sai ${e.player}`);
    if (e.other) parts.push(`Entra ${e.other}`);
  } else if (e.type === "OWN_GOAL") {
    if (team) parts.push(`Gol contra de ${team}`);
    if (e.player) parts.push(e.player);
    title = "Gol contra";
  } else {
    if (team) parts.push(team);
    if (e.player) parts.push(e.player);
    if (e.other) parts.push(`${meta.otherLabel ?? "Com"}: ${e.other}`);
  }
  if (e.text) parts.push(e.text);
  return { title, detail: parts.length ? parts.join(" · ") : null };
}
