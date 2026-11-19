import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3Icon,
  ClipboardListIcon,
  InboxIcon,
  SlidersHorizontalIcon,
  SwordsIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { PARTICIPATION_LABELS } from "@/lib/catalog/config";
import { formatDay } from "@/lib/events/constants";
import { getEvent } from "@/lib/events/queries";
import { PublicToggle } from "@/components/competition/public-toggle";
import { EventActions } from "@/components/events/event-actions";
import { EventJourney } from "@/components/events/event-journey";
import { getJourney } from "@/lib/events/journey-queries";
import { RegistrationSettings } from "@/components/requests/registration-settings";
import { appUrl } from "@/lib/mail";
import { countPendingRequests } from "@/lib/requests/queries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { storedRulesToInput } from "@/lib/rules/queries";
import { summarizeRules } from "@/lib/rules/summary";

export const metadata: Metadata = {
  title: "Evento | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function EventPage({
  params,
  searchParams,
}: PageProps<"/events/[id]">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const { saved, copied } = await searchParams;
  // Scoped to the user's organization: another tenant's event is a 404.
  const event = user.organization
    ? await getEvent(user.organization.id, id)
    : null;
  if (!event) notFound();

  const [
    categoryCount,
    registrationCount,
    matchCount,
    playedCount,
    pendingRequests,
  ] = await Promise.all([
    prisma.eventCategory.count({ where: { eventId: event.id } }),
    prisma.registration.count({ where: { eventId: event.id } }),
    prisma.match.count({
      where: { stageRun: { stage: { eventId: event.id } } },
    }),
    prisma.match.count({
      where: {
        stageRun: { stage: { eventId: event.id } },
        status: { not: "SCHEDULED" },
      },
    }),
    countPendingRequests(event.id),
  ]);
  const journey = await getJourney(event.id);
  const rules = storedRulesToInput(event);
  const summary = rules ? summarizeRules(rules) : null;

  const place = [
    event.locationName,
    [event.city, event.state].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");
  const rows: [string, string][] = [
    ["Período", `${formatDay(event.startDate)} a ${formatDay(event.endDate)}`],
    ["Tipo", event.eventType.name],
    ["Modalidade", event.sport.name],
    ["Formato", event.format.name],
    ["Participação", PARTICIPATION_LABELS[event.participationType]],
    ["Local", place],
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Eventos
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {event.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{event.eventType.name}</Badge>
          <Badge variant="secondary">{event.sport.name}</Badge>
        </div>
      </div>

      {saved ? (
        <Alert>
          <AlertDescription>Alterações do evento salvas.</AlertDescription>
        </Alert>
      ) : null}
      {copied ? (
        <Alert>
          <AlertDescription>
            Evento duplicado. As categorias, as regras e as fases vieram da
            versão anterior; as inscrições e os jogos começam do zero.
          </AlertDescription>
        </Alert>
      ) : null}

      {journey ? <EventJourney eventId={event.id} journey={journey} /> : null}

      <EventActions
        eventId={event.id}
        eventName={event.name}
        startDate={event.startDate.toISOString().slice(0, 10)}
        endDate={event.endDate.toISOString().slice(0, 10)}
        isOwner={user.role === "OWNER"}
        impact={{
          registrations: registrationCount,
          matches: matchCount,
          played: playedCount,
        }}
      />

      {event.description ? (
        <p className="whitespace-pre-line text-muted-foreground">
          {event.description}
        </p>
      ) : null}

      <dl className="grid gap-x-8 gap-y-4 border-t pt-6 sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <section
        className="flex flex-col gap-4 border-t pt-6"
        aria-labelledby="rules-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="rules-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Regras
          </h2>
          <Link
            href={`/events/${event.id}/rules`}
            className={buttonVariants({
              variant: rules ? "outline" : "default",
            })}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            {rules ? "Editar regras" : "Configurar regras"}
          </Link>
        </div>
        {summary ? (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[10rem_1fr]">
            {(
              [
                ["Pontuação", summary.scoring],
                [
                  "Desempate",
                  summary.tiebreakers.length
                    ? summary.tiebreakers
                        .map((t, i) => `${i + 1}. ${t}`)
                        .join("  ")
                    : "Sem critérios",
                ],
                ["W.O.", summary.walkover],
                ["Confronto", summary.match],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="text-sm text-muted-foreground">Fases</dt>
              <dd className="flex flex-wrap gap-2">
                {summary.stages.map((stage, index) => (
                  <Badge key={index} variant="secondary">
                    {index + 1}. {stage.name || stage.type}
                  </Badge>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SlidersHorizontalIcon />
              </EmptyMedia>
              <EmptyTitle>As regras ainda não foram definidas</EmptyTitle>
              <EmptyDescription>
                Escolha pontuação, desempate, W.O., confrontos e fases a partir
                de uma predefinição da modalidade.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={`/events/${event.id}/rules`}
                className={buttonVariants()}
              >
                Configurar regras
              </Link>
            </EmptyContent>
          </Empty>
        )}
      </section>

      <section
        className="flex flex-col gap-4 border-t pt-6"
        aria-labelledby="registrations-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="registrations-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Inscrições
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${event.id}/categories`}
              className={buttonVariants({ variant: "outline" })}
            >
              Categorias
            </Link>
            <Link
              href={`/events/${event.id}/registrations`}
              className={buttonVariants()}
            >
              <ClipboardListIcon data-icon="inline-start" />
              Ver inscrições
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground">
          {registrationCount === 0
            ? "Nenhuma inscrição ainda."
            : `${registrationCount} ${registrationCount === 1 ? "inscrição" : "inscrições"}`}
          {" em "}
          {categoryCount} {categoryCount === 1 ? "categoria" : "categorias"}.
        </p>
      </section>

      <section
        className="flex flex-col gap-4 border-t pt-6"
        aria-labelledby="requests-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="requests-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Inscrições públicas
          </h2>
          <Link
            href={`/events/${event.id}/requests`}
            className={buttonVariants({
              variant: pendingRequests > 0 ? "default" : "outline",
            })}
          >
            <InboxIcon data-icon="inline-start" />
            Pedidos
            {pendingRequests > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests}{" "}
                {pendingRequests === 1 ? "pendente" : "pendentes"}
              </Badge>
            ) : null}
          </Link>
        </div>
        <p className="text-muted-foreground">
          Times e atletas pedem para participar por um link, sem conta. Nada
          entra no evento até você aprovar.
        </p>
        <RegistrationSettings
          eventId={event.id}
          link={`${appUrl()}/register/${event.id}`}
          initial={{
            open: event.registrationOpen,
            deadline: event.registrationDeadline
              ? new Date(event.registrationDeadline.getTime() - 3 * 3600 * 1000)
                  .toISOString()
                  .slice(0, 10)
              : "",
            notes: event.registrationNotes ?? "",
          }}
        />
      </section>

      <section
        className="flex flex-col gap-4 border-t pt-6"
        aria-labelledby="stages-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="stages-heading"
            className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
          >
            Fases e jogos
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${event.id}/stats`}
              className={buttonVariants({ variant: "outline" })}
            >
              <BarChart3Icon data-icon="inline-start" />
              Estatísticas
            </Link>
            <Link
              href={`/events/${event.id}/stages`}
              className={buttonVariants()}
            >
              <SwordsIcon data-icon="inline-start" />
              Abrir fases
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground">
          Sorteio, tabela de jogos, resultados, classificação e calendário.
        </p>
      </section>

      <section
        className="flex flex-col gap-4 border-t pt-6"
        aria-labelledby="public-heading"
      >
        <h2
          id="public-heading"
          className="font-display text-2xl leading-none font-bold tracking-wide uppercase"
        >
          Página pública
        </h2>
        <PublicToggle eventId={event.id} initial={event.publicVisible} />
      </section>
    </div>
  );
}
