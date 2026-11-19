import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BracketTree } from "@/components/competition/bracket-tree";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getBracket } from "@/lib/competition/bracket-data";
import { getEventForStages } from "@/lib/competition/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Chaveamento | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function BracketPage({
  params,
  searchParams,
}: PageProps<"/events/[id]/stages/bracket">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const { category } = await searchParams;
  const event = user.organization
    ? await getEventForStages(user.organization.id, id)
    : null;
  if (!event) notFound();
  const selected =
    event.categories.find((c) => c.id === category) ?? event.categories[0];
  const data = selected
    ? await getBracket(event.stages, selected.id)
    : { columns: [], third: null, note: null };

  return (
    <div className="flex max-w-full flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}/stages?category=${selected?.id ?? ""}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Fases
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Chaveamento
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          O mata-mata de ponta a ponta, das primeiras rodadas até a final.
          Clique em um jogo para lançar os lances.
        </p>
      </div>
      <nav aria-label="Categorias" className="flex flex-wrap gap-2">
        {event.categories.map((c) => (
          <Link
            key={c.id}
            href={`/events/${event.id}/stages/bracket?category=${c.id}`}
            aria-current={c.id === selected?.id ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: c.id === selected?.id ? "default" : "outline",
                size: "sm",
              }),
              "h-9",
            )}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <BracketTree
        data={data}
        href={(matchId) => `/events/${event.id}/matches/${matchId}`}
      />
    </div>
  );
}
