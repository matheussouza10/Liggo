import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoriesManager } from "@/components/registrations/categories-manager";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEventForRegistration } from "@/lib/registrations/queries";

export const metadata: Metadata = {
  title: "Categorias | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function EventCategoriesPage({
  params,
}: PageProps<"/events/[id]/categories">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's event is a 404.
  const event = user.organization
    ? await getEventForRegistration(user.organization.id, id)
    : null;
  if (!event) notFound();

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Categorias
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Divisões do evento, como “Sub-15 Masculino” ou “Adulto Feminino”. Cada
          inscrição escolhe uma categoria, e só entram atletas que cabem nela.
        </p>
      </div>
      <CategoriesManager
        eventId={event.id}
        rows={event.categories.map((c) => ({
          id: c.id,
          name: c.name,
          gender: c.gender,
          minAge: c.minAge,
          maxAge: c.maxAge,
          rosterMin: c.rosterMin,
          rosterMax: c.rosterMax,
          registrations: c._count.registrations,
        }))}
      />
    </div>
  );
}
