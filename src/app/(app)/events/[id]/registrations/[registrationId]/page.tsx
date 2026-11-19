import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationBuilder } from "@/components/registrations/registration-builder";
import { requireOrganizationUser } from "@/lib/auth/guards";
import {
  getBuilderOptions,
  getEventForRegistration,
  getRegistration,
} from "@/lib/registrations/queries";

export const metadata: Metadata = {
  title: "Editar inscrição | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function EditRegistrationPage({
  params,
}: PageProps<"/events/[id]/registrations/[registrationId]">) {
  const user = await requireOrganizationUser();
  const { id, registrationId } = await params;
  const event = user.organization
    ? await getEventForRegistration(user.organization.id, id)
    : null;
  if (!event || !user.organization) notFound();
  const registration = await getRegistration(event.id, registrationId);
  if (!registration) notFound();
  const options = await getBuilderOptions(
    user.organization.id,
    event.id,
    event.sportId,
    registration.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}/registrations`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Inscrições
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Editar inscrição
        </h1>
      </div>
      <RegistrationBuilder
        eventId={event.id}
        eventStart={event.startDate.toISOString().slice(0, 10)}
        participationType={event.participationType}
        categories={event.categories.map((c) => ({
          id: c.id,
          name: c.name,
          gender: c.gender,
          minAge: c.minAge,
          maxAge: c.maxAge,
          rosterMin: c.rosterMin,
          rosterMax: c.rosterMax,
        }))}
        athletes={options.athletes.map((a) => ({
          ...a,
          birthDate: a.birthDate.toISOString().slice(0, 10),
        }))}
        teams={options.teams}
        positions={options.positions}
        takenAthletes={options.takenAthletes}
        takenTeams={options.takenTeams}
        initial={{
          registrationId: registration.id,
          categoryId: registration.categoryId,
          teamId: registration.teamId,
          members: registration.members.map((m) => ({
            athleteId: m.athleteId,
            shirt: m.shirtNumber == null ? "" : String(m.shirtNumber),
            positionId: m.positionId ?? "",
            isCaptain: m.isCaptain,
          })),
          staff: registration.staff.map((s) => ({
            name: s.name,
            role: s.role,
            contact: s.contact ?? "",
          })),
        }}
      />
    </div>
  );
}
