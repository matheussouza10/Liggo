import { MapPinIcon, TriangleAlertIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatKickoff } from "@/lib/competition/format";
import {
  CONFLICT_LABELS,
  findConflicts,
  type ScheduledGame,
} from "@/lib/competition/schedule-conflicts";
import { prisma } from "@/lib/prisma";
import { registrationName } from "@/lib/registrations/queries";

export const metadata: Metadata = {
  title: "Calendário | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

export default async function CalendarPage() {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id;
  const regInclude = {
    registration: {
      include: {
        team: { select: { name: true } },
        members: { include: { athlete: { select: { name: true } } } },
      },
    },
  } as const;
  const matches = organizationId
    ? await prisma.match.findMany({
        where: {
          scheduledAt: { not: null },
          stageRun: { stage: { event: { organizationId } } },
        },
        orderBy: [{ scheduledAt: "asc" }, { venue: "asc" }],
        take: 400,
        include: {
          home: { include: regInclude },
          away: { include: regInclude },
          referee: { select: { name: true } },
          stageRun: {
            select: {
              stage: {
                select: {
                  name: true,
                  event: { select: { id: true, name: true } },
                },
              },
              category: { select: { name: true } },
            },
          },
        },
      })
    : [];

  const days = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = dayKey.format(m.scheduledAt as Date);
    days.set(key, [...(days.get(key) ?? []), m]);
  }

  // Problems among games not played yet: same place, referee, team or athlete.
  const open = matches.filter((m) => m.status === "SCHEDULED");
  const games: ScheduledGame[] = open.map((m) => {
    const sides = [m.home, m.away].filter((x) => !!x);
    return {
      id: m.id,
      at: (m.scheduledAt as Date).getTime(),
      venue: m.venue,
      refereeId: m.refereeId,
      sides: sides.map((x) => x!.registrationId),
      athletes: sides.flatMap((x) =>
        x!.registration.members.map((mem) => mem.athleteId),
      ),
    };
  });
  const conflicts = findConflicts(games);
  const conflicted = new Set(conflicts.flatMap((c) => c.gameIds));
  const byId = new Map(matches.map((m) => [m.id, m]));
  const title = (id: string) => {
    const m = byId.get(id);
    if (!m) return "";
    const home = m.home ? registrationName(m.home.registration) : "A definir";
    const away = m.away ? registrationName(m.away.registration) : "A definir";
    const time = formatKickoff((m.scheduledAt as Date).toISOString()).split(
      " às ",
    )[1];
    return `${home} x ${away} (${time}${m.venue ? `, ${m.venue}` : ""})`;
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Calendário
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Todos os jogos agendados dos seus eventos, por dia.
        </p>
      </div>
      {conflicts.length > 0 ? (
        <section
          aria-label="Conflitos"
          className="flex flex-col gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlertIcon className="size-4 text-amber-300" aria-hidden />
            {conflicts.length}{" "}
            {conflicts.length === 1 ? "conflito" : "conflitos"} de horário
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {conflicts.map((c) => (
              <li key={`${c.kind}-${c.gameIds.join("-")}`}>
                <span className="font-medium">{CONFLICT_LABELS[c.kind]}:</span>{" "}
                {title(c.gameIds[0])} e {title(c.gameIds[1])}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {matches.length === 0 ? (
        <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
          Nenhum jogo agendado ainda. Agende os jogos na tela de cada fase.
        </p>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {[...days.entries()].map(([key, list]) => (
            <section key={key} aria-label={key} className="flex flex-col gap-2">
              <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
                {dayFmt.format(list[0].scheduledAt as Date)}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((m) => (
                  <li
                    key={m.id}
                    data-conflict={conflicted.has(m.id) ? "true" : undefined}
                    className={`liquid-card grid gap-2 rounded-xl p-3 sm:grid-cols-[5.5rem_1fr] sm:items-center ${conflicted.has(m.id) ? "ring-1 ring-amber-400/50" : ""}`}
                  >
                    <span className="font-semibold tabular-nums">
                      {
                        formatKickoff(
                          (m.scheduledAt as Date).toISOString(),
                        ).split(" às ")[1]
                      }
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="truncate text-sm font-medium">
                        {m.home
                          ? registrationName(m.home.registration)
                          : "A definir"}{" "}
                        x{" "}
                        {m.away
                          ? registrationName(m.away.registration)
                          : "A definir"}
                        {m.status !== "SCHEDULED" ? (
                          <span className="ml-2 tabular-nums text-muted-foreground">
                            ({m.homeScore} x {m.awayScore})
                          </span>
                        ) : null}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <Link
                          href={`/events/${m.stageRun.stage.event.id}/stages`}
                          className="no-underline hover:text-white"
                        >
                          {m.stageRun.stage.event.name}
                        </Link>
                        <Badge variant="outline">
                          {m.stageRun.category.name}
                        </Badge>
                        <span>{m.label}</span>
                        {conflicted.has(m.id) ? (
                          <Badge variant="outline">Conflito</Badge>
                        ) : null}
                        {m.venue ? (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="size-3.5" />
                            {m.venue}
                          </span>
                        ) : null}
                        {m.referee ? (
                          <span className="flex items-center gap-1">
                            <UserIcon className="size-3.5" />
                            {m.referee.name}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
