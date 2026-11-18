import { PlusIcon, ShieldIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TeamsList, type TeamRow } from "@/components/people/teams-list";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { listTeams } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Times | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function TeamsPage() {
  const user = await requireOrganizationUser();
  const teams = user.organization ? await listTeams(user.organization.id) : [];
  const rows: TeamRow[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? "",
    place: [t.city, t.state].filter(Boolean).join(" - "),
    color: t.color,
    active: t.active,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
            Times
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Os times da sua organização. O elenco é escolhido em cada inscrição,
            não aqui.
          </p>
        </div>
        <Link
          href="/teams/new"
          className={buttonVariants({ size: "lg" }) + " h-11"}
        >
          <PlusIcon data-icon="inline-start" />
          Novo time
        </Link>
      </div>
      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum time ainda</EmptyTitle>
            <EmptyDescription>
              Cadastre os times que vão participar dos seus eventos.
            </EmptyDescription>
          </EmptyHeader>
          <Link href="/teams/new" className={buttonVariants()}>
            Cadastrar time
          </Link>
        </Empty>
      ) : (
        <TeamsList rows={rows} />
      )}
    </div>
  );
}
