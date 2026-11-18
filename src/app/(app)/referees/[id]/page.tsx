import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefereeForm } from "@/components/people/referee-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatCpf } from "@/lib/people/cpf";
import { getReferee, getSportOptions } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Árbitro | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function RefereePage({
  params,
}: PageProps<"/referees/[id]">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Scoped to the user's organization: another tenant's referee is a 404.
  const referee = user.organization
    ? await getReferee(user.organization.id, id)
    : null;
  if (!referee) notFound();
  const sports = await getSportOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/referees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Árbitros
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {referee.name}
        </h1>
      </div>
      <RefereeForm
        refereeId={referee.id}
        sports={sports}
        initial={{
          name: referee.name,
          role: referee.role,
          cpf: referee.cpf ? formatCpf(referee.cpf) : "",
          email: referee.email ?? "",
          phone: referee.phone ?? "",
          licenseNumber: referee.licenseNumber ?? "",
          licenseEntity: referee.licenseEntity ?? "",
          sportIds: referee.sports.map((s) => s.sport.id),
        }}
      />
    </div>
  );
}
