import {
  CalendarClockIcon,
  ClipboardListIcon,
  RadioIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatKickoff } from "@/lib/competition/format";
import type { MatchSnapshot } from "@/lib/competition/live-queries";
import { getDashboard } from "@/lib/dashboard/queries";
import { formatDay } from "@/lib/events/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Painel | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request, so it cannot be part of the static shell
// (see the note in the parent layout). Streaming still applies.
export const instant = false;

function Stat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof TrophyIcon;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="liquid-card flex items-center gap-4 rounded-xl p-4 no-underline transition-colors hover:border-primary/50"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="block font-display text-3xl leading-none font-extrabold tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {label}
        </span>
      </span>
    </Link>
  );
}

function MatchRow({ m, eventId }: { m: MatchSnapshot; eventId: string }) {
  const score = m.scoreHome != null && m.scoreAway != null;
  return (
    <li>
      <Link
        href={`/events/${eventId}/matches/${m.id}`}
        className="liquid-card flex items-center gap-3 rounded-xl px-4 py-3 no-underline transition-colors hover:border-primary/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {m.home ?? "A definir"}{" "}
            <span className="text-muted-foreground">x</span>{" "}
            {m.away ?? "A definir"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {m.eventName} · {m.label}
          </span>
        </span>
        {score ? (
          <span className="font-display text-xl leading-none font-bold tabular-nums">
            {m.scoreHome} x {m.scoreAway}
          </span>
        ) : null}
        {m.state === "LIVE" ? (
          <Badge className="gap-1.5 bg-red-600 text-white">
            <span
              className="size-1.5 animate-pulse rounded-full bg-white"
              aria-hidden
            />
            Ao vivo
          </Badge>
        ) : m.scheduledAt && m.state === "SCHEDULED" ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatKickoff(m.scheduledAt)}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

export default async function DashboardPage() {
  const user = await requireOrganizationUser();
  const organization = user.organization;
  const data = organization ? await getDashboard(organization.id) : null;
  const first = user.name.split(" ")[0];
  const empty =
    !data ||
    (data.counts.events === 0 &&
      data.counts.teams === 0 &&
      data.counts.athletes === 0);

  return (
    <div className="flex max-w-6xl flex-col gap-8">
      <AutoRefresh seconds={20} />
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Olá, {first}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {organization
            ? `Resumo de ${organization.name}.`
            : "Você ainda não está em uma organização."}
        </p>
      </div>

      {empty ? (
        <section
          className="liquid-card flex flex-col gap-4 rounded-xl p-6"
          aria-label="Primeiros passos"
        >
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Por onde começar
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              [
                "1. Cadastre atletas e times",
                "Eles ficam disponíveis para todos os seus eventos.",
                "/teams/new",
                "Cadastrar time",
              ],
              [
                "2. Crie um evento",
                "Modalidade, datas, local e regras da competição.",
                "/events/new",
                "Criar evento",
              ],
              [
                "3. Inscreva e sorteie",
                "Escolha o elenco de cada time e sorteie os grupos.",
                "/events",
                "Ver eventos",
              ],
            ].map(([title, text, href, cta]) => (
              <li key={title} className="rounded-xl border p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                <Link
                  href={href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-3 h-9",
                  )}
                >
                  {cta}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data ? (
        <>
          <section
            aria-label="Números"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <Stat
              icon={TrophyIcon}
              label="Eventos"
              value={data.counts.events}
              href="/events"
            />
            <Stat
              icon={ClipboardListIcon}
              label="Inscrições"
              value={data.counts.registrations}
              href="/events"
            />
            <Stat
              icon={ShieldIcon}
              label="Times ativos"
              value={data.counts.teams}
              href="/teams"
            />
            <Stat
              icon={UsersIcon}
              label="Atletas"
              value={data.counts.athletes}
              href="/athletes"
            />
            <Stat
              icon={CalendarClockIcon}
              label="Árbitros"
              value={data.counts.referees}
              href="/referees"
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section
              aria-labelledby="dash-live"
              className="flex flex-col gap-3"
            >
              <h2
                id="dash-live"
                className="flex items-center gap-2 font-display text-2xl leading-none font-bold tracking-wide uppercase"
              >
                <RadioIcon className="size-5 text-red-400" aria-hidden />
                Ao vivo agora
              </h2>
              {data.live.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  Nenhum jogo ao vivo. Inicie um jogo pela tela da fase.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.live.map((m) => (
                    <MatchRow key={m.id} m={m} eventId={m.eventId} />
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="dash-next"
              className="flex flex-col gap-3"
            >
              <h2
                id="dash-next"
                className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
              >
                Próximos jogos
              </h2>
              {data.upcoming.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  Nenhum jogo agendado pela frente. Agende pela tela de cada
                  fase.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.upcoming.map((m) => (
                    <MatchRow key={m.id} m={m} eventId={m.eventId} />
                  ))}
                </ul>
              )}
            </section>
          </div>

          {data.recent.length ? (
            <section
              aria-labelledby="dash-recent"
              className="flex flex-col gap-3"
            >
              <h2
                id="dash-recent"
                className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
              >
                Resultados recentes
              </h2>
              <ul className="grid gap-2 lg:grid-cols-2">
                {data.recent.map((m) => (
                  <MatchRow key={m.id} m={m} eventId={m.eventId} />
                ))}
              </ul>
            </section>
          ) : null}

          {data.events.length ? (
            <section
              aria-labelledby="dash-events"
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="dash-events"
                  className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
                >
                  Seus eventos
                </h2>
                <Link
                  href="/events"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9",
                  )}
                >
                  Ver todos
                </Link>
              </div>
              <ul className="grid gap-3 md:grid-cols-2">
                {data.events.map((e) => {
                  const pct = e.total
                    ? Math.round((e.played / e.total) * 100)
                    : 0;
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="liquid-card flex h-full flex-col gap-3 rounded-xl p-4 no-underline transition-colors hover:border-primary/50"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{e.name}</span>
                          <Badge
                            variant={e.publicVisible ? "secondary" : "outline"}
                          >
                            {e.publicVisible ? "Público" : "Oculto"}
                          </Badge>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {e.sport} · {formatDay(e.startDate)} a{" "}
                          {formatDay(e.endDate)} · {e.registrations}{" "}
                          {e.registrations === 1 ? "inscrição" : "inscrições"}
                        </span>
                        <span className="mt-auto flex flex-col gap-1">
                          <span className="flex justify-between text-xs text-muted-foreground">
                            <span>Jogos disputados</span>
                            <span className="tabular-nums">
                              {e.total
                                ? `${e.played} de ${e.total}`
                                : "Sem jogos ainda"}
                            </span>
                          </span>
                          <span
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Andamento de ${e.name}`}
                          >
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
