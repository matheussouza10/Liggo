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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
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
        {event.stages.some((x) => x.type === "SINGLE_ELIM") ? (
          <Link
            href={`/events/${event.id}/stages/bracket?category=${selected?.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Ver chaveamento completo
          </Link>
        ) : null}
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

          {(() => {
            const mine = runs.filter((r) => r.categoryId === selected?.id);
            const total = mine.reduce((t, r) => t + r._count.matches, 0);
            const played = mine.reduce((t, r) => t + r.matches.length, 0);
            const done = mine.filter((r) => r.status === "DONE").length;
            const percent = total > 0 ? Math.round((played / total) * 100) : 0;
            return (
              <dl
                aria-label="Resumo da categoria"
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {[
                  [
                    "Participantes",
                    String(selected?._count.registrations ?? 0),
                  ],
                  ["Fases concluídas", `${done} de ${event.stages.length}`],
                  [
                    "Jogos disputados",
                    total === 0 ? "Nenhum ainda" : `${played} de ${total}`,
                  ],
                  ["Progresso", `${percent}%`],
                ].map(([label, value]) => (
                  <div key={label} className="liquid-card rounded-xl px-4 py-3">
                    <dt className="text-xs tracking-wider text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl leading-none font-bold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            );
          })()}

          <ol className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {event.stages.map((stage) => {
              const run = runOf(stage.id);
              const status = run ? run.status : "NONE";
              const supported = isSupportedStage(stage.type);
              const total = run?._count.matches ?? 0;
              const played = run?.matches.length ?? 0;
              const percent =
                total > 0
                  ? Math.round((played / total) * 100)
                  : status === "DONE"
                    ? 100
                    : 0;
              return (
                <li key={stage.id}>
                  <Link
                    href={`/events/${event.id}/stages/${stage.id}?category=${selected?.id}`}
                    aria-disabled={!supported}
                    aria-label={`${stage.name}: ${STAGE_STATUS_LABELS[status]}`}
                    className="liquid-card group flex h-full flex-col gap-4 rounded-xl p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-primary/50"
                  >
                    <span className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 font-display text-xl font-bold text-primary tabular-nums">
                        {stage.order}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-semibold">
                          {stage.name}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {STAGE_TYPE_LABELS[stage.type].label}
                        </span>
                      </span>
                      {supported ? (
                        <Badge
                          variant={
                            status === "NONE"
                              ? "outline"
                              : status === "DONE"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {STAGE_STATUS_LABELS[status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Em breve</Badge>
                      )}
                    </span>

                    {run ? (
                      <>
                        <span className="grid grid-cols-3 gap-2 text-center">
                          {[
                            ["Participantes", run._count.entries],
                            ["Jogos", total],
                            ["Com resultado", played],
                          ].map(([label, value]) => (
                            <span
                              key={label}
                              className="rounded-lg bg-white/5 px-2 py-2"
                            >
                              <span className="block font-display text-2xl leading-none font-bold tabular-nums">
                                {value}
                              </span>
                              <span className="mt-1 block text-[11px] text-muted-foreground">
                                {label}
                              </span>
                            </span>
                          ))}
                        </span>
                        <span
                          className="h-1.5 overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                          aria-label="Progresso da fase"
                          aria-valuenow={percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span
                            className="block h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      </>
                    ) : (
                      <span className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-sm text-muted-foreground">
                        {stage.order === 1
                          ? "Abra a fase para sortear os participantes."
                          : "Começa quando a fase anterior for concluída."}
                      </span>
                    )}

                    <span className="mt-auto flex items-center justify-end gap-1 text-sm font-medium text-primary">
                      Abrir fase
                      <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
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
