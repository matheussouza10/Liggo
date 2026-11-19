"use client";

import { useState } from "react";
import { describeEvent, type MatchEventType } from "@/lib/competition/live";

type Ev = {
  id: string;
  type: MatchEventType;
  side: "HOME" | "AWAY" | null;
  minute: number | null;
  text: string | null;
  player: string | null;
  other: string | null;
  value: number;
};

const SHOWN: MatchEventType[] = [
  "GOAL",
  "OWN_GOAL",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
  "PENALTY_MISSED",
];
const W = 1000;
const LEFT = 24;
const RIGHT = 976;
const HOME_Y = 46;
const AWAY_Y = 112;
const SURFACE = "var(--viz-surface)";

type Placed = { e: Ev; x: number; y: number };

/**
 * The moments of the match on a minute axis, one lane per team. Goals are
 * circles, cards are small cards, substitutions are diamonds. Every marker
 * has a larger invisible hit area and shows its details on hover or focus.
 * The list below the chart is its table view.
 */
export function MatchTimelineChart({
  events,
  home,
  away,
}: {
  events: Ev[];
  home: string;
  away: string;
}) {
  const [active, setActive] = useState<Placed | null>(null);
  const shown = events.filter(
    (e) => e.minute != null && SHOWN.includes(e.type) && e.side,
  );
  const maxMinute = Math.max(90, ...shown.map((e) => e.minute as number));
  const end = Math.ceil(maxMinute / 15) * 15;
  const x = (m: number) => LEFT + (m / end) * (RIGHT - LEFT);

  // Nearby markers in the same lane are stacked so they do not hide each other.
  const placed: Placed[] = [];
  const lanes: Record<"HOME" | "AWAY", Placed[]> = { HOME: [], AWAY: [] };
  for (const e of [...shown].sort(
    (a, b) => (a.minute as number) - (b.minute as number),
  )) {
    const side = e.side as "HOME" | "AWAY";
    const px = x(e.minute as number);
    const near = lanes[side].filter((p) => Math.abs(p.x - px) < 20).length;
    const dy =
      near === 0 ? 0 : (near % 2 === 1 ? 1 : -1) * Math.ceil(near / 2) * 16;
    const p = {
      e,
      x: px,
      y: (side === "HOME" ? HOME_Y : AWAY_Y) + (side === "HOME" ? -dy : dy),
    };
    lanes[side].push(p);
    placed.push(p);
  }

  const ticks = Array.from({ length: end / 15 + 1 }, (_, i) => i * 15);
  const summary = `Linha do tempo do jogo: ${shown.length} lances marcados entre 0 e ${end} minutos.`;
  const color = (side: "HOME" | "AWAY" | null) =>
    side === "AWAY" ? "var(--viz-away)" : "var(--viz-home)";

  const mark = (p: Placed) => {
    const { e } = p;
    if (e.type === "GOAL")
      return (
        <circle
          cx={p.x}
          cy={p.y}
          r={7}
          fill={color(e.side)}
          stroke={SURFACE}
          strokeWidth={2}
        />
      );
    if (e.type === "OWN_GOAL")
      return (
        <circle
          cx={p.x}
          cy={p.y}
          r={6}
          fill={SURFACE}
          stroke={color(e.side)}
          strokeWidth={3}
        />
      );
    if (e.type === "YELLOW_CARD")
      return (
        <rect
          x={p.x - 5}
          y={p.y - 7}
          width={10}
          height={14}
          rx={2}
          fill="var(--viz-yellow)"
          stroke={SURFACE}
          strokeWidth={2}
        />
      );
    if (e.type === "RED_CARD")
      return (
        <rect
          x={p.x - 5}
          y={p.y - 7}
          width={10}
          height={14}
          rx={2}
          fill="var(--viz-red)"
          stroke={SURFACE}
          strokeWidth={2}
        />
      );
    if (e.type === "SUBSTITUTION")
      return (
        <rect
          x={p.x - 5}
          y={p.y - 5}
          width={10}
          height={10}
          fill={SURFACE}
          stroke="#c3cae0"
          strokeWidth={2}
          transform={`rotate(45 ${p.x} ${p.y})`}
        />
      );
    return (
      <g stroke="#c3cae0" strokeWidth={2.5} strokeLinecap="round">
        <line x1={p.x - 5} y1={p.y - 5} x2={p.x + 5} y2={p.y + 5} />
        <line x1={p.x - 5} y1={p.y + 5} x2={p.x + 5} y2={p.y - 5} />
      </g>
    );
  };

  const legend: [string, React.ReactNode][] = [
    [
      "Gol",
      <span
        key="g"
        className="size-3 rounded-full"
        style={{ background: "var(--viz-home)" }}
      />,
    ],
    [
      "Gol contra",
      <span
        key="o"
        className="size-3 rounded-full border-2"
        style={{ borderColor: "var(--viz-home)" }}
      />,
    ],
    [
      "Cartão amarelo",
      <span
        key="y"
        className="h-3.5 w-2.5 rounded-[2px]"
        style={{ background: "var(--viz-yellow)" }}
      />,
    ],
    [
      "Cartão vermelho",
      <span
        key="r"
        className="h-3.5 w-2.5 rounded-[2px]"
        style={{ background: "var(--viz-red)" }}
      />,
    ],
    [
      "Substituição",
      <span key="s" className="size-2.5 rotate-45 border-2 border-[#c3cae0]" />,
    ],
  ];

  return (
    <figure className="viz flex flex-col gap-3" aria-label={summary}>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-sm"
            style={{ background: "var(--viz-home)" }}
          />
          {home}
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-sm"
            style={{ background: "var(--viz-away)" }}
          />
          {away}
        </span>
      </figcaption>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} 150`}
          role="img"
          aria-label={summary}
          className="h-auto w-full"
        >
          {ticks.map((m) => (
            <g key={m}>
              <line
                x1={x(m)}
                y1={14}
                x2={x(m)}
                y2={128}
                stroke="white"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={x(m)}
                y={146}
                textAnchor="middle"
                fontSize={13}
                fill="#a7b0c8"
              >
                {m}&apos;
              </text>
            </g>
          ))}
          <line
            x1={LEFT}
            y1={79}
            x2={RIGHT}
            y2={79}
            stroke="white"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
          {placed.map((p) => (
            <g key={p.e.id}>
              {mark(p)}
              <circle
                cx={p.x}
                cy={p.y}
                r={15}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${p.e.minute} minutos: ${describeEvent(p.e, { home, away }).title}`}
                className="cursor-pointer outline-none focus-visible:stroke-white"
                strokeWidth={2}
                onMouseEnter={() => setActive(p)}
                onMouseLeave={() =>
                  setActive((cur) => (cur?.e.id === p.e.id ? null : cur))
                }
                onFocus={() => setActive(p)}
                onBlur={() =>
                  setActive((cur) => (cur?.e.id === p.e.id ? null : cur))
                }
              />
            </g>
          ))}
        </svg>
        {active ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md bg-[#1a2745] px-2.5 py-1.5 text-xs text-white shadow-lg ring-1 ring-white/10"
            style={{
              left: `${(active.x / W) * 100}%`,
              top: `${(active.y / 150) * 100}%`,
              marginTop: -14,
            }}
          >
            <span className="block font-semibold">
              {active.e.minute}&apos; ·{" "}
              {describeEvent(active.e, { home, away }).title}
            </span>
            {describeEvent(active.e, { home, away }).detail ? (
              <span className="block text-[#c3cae0]">
                {describeEvent(active.e, { home, away }).detail}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground"
        aria-label="Legenda"
      >
        {legend.map(([name, key]) => (
          <li key={name} className="flex items-center gap-2">
            {key}
            {name}
          </li>
        ))}
      </ul>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Os gols, cartões e substituições com minuto aparecem aqui.
        </p>
      ) : null}
    </figure>
  );
}
