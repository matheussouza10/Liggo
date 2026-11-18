import { PlusIcon, TrophyIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { listEvents } from "@/lib/events/queries";

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
