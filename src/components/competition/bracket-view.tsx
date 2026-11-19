import { TrophyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatKickoff } from "@/lib/competition/format";
import type { MatchView } from "@/lib/competition/view";
import { cn } from "@/lib/utils";

function Side({
  name,
  score,
  pen,
  won,
}: {
  name: string | null;
  score: number | null;
  pen: number | null;
  won: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 text-sm",
        won && "font-semibold",
      )}
    >
      <span className={cn("truncate", !name && "text-muted-foreground")}>
        {name ?? "A definir"}
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        {score ?? "–"}
        {pen != null ? (
          <span className="text-xs text-muted-foreground">({pen})</span>
        ) : null}
        {won ? <TrophyIcon className="size-3.5" aria-label="Vencedor" /> : null}
      </span>
    </div>
  );
}

/** The knockout as columns, one per round. */
export function BracketView({
  matches,
  onOpen,
}: {
  matches: MatchView[];
  onOpen?: (m: MatchView) => void;
}) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-6">
        {rounds.map((round) => {
          const list = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position);
          return (
            <section
              key={round}
              className="flex w-64 flex-col gap-3"
              aria-label={list[0]?.label}
            >
              <h3 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
                {list[0]?.label}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {list.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onOpen?.(m)}
                    className="liquid-card overflow-hidden rounded-xl text-left transition-colors hover:border-primary/50 focus-visible:outline-2"
                  >
                    {m.label !== list[0]?.label ? (
                      <p className="px-3 pt-2 text-xs text-muted-foreground">
                        {m.label}
                      </p>
                    ) : null}
                    <Side
                      name={m.homeName}
                      score={m.homeScore}
                      pen={m.homePenalties}
                      won={m.winnerId !== null && m.winnerId === m.homeId}
                    />
                    <div className="border-t" />
                    <Side
                      name={m.awayName}
                      score={m.awayScore}
                      pen={m.awayPenalties}
                      won={m.winnerId !== null && m.winnerId === m.awayId}
                    />
                    <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
                      <span>
                        {m.scheduledAt
                          ? formatKickoff(m.scheduledAt)
                          : "Sem horário"}
                      </span>
                      {m.status === "WALKOVER" ? (
                        <Badge variant="outline">W.O.</Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
