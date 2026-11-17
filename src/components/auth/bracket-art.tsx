/**
 * Tournament bracket drawn as crisp vector geometry (8 entrants, 3 rounds).
 * Each entrant is a line ending in a score cell; one path is lit from an
 * entrant to the champion block. Corners are rounded like the Liggo mark.
 */

const SLOTS = 8;
const TOP = 60;
const STEP_Y = 120;
const BAR = 150;
const LINK = 60;
const RAD = 18;
const LIT_ENTRANT = 5;
const CELL_W = 40;
const CELL_H = 28;

type Cell = { x: number; y: number; lit: boolean };

function buildBracket() {
  const dim: string[] = [];
  const lit: string[] = [];
  const cells: Cell[] = [];
  let ys = Array.from({ length: SLOTS }, (_, i) => TOP + i * STEP_Y);
  let xs = 0;
  let route = LIT_ENTRANT;

  while (ys.length > 1) {
    const next: number[] = [];
    const xv = xs + BAR;
    const xn = xv + LINK;

    for (let m = 0; m < ys.length; m += 2) {
      const ya = ys[m];
      const yb = ys[m + 1];
      const ym = (ya + yb) / 2;
      const onRoute = Math.floor(route / 2) === m / 2;

      dim.push(
        `M${xs} ${ya}H${xv - RAD}A${RAD} ${RAD} 0 0 1 ${xv} ${ya + RAD}` +
          `V${yb - RAD}A${RAD} ${RAD} 0 0 1 ${xv - RAD} ${yb}H${xs}`,
      );
      dim.push(`M${xv} ${ym}H${xn}`);
      next.push(ym);

      cells.push({ x: xs + 14, y: ya, lit: onRoute && route % 2 === 0 });
      cells.push({ x: xs + 14, y: yb, lit: onRoute && route % 2 === 1 });

      if (onRoute) {
        const y = route % 2 === 0 ? ya : yb;
        const dir = y < ym ? 1 : -1;
        const first = dir === 1 ? 1 : 0;
        lit.push(
          `M${xs} ${y}H${xv - RAD}A${RAD} ${RAD} 0 0 ${first} ${xv} ${y + dir * RAD}` +
            `V${ym - dir * RAD}A${RAD} ${RAD} 0 0 ${1 - first} ${xv + RAD} ${ym}H${xn}`,
        );
      }
    }

    route = Math.floor(route / 2);
    ys = next;
    xs = xn;
  }

  const yFinal = ys[0];
  const xEnd = xs + BAR;
  dim.push(`M${xs} ${yFinal}H${xEnd}`);
  lit.push(`M${xs} ${yFinal}H${xEnd}`);
  cells.push({ x: xs + 14, y: yFinal, lit: true });

  return {
    dim: dim.join(""),
    lit: lit.join(""),
    cells,
    champion: { x: xEnd, y: yFinal },
  };
}

const bracket = buildBracket();

const TONES = {
  // Blue panel: navy structure, white winning path, turquoise champion.
  brand: {
    dim: "#041b4b",
    dimOpacity: 0.4,
    lit: "#ffffff",
    litOpacity: 1,
    cell: "#041b4b",
    cellOpacity: 0.4,
    cellLit: "#ffffff",
    champion: "#1ce6d3",
  },
  // Admin panel: monochrome, drier.
  mono: {
    dim: "#ffffff",
    dimOpacity: 0.16,
    lit: "#ffffff",
    litOpacity: 0.6,
    cell: "#ffffff",
    cellOpacity: 0.16,
    cellLit: "#ffffff",
    champion: "#ffffff",
  },
} as const;

export function BracketArt({ tone }: { tone: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="-20 0 880 960"
      preserveAspectRatio="xMinYMid slice"
      className="absolute inset-0 h-full w-full"
      fill="none"
      strokeLinejoin="round"
    >
      <path
        d={bracket.dim}
        stroke={t.dim}
        strokeOpacity={t.dimOpacity}
        strokeWidth="6"
      />
      {bracket.cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y - CELL_H / 2}
          width={CELL_W}
          height={CELL_H}
          rx="3"
          fill={c.lit ? t.cellLit : t.cell}
          fillOpacity={c.lit ? (tone === "brand" ? 1 : 0.6) : t.cellOpacity}
        />
      ))}
      <path
        className="bracket-lit"
        d={bracket.lit}
        pathLength={1}
        stroke={t.lit}
        strokeOpacity={t.litOpacity}
        strokeWidth="9"
      />
      <rect
        className="bracket-champion"
        x={bracket.champion.x - 14}
        y={bracket.champion.y - 26}
        width="56"
        height="52"
        rx="4"
        fill={t.champion}
        fillOpacity={tone === "brand" ? 1 : 0.6}
      />
    </svg>
  );
}
