import { GavelIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  RefereesList,
  type RefereeRow,
} from "@/components/people/referees-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { REFEREE_ROLE_LABELS } from "@/lib/people/format";
import { listReferees } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Árbitros | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function RefereesPage() {
  const user = await requireOrganizationUser();
  const referees = user.organization
    ? await listReferees(user.organization.id)
    : [];
  const rows: RefereeRow[] = referees.map((r) => ({
    id: r.id,
    name: r.name,
    roleLabel: REFEREE_ROLE_LABELS[r.role],
    sports: r.sports.map((s) => s.sport.name),
    license: [r.licenseNumber, r.licenseEntity].filter(Boolean).join(" · "),
    active: r.active,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Árbitros
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Árbitros, juízes, auxiliares e mesários que atuam nos seus eventos.
          </p>
        </div>
        <Link
          href="/referees/new"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          <PlusIcon data-icon="inline-start" />
          Novo árbitro
        </Link>
      </div>
      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GavelIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum árbitro ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre quem apita ou julga as partidas dos seus eventos.
            </EmptyDescription>
          </EmptyHeader>
          <Link href="/referees/new" className={buttonVariants()}>
            Cadastrar árbitro
          </Link>
        </Empty>
      ) : (
        <RefereesList rows={rows} />
      )}
    </div>
  );
}
