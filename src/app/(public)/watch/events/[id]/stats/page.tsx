import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/public/auto-refresh";
import { EventStatsView } from "@/components/stats/event-stats-view";
import { buttonVariants } from "@/components/ui/button";
import { getEventStats } from "@/lib/competition/stats-page";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Estatísticas | Liggo" };
export const instant = false;

export default async function PublicStatsPage({
  params,
  searchParams,
}: PageProps<"/watch/events/[id]/stats">) {
  await connection();
  const { id } = await params;
  const { category } = await searchParams;
  const result = await getEventStats(
    id,
    typeof category === "string" ? category : undefined,
    { publicOnly: true },
  );
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={20} />
      <div>
        <Link
          href={`/watch/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {result.eventName}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Estatísticas
        </h1>
      </div>
      {result.categories.length > 1 ? (
        <nav aria-label="Categorias" className="flex flex-wrap gap-2">
          {result.categories.map((c) => (
            <Link
              key={c.id}
              href={`/watch/events/${id}/stats?category=${c.id}`}
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
