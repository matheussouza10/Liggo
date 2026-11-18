import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
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
import { storedRulesToInput } from "@/lib/rules/queries";
import { summarizeRules } from "@/lib/rules/summary";

export const metadata: Metadata = {
  title: "Evento | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's event is a 404.
  const event = user.organization
    ? await getEvent(user.organization.id, id)
    : null;
  if (!event) notFound();

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
    </div>
  );
}
