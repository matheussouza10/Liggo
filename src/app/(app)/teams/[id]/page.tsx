import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamForm } from "@/components/people/team-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getTeam } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Time | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function TeamPage({ params }: PageProps<"/teams/[id]">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's team is a 404.
  const team = user.organization
    ? await getTeam(user.organization.id, id)
    : null;
  if (!team) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Times
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {team.name}
        </h1>
      </div>
      <TeamForm
        teamId={team.id}
        initial={{
          name: team.name,
          shortName: team.shortName ?? "",
          city: team.city ?? "",
          state: team.state ?? "",
          color: team.color ?? "",
        }}
      />
    </div>
  );
}
