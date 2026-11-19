import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { formatKickoff } from "@/lib/competition/format";
import type { BracketData, BracketMatch } from "@/lib/competition/bracket-data";
import { cn } from "@/lib/utils";

const SLOT = 108; // vertical room for one match card, in pixels

function Side({
  name,
  score,
  penalties,
  won,
  lost,
}: {
  name: string | null;
  score: number | null;
  penalties: number | null;
  won: boolean;
  lost: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 text-sm",
        won && "bg-primary/10 font-semibold",
        lost && "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          !name && "text-muted-foreground italic",
        )}
      >
        {won ? (
          <CheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
        ) : null}
        <span className="truncate">{name ?? "A definir"}</span>
        {won ? <span className="sr-only">(vencedor)</span> : null}
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        {score ?? ""}
        {penalties != null ? (
          <span className="text-xs text-muted-foreground">({penalties})</span>
        ) : null}
      </span>
    </div>
  );
}

function Card({
  m,
  href,
}: {
  m: BracketMatch | null;
  href?: (id: string) => string;
}) {
  if (!m) {
    return (
      <div
        className="rounded-xl border border-dashed text-sm text-muted-foreground"
        aria-label="Jogo a definir"
      >
        <div className="px-3 py-1.5 italic">A definir</div>
        <div className="border-t border-dashed px-3 py-1.5 italic">
          A definir
        </div>
      </div>
    );
  }
  const body = (
    <>
      <Side
        name={m.home}
        score={m.scoreHome}
        penalties={m.penaltiesHome}
        won={m.winner === "HOME"}
        lost={m.winner === "AWAY"}
      />
      <div className="border-t" />
      <Side
        name={m.away}
        score={m.scoreAway}
        penalties={m.penaltiesAway}
        won={m.winner === "AWAY"}
        lost={m.winner === "HOME"}
      />
      <div className="flex items-center justify-between gap-2 border-t px-3 py-1 text-xs text-muted-foreground">
        <span className="truncate">
          {m.scheduledAt ? formatKickoff(m.scheduledAt) : "Sem horário"}
        </span>
        {m.state === "LIVE" ? (
          <span className="flex items-center gap-1 font-semibold text-red-400">
            <span
              className="size-1.5 animate-pulse rounded-full bg-red-500"
              aria-hidden
            />
            AO VIVO
          </span>
        ) : null}
        {m.state === "WALKOVER" ? <span>W.O.</span> : null}
      </div>
    </>
  );
  const cls =
    "liquid-card block overflow-hidden rounded-xl text-foreground no-underline transition-colors hover:border-primary/50";
  return href ? (
    <Link href={href(m.id)} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * The whole knockout as a tree. Columns are rounds; when each round has half
 * the matches of the previous one, lines connect the two feeders to the next
 * match.
 */
export function BracketTree({
  data,
  href,
}: {
  data: BracketData;
  href?: (matchId: string) => string;
}) {
  const { columns, third, note } = data;
  if (columns.length === 0) {
    return (
      <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
        {note ?? "Sem chaveamento ainda."}
      </p>
    );
  }
  const rows = Math.max(...columns.map((c) => c.matches.length));
  const height = rows * SLOT;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch" style={{ height }}>
          {columns.map((col, ci) => {
            const next = columns[ci + 1];
            const halves =
              next && next.matches.length * 2 === col.matches.length;
            return (
              <div key={ci} className="flex">
                <section aria-label={col.title} className="flex w-64 flex-col">
                  <h3 className="mb-2 font-display text-lg leading-none font-bold tracking-wide uppercase">
                    {col.title}
                  </h3>
                  <div
                    className="grid flex-1"
                    style={{
                      gridTemplateRows: `repeat(${col.matches.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {col.matches.map((m, i) => (
                      <div key={m?.id ?? i} className="flex items-center px-0">
                        <div className="w-full">
                          <Card m={m} href={href} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                {next ? (
                  <div
                    aria-hidden
                    className={cn("flex flex-col", halves ? "w-10" : "w-6")}
                  >
                    <div className="mb-2 h-[1.125rem]" />
                    {halves ? (
                      <div
                        className="grid flex-1"
                        style={{
                          gridTemplateRows: `repeat(${next.matches.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {next.matches.map((_, j) => (
                          <div key={j} className="relative">
                            <div className="absolute top-1/4 bottom-1/4 left-0 w-1/2 rounded-r-md border-y border-r border-white/25" />
                            <div className="absolute top-1/2 right-0 left-1/2 border-t border-white/25" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {third ? (
        <section aria-label="Disputa de 3º lugar" className="max-w-64">
          <h3 className="mb-2 font-display text-lg leading-none font-bold tracking-wide uppercase">
            Disputa de 3º lugar
          </h3>
          <Card m={third} href={href} />
        </section>
      ) : null}
    </div>
  );
}
