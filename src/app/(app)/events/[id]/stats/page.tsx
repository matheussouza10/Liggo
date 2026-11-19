import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventStatsView } from "@/components/stats/event-stats-view";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEventStats } from "@/lib/competition/stats-page";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Estatísticas | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function StatsPage({
  params,
  searchParams,
}: PageProps<"/events/[id]/stats">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const { category } = await searchParams;
  const result = user.organization
    ? await getEventStats(
        id,
        typeof category === "string" ? category : undefined,
        {
          organizationId: user.organization.id,
        },
      )
    : null;
  if (!result) notFound();

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {result.eventName}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Estatísticas
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Artilharia, cartões, faltas e posse de bola de todos os jogos, a
          partir dos lances lançados.
        </p>
      </div>
      {result.categories.length > 1 ? (
        <nav aria-label="Categorias" className="flex flex-wrap gap-2">
          {result.categories.map((c) => (
            <Link
              key={c.id}
              href={`/events/${id}/stats?category=${c.id}`}
              aria-current={c.id === result.selectedId ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: c.id === result.selectedId ? "default" : "outline",
                  size: "sm",
                }),
                "h-9",
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      <EventStatsView data={result.overview} />
    </div>
  );
}
