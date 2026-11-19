import { isCombatSport } from "@/lib/competition/win-method";
import { seriesConfigOf } from "@/lib/competition/series";
import { setsConfigOf } from "@/lib/competition/sets";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchControl } from "@/components/competition/match-control";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getOrganizerMatch } from "@/lib/competition/live-queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Jogo | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function MatchPage({
  params,
}: PageProps<"/events/[id]/matches/[matchId]">) {
  const user = await requireOrganizationUser();
  const { id, matchId } = await params;
  const data = user.organization
    ? await getOrganizerMatch(user.organization.id, id, matchId)
    : null;
  if (!data) notFound();
  const rules = await prisma.eventRules.findUnique({
    where: { eventId: id },
    select: {
      penalties: true,
      scoringModel: true,
      sportConfig: true,
      matchFormat: true,
      bestOf: true,
      awayGoals: true,
    },
  });

  const sport = await prisma.event.findUnique({
    where: { id },
    select: { sport: { select: { category: { select: { name: true } } } } },
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href={`/events/${id}/stages`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Fases
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Jogo
          </h1>
          <Link
            href={`/events/${id}/reports/matches/${matchId}`}
            className="text-sm"
          >
            Súmula para imprimir
          </Link>
        </div>
      </div>
      <MatchControl
        eventId={id}
        snapshot={data.snapshot}
        homeRoster={data.homeRoster}
        awayRoster={data.awayRoster}
        publicVisible={data.publicVisible}
        ready={data.ready}
        knockout={data.knockout}
        penalties={rules?.penalties ?? false}
        setsConfig={setsConfigOf(rules)}
        series={data.knockout ? seriesConfigOf(rules) : null}
        recordMethod={isCombatSport(sport?.sport.category.name)}
      />
    </div>
  );
}
