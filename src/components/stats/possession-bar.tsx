import { possessionOf } from "@/lib/competition/stats";

/**
 * Ball possession: one whole in two parts, so a tall segmented bar. Each block
 * prints its share inside when it fits; the legend names the teams.
 */
export function PossessionBar({
  homeName,
  awayName,
  homePercent,
}: {
  homeName: string;
  awayName: string;
  homePercent: number | null;
}) {
  const p = possessionOf(homePercent);
  if (!p) return null;
  const label = `Posse de bola: ${homeName} ${p.home}%, ${awayName} ${p.away}%`;
  const blocks = [
    {
      name: homeName,
      pct: p.home,
      color: "var(--viz-home)",
      radius: "rounded-l-[4px]",
    },
    {
      name: awayName,
      pct: p.away,
      color: "var(--viz-away)",
      radius: "rounded-r-[4px]",
    },
  ];
  return (
    <figure className="viz flex flex-col gap-2" aria-label={label}>
      <div role="img" aria-label={label} className="flex h-7 gap-0.5">
        {blocks.map((b) =>
          b.pct === 0 ? null : (
            <div
              key={b.name}
              className={`flex min-w-0 items-center pl-2 text-xs font-semibold text-white tabular-nums ${b.radius}`}
              style={{ width: `${b.pct}%`, background: b.color }}
            >
              {b.pct >= 12 ? `${b.pct}%` : ""}
            </div>
          ),
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-4 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ background: "var(--viz-home)" }}
          />
          <span className="truncate">{homeName}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{awayName}</span>
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ background: "var(--viz-away)" }}
          />
        </span>
      </figcaption>
    </figure>
  );
}
