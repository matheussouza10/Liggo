import Link from "next/link";
import { formatKickoff } from "@/lib/competition/format";
import type { MatchSnapshot } from "@/lib/competition/live-queries";
import { cn } from "@/lib/utils";

export function lastMinute(m: MatchSnapshot): number | null {
  for (let i = m.events.length - 1; i >= 0; i--)
    if (m.events[i].minute != null) return m.events[i].minute;
  return null;
}

export function StateLabel({ m }: { m: MatchSnapshot }) {
  if (m.state === "LIVE") {
    const minute = lastMinute(m);
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
        <span
          className="size-2 animate-pulse rounded-full bg-red-500"
          aria-hidden
        />
        AO VIVO{minute != null ? ` · ${minute}'` : ""}
      </span>
    );
  }
  if (m.state === "FINISHED")
    return <span className="text-xs text-muted-foreground">Encerrado</span>;
  if (m.state === "WALKOVER")
    return (
      <span className="text-xs text-muted-foreground">Encerrado por W.O.</span>
    );
  return (
    <span className="text-xs text-muted-foreground">
      {m.scheduledAt ? formatKickoff(m.scheduledAt) : "Horário a definir"}
    </span>
  );
}

export function MatchCard({
  m,
  showEvent = true,
}: {
  m: MatchSnapshot;
  showEvent?: boolean;
}) {
  const score = m.scoreHome != null && m.scoreAway != null;
  const winnerHome =
    m.state !== "SCHEDULED" &&
    m.state !== "LIVE" &&
    score &&
    (m.scoreHome as number) > (m.scoreAway as number);
  const winnerAway =
    m.state !== "SCHEDULED" &&
    m.state !== "LIVE" &&
    score &&
    (m.scoreAway as number) > (m.scoreHome as number);
  return (
    <Link
      href={`/watch/matches/${m.id}`}
      className={cn(
        "liquid-card flex flex-col gap-3 rounded-xl p-4 text-foreground no-underline transition-colors hover:border-primary/50",
        m.state === "LIVE" && "border-red-500/40",
      )}
    >
      <p className="truncate text-xs text-muted-foreground">
        {showEvent ? `${m.eventName} · ` : ""}
        {m.categoryName} · {m.label}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span
          className={cn(
            "truncate text-right text-sm font-medium",
            winnerHome && "font-bold",
          )}
        >
          {m.home ?? "A definir"}
        </span>
        <span className="min-w-14 rounded-lg bg-muted/40 px-2 py-1 text-center font-display text-xl leading-none font-bold tabular-nums">
          {score ? `${m.scoreHome} x ${m.scoreAway}` : "x"}
        </span>
        <span
          className={cn(
            "truncate text-sm font-medium",
            winnerAway && "font-bold",
          )}
        >
          {m.away ?? "A definir"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StateLabel m={m} />
        {m.venue ? (
          <span className="truncate text-xs text-muted-foreground">
            {m.venue}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
