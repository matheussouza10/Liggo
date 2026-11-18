import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AthleteForm } from "@/components/people/athlete-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatCpf } from "@/lib/people/cpf";
import { getAthleteForOrganization } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Atleta | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function AthletePage({
  params,
  searchParams,
}: PageProps<"/athletes/[id]">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const { saved } = await searchParams;
  // Only athletes linked to the user's organization are visible; anything else is a 404.
  const found = user.organization
    ? await getAthleteForOrganization(user.organization.id, id)
    : null;
  if (!found) notFound();
  const { athlete, canEdit } = found;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/athletes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Atletas
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {athlete.name}
        </h1>
      </div>
      {saved ? (
        <Alert className="max-w-3xl">
          <CheckCircle2Icon />
          <AlertTitle>Dados salvos</AlertTitle>
          <AlertDescription>
            As alterações já valem para o atleta.
          </AlertDescription>
        </Alert>
      ) : null}
      <AthleteForm
        mode="edit"
        athleteId={athlete.id}
        canEdit={canEdit}
        initial={{
          name: athlete.name,
          birthDate: athlete.birthDate.toISOString().slice(0, 10),
          gender: athlete.gender,
          cpf: athlete.cpf ? formatCpf(athlete.cpf) : "",
          email: athlete.email ?? "",
          phone: athlete.phone ?? "",
          guardianName: athlete.guardianName ?? "",
          guardianCpf: athlete.guardianCpf
            ? formatCpf(athlete.guardianCpf)
            : "",
        }}
      />
    </div>
  );
}
