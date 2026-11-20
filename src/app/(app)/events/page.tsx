import {
  ActivityIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  EyeOffIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SwordsIcon,
  TrophyIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Tip } from "@/components/stats/tip";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTICIPATION_LABELS } from "@/lib/catalog/config";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatDay } from "@/lib/events/constants";
import { KpiStrip } from "@/components/app/kpi-strip";
import { listEvents } from "@/lib/events/queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Eventos | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function EventsPage() {
  const user = await requireOrganizationUser();
  const events = user.organization
    ? await listEvents(user.organization.id)
    : [];
  const organizationId = user.organization?.id;
  const [registrations, pending] = organizationId
    ? await Promise.all([
        prisma.registration.count({ where: { event: { organizationId } } }),
        prisma.registrationRequest.count({
          where: { event: { organizationId }, status: "PENDING" },
        }),
      ])
    : [0, 0];
  const now = new Date();
  const ongoing = events.filter(
    (e) =>
      e.startDate.getTime() <= now.getTime() &&
      e.endDate.getTime() + 24 * 3600 * 1000 > now.getTime(),
  );
  const upcoming = events
    .filter((e) => e.startDate.getTime() > now.getTime())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Eventos
          </h1>
          <p className="mt-3 text-muted-foreground">
            Campeonatos, torneios, ligas e outras competições da sua
            organização.
          </p>
        </div>
        <Link
          href="/events/new"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          <PlusIcon data-icon="inline-start" />
          Novo evento
        </Link>
      </div>

      {events.length > 0 ? (
        <KpiStrip
          label="Indicadores dos eventos"
          items={[
            {
              label: "Eventos",
              value: events.length,
              hint: `${events.length - ongoing.length - upcoming.length} já encerrados`,
              icon: TrophyIcon,
            },
            {
              label: "Em andamento",
              value: ongoing.length,
              hint: ongoing[0]?.name ?? "Nenhum agora",
              icon: ActivityIcon,
              tone: ongoing.length > 0 ? "good" : "default",
            },
            {
              label: "Próximos",
              value: upcoming.length,
              hint: upcoming[0]
                ? `${upcoming[0].name} em ${formatDay(upcoming[0].startDate)}`
                : "Nenhum agendado",
              icon: CalendarDaysIcon,
            },
            {
              label: "Inscrições",
              value: registrations,
              hint:
                pending > 0
                  ? `${pending} ${pending === 1 ? "pedido aguarda" : "pedidos aguardam"} resposta`
                  : "Nenhum pedido pendente",
              icon: ClipboardListIcon,
              tone: pending > 0 ? "warn" : "default",
            },
          ]}
        />
      ) : null}

      {events.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrophyIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum evento ainda</EmptyTitle>
            <EmptyDescription>
              Crie o primeiro evento da sua organização escolhendo o tipo, o
              formato e a modalidade.
            </EmptyDescription>
          </EmptyHeader>
          <Link href="/events/new" className={buttonVariants()}>
            Criar evento
          </Link>
        </Empty>
      ) : (
        <div className="liquid-card overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="hidden md:table-cell">
                  Modalidade
                </TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="hidden xl:table-cell">
                  Participação
                </TableHead>
                <TableHead className="w-52 text-right">Acesso rápido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/events/${event.id}`}
                      className="text-white no-underline hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="text-xs font-normal text-muted-foreground">
                      {[event.locationName, event.city, event.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {event.sport.name}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {event.eventType.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDay(event.startDate)} a {formatDay(event.endDate)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {PARTICIPATION_LABELS[event.participationType]}
                  </TableCell>
                  <TableCell>
                    <nav
                      aria-label={`Acesso rápido a ${event.name}`}
                      className="flex items-center justify-end gap-1"
                    >
                      {[
                        {
                          href: `/events/${event.id}/edit`,
                          label: "Editar",
                          Icon: PencilIcon,
                        },
                        {
                          href: `/events/${event.id}/rules`,
                          label: "Regras",
                          Icon: SlidersHorizontalIcon,
                        },
                        {
                          href: `/events/${event.id}/registrations`,
                          label: "Inscrições",
                          Icon: ClipboardListIcon,
                        },
                        {
                          href: `/events/${event.id}/stages`,
                          label: "Fases e jogos",
                          Icon: SwordsIcon,
                        },
                      ].map(({ href, label, Icon }) => (
                        <Tip key={label} text={label}>
                          <Link
                            href={href}
                            aria-label={`${label} de ${event.name}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                          >
                            <Icon />
                          </Link>
                        </Tip>
                      ))}
                      {event.publicVisible ? (
                        <Tip text="Página pública">
                          <Link
                            href={`/watch/events/${event.id}`}
                            target="_blank"
                            aria-label={`Página pública de ${event.name}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                          >
                            <GlobeIcon />
                          </Link>
                        </Tip>
                      ) : (
                        <Tip text="Evento oculto ao público">
                          <span
                            role="img"
                            aria-label={`${event.name} está oculto ao público`}
                            className="inline-flex size-7 items-center justify-center text-muted-foreground"
                          >
                            <EyeOffIcon className="size-4" />
                          </span>
                        </Tip>
                      )}
                    </nav>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
