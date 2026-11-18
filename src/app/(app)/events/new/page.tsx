import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/events/event-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEventFormOptions } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Novo evento | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function NewEventPage() {
  await requireOrganizationUser();
  const options = await getEventFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Eventos
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Novo evento
        </h1>
        <p className="mt-3 text-muted-foreground">
          As regras da competição serão definidas depois de criar o evento.
        </p>
      </div>
      <EventForm options={options} />
    </div>
  );
}
