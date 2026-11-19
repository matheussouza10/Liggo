import { ArrowLeftIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BracketTree } from "@/components/competition/bracket-tree";
import { StandingsTables } from "@/components/competition/standings-tables";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { MatchCard } from "@/components/public/match-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getBracket } from "@/lib/competition/bracket-data";
import {
  getRunDetail,
  runTables,
  standingsRules,
} from "@/lib/competition/queries";
import {
  getPublicEvent,
  listEventMatches,
} from "@/lib/competition/public-queries";
import { formatDay } from "@/lib/events/constants";
import { cn } from "@/lib/utils";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/watch/events/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const e = await getPublicEvent(id);
  return { title: e ? `${e.name} | Liggo` : "Evento | Liggo" };
}

export default async function PublicEventPage({
  params,
  searchParams,
}: PageProps<"/watch/events/[id]">) {
  await connection();
  const { id } = await params;
  const { category } = await searchParams;
  const event = await getPublicEvent(id);
  if (!event) notFound();

  const selected =
    event.categories.find((c) => c.id === category) ?? event.categories[0];
  const matches = await listEventMatches(event.id);
  const inCategory = selected
    ? matches.filter((m) => m.categoryName === selected.name)
    : matches;
  const live = inCategory.filter((m) => m.state === "LIVE");
  const upcoming = inCategory
    .filter((m) => m.state === "SCHEDULED" && m.home && m.away)
    .slice(0, 12);
  const finished = inCategory
    .filter((m) => m.state === "FINISHED" || m.state === "WALKOVER")
    .slice(-12)
    .reverse();

  const rules = standingsRules(event);
  const league: {
    stage: string;
    tables: Awaited<ReturnType<typeof runTables>>;
    advancing: number | null;
  }[] = [];
  if (rules && selected) {
    for (const stage of event.stages.filter((s) => s.type !== "SINGLE_ELIM")) {
      const run = await getRunDetail(stage.id, selected.id);
      if (run && run.matches.length)
        league.push({
          stage: stage.name,
          tables: runTables(run, rules),
          advancing: stage.advancingPerGroup,
        });
    }
  }
  const bracket = selected ? await getBracket(event.stages, selected.id) : null;
  const hasKnockout = event.stages.some((s) => s.type === "SINGLE_ELIM");

  return (
    <div className="flex flex-col gap-10">
      <AutoRefresh seconds={15} />
      <div>
        <Link
          href="/watch"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Jogos e eventos
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {event.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{event.sport.name}</Badge>
          <Badge variant="secondary">
            {formatDay(event.startDate)} a {formatDay(event.endDate)}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPinIcon className="size-4" aria-hidden />
            {[
              event.locationName,
              [event.city, event.state].filter(Boolean).join(" - "),
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
        <Link
          href={`/watch/events/${event.id}/stats${selected ? `?category=${selected.id}` : ""}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-4 h-9",
          )}
        >
          Ver estatísticas: artilharia, cartões, faltas e posse
        </Link>
        {event.description ? (
          <p className="mt-4 max-w-3xl whitespace-pre-line text-muted-foreground">
            {event.description}
          </p>
        ) : null}
      </div>

      {event.categories.length > 1 ? (
        <nav aria-label="Categorias" className="flex flex-wrap gap-2">
          {event.categories.map((c) => (
            <Link
              key={c.id}
              href={`/watch/events/${event.id}?category=${c.id}`}
              aria-current={c.id === selected?.id ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: c.id === selected?.id ? "default" : "outline",
                  size: "sm",
                }),
                "h-9",
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {live.length ? (
        <section aria-labelledby="ev-live" className="flex flex-col gap-4">
          <h2
            id="ev-live"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Ao vivo
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.id} m={m} showEvent={false} />
            ))}
          </div>
        </section>
      ) : null}

      {league.map((l) => (
        <section
          key={l.stage}
          aria-label={l.stage}
          className="flex flex-col gap-4"
        >
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            {l.stage}
          </h2>
          <StandingsTables
            tables={l.tables.tables}
            ignored={[]}
            qualify={l.advancing}
          />
        </section>
      ))}

      {hasKnockout && bracket ? (
        <section aria-labelledby="ev-bracket" className="flex flex-col gap-4">
          <h2
            id="ev-bracket"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Chaveamento
          </h2>
          <BracketTree
            data={bracket}
            href={(matchId) => `/watch/matches/${matchId}`}
          />
        </section>
      ) : null}

      {upcoming.length ? (
        <section aria-labelledby="ev-next" className="flex flex-col gap-4">
          <h2
            id="ev-next"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Próximos jogos
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} m={m} showEvent={false} />
            ))}
          </div>
        </section>
      ) : null}

      {finished.length ? (
        <section aria-labelledby="ev-done" className="flex flex-col gap-4">
          <h2
            id="ev-done"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Resultados
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {finished.map((m) => (
              <MatchCard key={m.id} m={m} showEvent={false} />
            ))}
          </div>
        </section>
      ) : null}

      {inCategory.length === 0 ? (
        <p className="liquid-card rounded-xl p-6 text-sm text-muted-foreground">
          Os jogos deste evento ainda não foram definidos.
        </p>
      ) : null}
    </div>
  );
}
