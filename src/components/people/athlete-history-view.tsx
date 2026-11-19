import { MedalIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { RankBars } from "@/components/stats/rank-bars";
import { Badge } from "@/components/ui/badge";
import { formatDay } from "@/lib/events/constants";
import type { AthleteHistory, Participation } from "@/lib/people/history";

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="liquid-card rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none font-extrabold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl leading-none font-bold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function PlacementBadge({ p }: { p: Participation["placement"] }) {
  const medal =
    p.kind === "CHAMPION" || p.kind === "RUNNER_UP" || p.kind === "THIRD";
  return (
    <Badge
      variant={p.kind === "CHAMPION" ? "default" : "secondary"}
      className="gap-1.5"
    >
      {p.kind === "CHAMPION" ? (
        <TrophyIcon className="size-3.5" aria-hidden />
      ) : medal ? (
        <MedalIcon className="size-3.5" aria-hidden />
      ) : null}
      {p.text}
    </Badge>
  );
}

/** Participations of an athlete and what they did in each one. */
export function AthleteHistoryView({ history }: { history: AthleteHistory }) {
  const { participations, summary } = history;
  if (participations.length === 0) {
    return (
      <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
        Este atleta ainda não participou de eventos da sua organização.
      </p>
    );
  }
  const goalsByEvent = participations
    .filter((p) => p.totals.goals > 0)
    .map((p) => ({
      key: p.registrationId,
      label: p.event.name,
      sub: p.category,
      value: p.totals.goals,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-label="Resumo"
        className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7"
      >
        <Tile label="Eventos" value={summary.events} />
        <Tile label="Títulos" value={summary.titles} />
        <Tile label="Gols / pontos" value={summary.goals} />
        <Tile label="Assistências" value={summary.assists} />
        <Tile label="Cartões amarelos" value={summary.yellow} />
        <Tile label="Cartões vermelhos" value={summary.red} />
        <Tile label="Faltas" value={summary.fouls} />
      </section>

      {goalsByEvent.length > 0 ? (
        <section
          aria-label="Gols por evento"
          className="liquid-card flex flex-col gap-4 rounded-xl p-5"
        >
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Gols por evento
          </h2>
          <RankBars unit="gols" empty="" rows={goalsByEvent} />
        </section>
      ) : null}

      <section aria-label="Participações" className="flex flex-col gap-4">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Participações
        </h2>
        <ol className="flex flex-col gap-4">
          {participations.map((p) => (
            <li
              key={p.registrationId}
              data-testid="participation"
              className="liquid-card flex flex-col gap-4 rounded-xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/events/${p.event.id}`}
                    className="text-lg font-semibold"
                  >
                    {p.event.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {p.event.sport} · {formatDay(p.event.startDate)} a{" "}
                    {formatDay(p.event.endDate)} · {p.category}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.team ? `Time ${p.team}` : "Participação individual"}
                    {p.shirtNumber != null ? ` · camisa ${p.shirtNumber}` : ""}
                    {p.position ? ` · ${p.position}` : ""}
                    {p.captain ? " · capitão" : ""}
                  </p>
                </div>
                <PlacementBadge p={p.placement} />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <Stat label="Gols / pontos" value={p.totals.goals} />
                <Stat label="Assistências" value={p.totals.assists} />
                <Stat label="Amarelos" value={p.totals.yellow} />
                <Stat label="Vermelhos" value={p.totals.red} />
                <Stat label="Faltas" value={p.totals.fouls} />
                <Stat
                  label="Jogos com lance"
                  value={p.totals.matchesWithAction}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {p.record.played === 0
                  ? "O time ainda não disputou jogos."
                  : `Campanha do ${p.team ? "time" : "atleta"}: ${p.record.played} ${p.record.played === 1 ? "jogo" : "jogos"}, ${p.record.wins}V ${p.record.draws}E ${p.record.losses}D, gols ${p.record.goalsFor} x ${p.record.goalsAgainst}.`}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          Os números do atleta vêm dos lances lançados pelo organizador em cada
          jogo. Só aparecem eventos da sua organização.
        </p>
      </section>
    </div>
  );
}
