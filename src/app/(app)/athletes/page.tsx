import { PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AthletesList,
  type AthleteRow,
} from "@/components/people/athletes-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { maskCpf } from "@/lib/people/cpf";
import { GENDER_LABELS, ageOn } from "@/lib/people/format";
import { listAthletes } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Atletas | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function AthletesPage() {
  const user = await requireOrganizationUser();
  const organizationId = user.organization?.id ?? "";
  const athletes = user.organization ? await listAthletes(organizationId) : [];
  const today = new Date();

  const rows: AthleteRow[] = athletes.map((a) => ({
    id: a.id,
    name: a.name,
    cpfMasked: maskCpf(a.cpf),
    age: ageOn(a.birthDate, today),
    genderLabel: GENDER_LABELS[a.gender],
    contact: a.email ?? a.phone ?? "",
    mine: a.createdByOrganizationId === organizationId,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Atletas
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Cadastro de pessoas que competem. O mesmo atleta pode participar de
            várias organizações: o CPF evita duplicar.
          </p>
        </div>
        <Link
          href="/athletes/new"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          <PlusIcon data-icon="inline-start" />
          Novo atleta
        </Link>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum atleta ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre o primeiro atleta. Se o CPF já existir em outra
              organização, você pode reaproveitar o cadastro.
            </EmptyDescription>
          </EmptyHeader>
          <Link href="/athletes/new" className={buttonVariants()}>
            Cadastrar atleta
          </Link>
        </Empty>
      ) : (
        <AthletesList rows={rows} />
      )}
    </div>
  );
}
