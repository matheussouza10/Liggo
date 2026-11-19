import {
  CalendarDaysIcon,
  MapPinIcon,
  RadioIcon,
  TrophyIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { MatchCard } from "@/components/public/match-card";
import { Badge } from "@/components/ui/badge";
import {
  listLiveMatches,
  listPublicEvents,
  listRecentMatches,
  listUpcomingMatches,
} from "@/lib/competition/public-queries";
import { formatDay } from "@/lib/events/constants";

export const metadata: Metadata = {
  title: "Jogos ao vivo e eventos | Liggo",
  description:
    "Acompanhe jogos em tempo real, resultados e classificação dos campeonatos.",
};
export const instant = false;

export default async function WatchPage() {
  await connection();
  const [live, upcoming, recent, events] = await Promise.all([
    listLiveMatches(),
    listUpcomingMatches(9),
    listRecentMatches(9),
    listPublicEvents(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-6xl">
          Acompanhe os jogos
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Placar, lance a lance, resultados e classificação, em tempo real. Sem
          precisar entrar.
        </p>
      </div>

      <section aria-labelledby="live-heading" className="flex flex-col gap-4">
        <h2
          id="live-heading"
          className="flex items-center gap-2 font-display text-2xl leading-none font-bold tracking-wide uppercase"
        >
          <RadioIcon className="size-5 text-red-400" aria-hidden />
          Ao vivo agora
          {live.length ? (
            <Badge className="bg-red-600 text-white">{live.length}</Badge>
          ) : null}
        </h2>
        {live.length === 0 ? (
          <p className="liquid-card rounded-xl p-6 text-sm text-muted-foreground">
            Nenhum jogo ao vivo neste momento. Veja os próximos jogos abaixo.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length ? (
        <section aria-labelledby="next-heading" className="flex flex-col gap-4">
          <h2
            id="next-heading"
            className="flex items-center gap-2 font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            <CalendarDaysIcon className="size-5" aria-hidden />
            Próximos jogos
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section
          aria-labelledby="recent-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="recent-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Resultados recentes
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="events-heading" className="flex flex-col gap-4">
        <h2
          id="events-heading"
          className="flex items-center gap-2 font-display text-2xl leading-none font-bold tracking-wide uppercase"
        >
          <TrophyIcon className="size-5" aria-hidden />
          Eventos
        </h2>
        {events.length === 0 ? (
          <p className="liquid-card rounded-xl p-6 text-sm text-muted-foreground">
            Nenhum evento público ainda.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/watch/events/${e.id}`}
                  className="liquid-card flex h-full flex-col gap-2 rounded-xl p-4 no-underline transition-colors hover:border-primary/50"
                >
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {e.sport.name} · {formatDay(e.startDate)} a{" "}
                    {formatDay(e.endDate)}
                  </span>
                  <span className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPinIcon className="size-3.5" aria-hidden />
                    {[e.city, e.state].filter(Boolean).join(" - ") ||
                      "Local a definir"}{" "}
                    · {e.organization.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
