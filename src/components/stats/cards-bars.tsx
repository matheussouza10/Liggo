import { Tip } from "./tip";

export type CardsRow = { team: string; yellow: number; red: number };

/**
 * Cards per team: two stacked parts (yellow, red) separated by a 2px gap, a
 * legend with both names, the total at the end of each bar.
 */
export function CardsBars({
  rows,
  empty,
}: {
  rows: CardsRow[];
  empty: string;
}) {
  if (rows.length === 0)
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        {empty}
      </p>
    );
  const max = Math.max(...rows.map((r) => r.yellow + r.red), 1);
  return (
    <figure className="viz flex flex-col gap-3" aria-label="Cartões por time">
      <figcaption className="flex items-center gap-5 text-sm">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-4 w-3 shrink-0 rounded-[2px]"
            style={{ background: "var(--viz-yellow)" }}
          />
          Amarelos
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-4 w-3 shrink-0 rounded-[2px]"
            style={{ background: "var(--viz-red)" }}
          />
          Vermelhos
        </span>
      </figcaption>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const total = r.yellow + r.red;
          const w = (v: number) => (v === 0 ? 0 : Math.max(2, (v / max) * 100));
          return (
            <li
              key={r.team}
              className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
            >
              <span className="truncate text-sm font-medium">{r.team}</span>
              <span className="flex items-center gap-2">
                <span className="flex min-w-0 flex-1 gap-0.5">
                  {r.yellow > 0 ? (
                    <Tip
                      text={`${r.team}: ${r.yellow} ${r.yellow === 1 ? "amarelo" : "amarelos"}`}
                      className="py-1.5"
                      style={{ width: `${w(r.yellow)}%` }}
                    >
                      <span
                        className="block h-3 w-full rounded-l-[4px]"
                        style={{ background: "var(--viz-yellow)" }}
                      />
                    </Tip>
                  ) : null}
                  {r.red > 0 ? (
                    <Tip
                      text={`${r.team}: ${r.red} ${r.red === 1 ? "vermelho" : "vermelhos"}`}
                      className="py-1.5"
                      style={{ width: `${w(r.red)}%` }}
                    >
                      <span
                        className="block h-3 w-full rounded-r-[4px]"
                        style={{ background: "var(--viz-red)" }}
                      />
                    </Tip>
                  ) : null}
                </span>
                <span className="w-16 shrink-0 text-sm tabular-nums">
                  <span className="font-semibold">{total}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({r.yellow}A {r.red}V)
                  </span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
