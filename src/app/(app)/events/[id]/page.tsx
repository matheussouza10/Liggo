import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { PARTICIPATION_LABELS } from "@/lib/catalog/config";
import { formatDay } from "@/lib/events/constants";
import { getEvent } from "@/lib/events/queries";

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
    </div>
  );
}
