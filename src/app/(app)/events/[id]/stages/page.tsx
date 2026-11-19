import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import {
  getEventForStages,
  isSupportedStage,
  listRuns,
} from "@/lib/competition/queries";
import { STAGE_STATUS_LABELS } from "@/lib/competition/format";
import { STAGE_TYPE_LABELS } from "@/lib/rules/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fases | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function StagesPage({
  params,
  searchParams,
}: PageProps<"/events/[id]/stages">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const { category } = await searchParams;
  const event = user.organization
    ? await getEventForStages(user.organization.id, id)
    : null;
  if (!event) notFound();

  const selected =
    event.categories.find((c) => c.id === category) ?? event.categories[0];
  const runs = await listRuns(event.id);
  const runOf = (stageId: string) =>
    runs.find((r) => r.stageId === stageId && r.categoryId === selected?.id);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Fases
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Sorteio, jogos, resultados e classificação. Cada categoria joga as
          fases por conta própria.
        </p>
      </div>

      {event.stages.length === 0 ? (
        <div className="liquid-card flex flex-col items-start gap-4 rounded-xl p-8">
          <p className="text-muted-foreground">
            As fases ainda não foram definidas. Configure as regras do evento
            primeiro.
          </p>
          <Link href={`/events/${event.id}/rules`} className={buttonVariants()}>
            Configurar regras
          </Link>
        </div>
      ) : (
        <>
          <nav aria-label="Categorias" className="flex flex-wrap gap-2">
            {event.categories.map((c) => (
              <Link
                key={c.id}
                href={`/events/${event.id}/stages?category=${c.id}`}
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
                <span className="ml-2 text-xs opacity-80 tabular-nums">
                  {c._count.registrations}
                </span>
              </Link>
            ))}
          </nav>

          <div>
            <Link
              href={`/events/${event.id}/stages/bracket?category=${selected?.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Ver chaveamento completo
            </Link>
          </div>

          <ol className="flex flex-col gap-3">
            {event.stages.map((stage) => {
              const run = runOf(stage.id);
              const status = run ? run.status : "NONE";
              const supported = isSupportedStage(stage.type);
              return (
                <li key={stage.id}>
                  <Link
                    href={`/events/${event.id}/stages/${stage.id}?category=${selected?.id}`}
                    aria-disabled={!supported}
                    className="liquid-card flex items-center gap-4 rounded-xl p-4 no-underline transition-colors hover:border-primary/50"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-display text-lg font-bold tabular-nums">
                      {stage.order}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{stage.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {STAGE_TYPE_LABELS[stage.type].label}
                        {run
                          ? ` · ${run._count.entries} participantes · ${run._count.matches} jogos · ${run.matches.length} com resultado`
                          : ""}
                      </span>
                    </span>
                    {supported ? (
                      <Badge
                        variant={status === "NONE" ? "outline" : "secondary"}
                      >
                        {STAGE_STATUS_LABELS[status]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Em breve</Badge>
                    )}
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
