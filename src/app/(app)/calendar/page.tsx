import { MapPinIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatKickoff } from "@/lib/competition/format";
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

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Calendário
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Todos os jogos agendados dos seus eventos, por dia.
        </p>
      </div>
      {matches.length === 0 ? (
        <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
          Nenhum jogo agendado ainda. Agende os jogos na tela de cada fase.
        </p>
      ) : (
        [...days.entries()].map(([key, list]) => (
          <section key={key} aria-label={key} className="flex flex-col gap-2">
            <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
              {dayFmt.format(list[0].scheduledAt as Date)}
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((m) => (
                <li
                  key={m.id}
                  className="liquid-card grid gap-2 rounded-xl p-3 sm:grid-cols-[5.5rem_1fr] sm:items-center"
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
        ))
      )}
    </div>
  );
}
