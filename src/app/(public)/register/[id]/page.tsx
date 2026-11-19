import { CalendarIcon, ClockIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RequestForm } from "@/components/requests/request-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDay } from "@/lib/events/constants";
import { getRegistrationEvent } from "@/lib/requests/queries";
import { CLOSED_MESSAGES, registrationOpenState } from "@/lib/requests/state";
import { PARTICIPATION_LABELS } from "@/lib/catalog/config";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/register/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const e = await getRegistrationEvent(id);
  // A form with names and documents has no business in search results.
  return {
    title: e ? `Inscrição em ${e.name} | Liggo` : "Inscrição | Liggo",
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
  params,
}: PageProps<"/register/[id]">) {
  await connection();
  const { id } = await params;
  const event = await getRegistrationEvent(id);
  if (!event) notFound();
  const state = registrationOpenState(event, new Date());
  const place = [
    event.locationName,
    [event.city, event.state].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {event.organization.name}
        </p>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {event.name}
        </h1>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CalendarIcon className="size-4" aria-hidden />
            {formatDay(event.startDate)} a {formatDay(event.endDate)}
          </li>
          <li className="flex items-center gap-1.5">
            <MapPinIcon className="size-4" aria-hidden />
            {place}
          </li>
          <li>
            {event.sport.name} · {PARTICIPATION_LABELS[event.participationType]}
          </li>
          {event.registrationDeadline ? (
            <li className="flex items-center gap-1.5">
              <ClockIcon className="size-4" aria-hidden />
              Inscrições até {formatDay(event.registrationDeadline)}
            </li>
          ) : null}
        </ul>
        {event.description ? (
          <p className="max-w-2xl text-muted-foreground">{event.description}</p>
        ) : null}
        {event.registrationNotes ? (
          <Alert>
            <AlertDescription className="whitespace-pre-line">
              {event.registrationNotes}
            </AlertDescription>
          </Alert>
        ) : null}
      </header>

      {state.open ? (
        event.categories.length > 0 ? (
          <RequestForm
            eventId={event.id}
            participation={event.participationType}
            categories={event.categories}
            positions={event.sport.positions}
          />
        ) : (
          <Alert>
            <AlertDescription>
              Este evento ainda não tem categorias abertas para inscrição.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert role="status">
          <AlertDescription>{CLOSED_MESSAGES[state.reason]}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
