import { Tip } from "./tip";

export type RankRow = {
  key: string;
  label: string;
  sub?: string;
  value: number;
  valueLabel?: string;
};

/**
 * A ranked list: one bar per row, one hue, scaled to the leader. The list is
 * also the table view: name, team and value are real text.
 */
export function RankBars({
  rows,
  unit,
  empty,
}: {
  rows: RankRow[];
  unit: string;
  empty: string;
}) {
  if (rows.length === 0)
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        {empty}
      </p>
    );
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="viz flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li
          key={r.key}
          className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)]"
        >
          <span className="text-right text-sm text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {r.label}
            </span>
            {r.sub ? (
              <span className="block truncate text-xs text-muted-foreground">
                {r.sub}
              </span>
            ) : null}
          </span>
          <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <Tip
              text={`${r.label}: ${r.valueLabel ?? r.value} ${unit}`}
              className="min-w-0 flex-1 py-1.5"
            >
              <span
                className="block h-3 rounded-r-[4px]"
                style={{
                  width: `${Math.max(2, (r.value / max) * 100)}%`,
                  background: "var(--viz-bar)",
                }}
              />
            </Tip>
            <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
              {r.valueLabel ?? r.value}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
