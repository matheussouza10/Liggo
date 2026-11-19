import { matchSideStats } from "@/lib/competition/stats";
import type { SnapshotEvent } from "@/lib/competition/live-queries";
import { ComparisonBars } from "./comparison-bars";
import { MatchTimelineChart } from "./match-timeline-chart";
import { PossessionBar } from "./possession-bar";

/** Charts of one match, from its lances and possession. Used by the organizer and the public page. */
export function MatchStatsPanel({
  home,
  away,
  events,
  possessionHome,
}: {
  home: string | null;
  away: string | null;
  events: SnapshotEvent[];
  possessionHome: number | null;
}) {
  const h = home ?? "Mandante";
  const a = away ?? "Visitante";
  const s = matchSideStats(events);
  const rows = [
    { label: "Gols / pontos", home: s.home.score, away: s.away.score },
    { label: "Faltas", home: s.home.fouls, away: s.away.fouls },
    { label: "Cartões amarelos", home: s.home.yellow, away: s.away.yellow },
    { label: "Cartões vermelhos", home: s.home.red, away: s.away.red },
    {
      label: "Substituições",
      home: s.home.substitutions,
      away: s.away.substitutions,
    },
  ];
  if (s.home.missedPenalties + s.away.missedPenalties > 0)
    rows.push({
      label: "Pênaltis perdidos",
      home: s.home.missedPenalties,
      away: s.away.missedPenalties,
    });

  return (
    <section aria-label="Estatísticas do jogo" className="flex flex-col gap-6">
      <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
        Estatísticas
      </h2>
      <div className="liquid-card flex flex-col gap-5 rounded-xl p-5 lg:max-w-3xl">
        <ComparisonBars rows={rows} homeName={h} awayName={a} />
        {possessionHome != null ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="text-xs tracking-widest text-muted-foreground uppercase">
              Posse de bola
            </h3>
            <PossessionBar
              homeName={h}
              awayName={a}
              homePercent={possessionHome}
            />
          </div>
        ) : (
          <p className="border-t pt-4 text-sm text-muted-foreground">
            A posse de bola ainda não foi informada.
          </p>
        )}
      </div>
      <div className="liquid-card flex flex-col gap-3 rounded-xl p-5">
        <h3 className="text-xs tracking-widest text-muted-foreground uppercase">
          Linha do tempo
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <MatchTimelineChart events={events} home={h} away={a} />
          </div>
        </div>
      </div>
    </section>
  );
}
