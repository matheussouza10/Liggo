import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEventFormOptions } from "@/lib/catalog/queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Editar evento | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function EditEventPage({
  params,
}: PageProps<"/events/[id]/edit">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's event is a 404.
  const event = user.organization
    ? await prisma.event.findFirst({
        where: { id, organizationId: user.organization.id },
      })
    : null;
  if (!event) notFound();
  const [options, registrations, runs] = await Promise.all([
    getEventFormOptions(),
    prisma.registration.count({ where: { eventId: id } }),
    prisma.stageRun.count({ where: { stage: { eventId: id } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Editar evento
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {registrations > 0 || runs > 0
            ? "Já há inscrições ou sorteio: a modalidade e o formato de participação ficam travados. Se mudar a data de início, conferimos se todos os atletas ainda cabem nas categorias por idade."
            : "Mude o que precisar. Depois de haver inscrições, a modalidade e o formato de participação ficam travados."}
        </p>
      </div>
      <EventForm
        options={options}
        mode="edit"
        eventId={id}
        locked={registrations > 0 || runs > 0}
        initial={{
          name: event.name,
          description: event.description ?? "",
          startDate: event.startDate.toISOString().slice(0, 10),
          endDate: event.endDate.toISOString().slice(0, 10),
          eventTypeId: event.eventTypeId,
          formatId: event.formatId,
          sportId: event.sportId,
          participationType: event.participationType,
          locationName: event.locationName,
          city: event.city ?? "",
          state: event.state ?? "",
        }}
      />
    </div>
  );
}
