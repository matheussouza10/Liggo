import { Tip } from "./tip";

export type ComparisonRow = { label: string; home: number; away: number };

const MIN_PX = 4;

/**
 * Two teams, stat by stat. Each row grows from a shared center line: home to
 * the left, away to the right, both scaled to the larger of the two so the
 * bars compare inside a row. Values sit at the bar tips; the legend names the
 * teams (blue and orange, validated for color-blind readers).
 */
export function ComparisonBars({
  rows,
  homeName,
  awayName,
}: {
  rows: ComparisonRow[];
  homeName: string;
  awayName: string;
}) {
  return (
    <figure
      className="viz flex flex-col gap-4"
      aria-label={`Comparação entre ${homeName} e ${awayName}`}
    >
      <figcaption className="flex items-center justify-between gap-4 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ background: "var(--viz-home)" }}
          />
          <span className="truncate font-medium">{homeName}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{awayName}</span>
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ background: "var(--viz-away)" }}
          />
        </span>
      </figcaption>

      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const max = Math.max(r.home, r.away, 1);
          const pct = (v: number) =>
            v === 0 ? 0 : Math.max(2, (v / max) * 100);
          return (
            <li
              key={r.label}
              data-stat={r.label}
              data-home={r.home}
              data-away={r.away}
              className="flex flex-col gap-1"
            >
              <p className="text-center text-xs text-muted-foreground">
                {r.label}
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {r.home}
                  </span>
                  <Tip
                    text={`${homeName}: ${r.home} ${r.label.toLowerCase()}`}
                    className="w-3/4 justify-end py-1.5"
                  >
                    <span
                      className="block h-3 rounded-l-[4px]"
                      style={{
                        width: `${pct(r.home)}%`,
                        minWidth: r.home ? MIN_PX : 0,
                        background: "var(--viz-home)",
                      }}
                    />
                  </Tip>
                </div>
                <div className="flex items-center gap-2">
                  <Tip
                    text={`${awayName}: ${r.away} ${r.label.toLowerCase()}`}
                    className="w-3/4 py-1.5"
                  >
                    <span
                      className="block h-3 rounded-r-[4px]"
                      style={{
                        width: `${pct(r.away)}%`,
                        minWidth: r.away ? MIN_PX : 0,
                        background: "var(--viz-away)",
                      }}
                    />
                  </Tip>
                  <span className="text-sm font-semibold tabular-nums">
                    {r.away}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
