import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AthleteHistoryView } from "@/components/people/athlete-history-view";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getAthleteHistory } from "@/lib/people/history";
import { getAthleteForOrganization } from "@/lib/people/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Histórico do atleta | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AthleteHistoryPage({
  params,
}: PageProps<"/athletes/[id]/history">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  // Same rule as the athlete page: only athletes linked to the organization.
  const found = user.organization
    ? await getAthleteForOrganization(user.organization.id, id)
    : null;
  if (!found || !user.organization) notFound();
  const history = await getAthleteHistory(user.organization.id, id);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/athletes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Atletas
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {found.athlete.name}
        </h1>
        <nav aria-label="Seções do atleta" className="mt-4 flex gap-2">
          <Link
            href={`/athletes/${id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-9",
            )}
          >
            Dados
          </Link>
          <Link
            href={`/athletes/${id}/history`}
            aria-current="page"
            className={cn(buttonVariants({ size: "sm" }), "h-9")}
          >
            Histórico
          </Link>
        </nav>
      </div>
      <AthleteHistoryView history={history} />
    </div>
  );
}
