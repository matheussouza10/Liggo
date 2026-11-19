import { TIME_ZONE } from "./timeslots";

export const DRAW_MODE_LABELS = {
  RANDOM: "Aleatório",
  SNAKE: "Serpentina por cabeça de chave",
  RANKING: "Potes por cabeça de chave",
  MANUAL: "Manual",
} as const;

export const DRAW_MODE_HELP = {
  RANDOM: "Embaralha todos os participantes.",
  SNAKE: "Ordena por cabeça de chave e distribui A a H, depois H a A.",
  RANKING:
    "Cada pote (1º ao 4º cabeça, e assim por diante) coloca um time em cada grupo.",
  MANUAL: "Ninguém é sorteado: você escolhe o grupo de cada participante.",
} as const;

export const STAGE_STATUS_LABELS = {
  NONE: "Sem sorteio",
  DRAWN: "Sorteada",
  LIVE: "Em andamento",
  DONE: "Concluída",
} as const;

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return `${dateFmt.format(d)} às ${timeFmt.format(d)}`;
}

/** Date and time as the form inputs want them (YYYY-MM-DD and HH:MM), in Brasília time. */
export function toLocalInputs(iso: string | null): {
  date: string;
  time: string;
} {
  if (!iso) return { date: "", time: "" };
  const p = Object.fromEntries(
    partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}`,
  };
}
