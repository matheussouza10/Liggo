import { isCombatSport } from "@/lib/competition/win-method";
import { perfConfigOf } from "@/lib/competition/performance";
import { buildPerfView } from "@/lib/competition/performance-view";
import { seriesConfigOf } from "@/lib/competition/series";
import { setsConfigOf } from "@/lib/competition/sets";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StageBoard } from "@/components/competition/stage-board";
import { StagePairingsConfig } from "@/components/competition/stage-pairings-config";
import { pairingSchema } from "@/lib/rules/schema";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import {
  getAssignableReferees,
  getEventForStages,
  getRunDetail,
  isSupportedStage,
  runTables,
  standingsRules,
} from "@/lib/competition/queries";
import { toRunView } from "@/lib/competition/view";
import { prisma } from "@/lib/prisma";
import { registrationName } from "@/lib/registrations/queries";
import { STAGE_TYPE_LABELS } from "@/lib/rules/catalog";

export const metadata: Metadata = {
  title: "Fase | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function StagePage({
  params,
  searchParams,
}: PageProps<"/events/[id]/stages/[stageId]">) {
  const user = await requireOrganizationUser();
  const { id, stageId } = await params;
  const { category: categoryParam } = await searchParams;
  const event = user.organization
    ? await getEventForStages(user.organization.id, id)
    : null;
  if (!event || !user.organization) notFound();

  const stage = event.stages.find((s) => s.id === stageId);
  const category =
    event.categories.find((c) => c.id === categoryParam) ?? event.categories[0];
  if (!stage || !category) notFound();

  const combat = isCombatSport(event.sport.category.name);
  const rules = standingsRules(event);
  const supported = isSupportedStage(stage.type);
  const run = supported ? await getRunDetail(stage.id, category.id) : null;
  const tables =
    run && rules ? runTables(run, rules) : { tables: [], ignored: [] };
  const stageIndex = event.stages.findIndex((s) => s.id === stage.id);
  const view = run
    ? toRunView(
        run,
        tables.tables,
        tables.ignored,
        stage.type,
        event.stages[stageIndex - 1]?.name ?? null,
        combat && !stage.thirdPlaceMatch,
      )
    : null;

  const perfConfig = perfConfigOf(event.rules);
  const performance =
    run && stage.type === "PERFORMANCE" && perfConfig && event.rules
      ? buildPerfView(run, perfConfig, event.rules)
      : null;

  const registrations = !run
    ? await prisma.registration.findMany({
        where: { eventId: event.id, categoryId: category.id },
        include: {
          team: { select: { name: true } },
          members: { include: { athlete: { select: { name: true } } } },
        },
      })
    : [];
  const candidates = registrations
    .map((r) => ({
      id: r.id,
      name: registrationName(r),
      seed: null as number | null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const referees = await getAssignableReferees(
    user.organization.id,
    event.sportId,
  );

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}/stages?category=${category.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Fases
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {stage.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">
            {STAGE_TYPE_LABELS[stage.type].label}
          </Badge>
          <Badge variant="secondary">{category.name}</Badge>
        </div>
      </div>

      {!supported ? (
        <p className="liquid-card rounded-xl p-8 text-muted-foreground">
          Este tipo de fase ({STAGE_TYPE_LABELS[stage.type].label}) ainda não
          está disponível para execução.
        </p>
      ) : !event.rules ? (
        <p className="liquid-card rounded-xl p-8 text-muted-foreground">
          Configure as regras do evento para executar as fases.
        </p>
      ) : (
        <StageBoard
          eventId={event.id}
          stage={{
            id: stage.id,
            type: stage.type as
              | "ROUND_ROBIN"
              | "GROUPS"
              | "SINGLE_ELIM"
              | "DOUBLE_ELIM"
              | "SWISS"
              | "PERFORMANCE",
            swissRounds: stage.swissRounds,
            groupCount: stage.groupCount,
            advancingPerGroup: stage.advancingPerGroup,
            seeding: stage.seeding,
          }}
          categoryId={category.id}
          view={view}
          candidates={candidates}
          referees={referees
            .filter((r) => r.role === "REFEREE")
            .map((r) => ({ id: r.id, name: r.name }))}
          penalties={event.rules.penalties}
          setsConfig={setsConfigOf(event.rules)}
          series={
            stage.type === "SINGLE_ELIM" || stage.type === "DOUBLE_ELIM"
              ? seriesConfigOf(event.rules)
              : null
          }
          performance={performance}
          combat={combat}
          eventStart={event.startDate.toISOString().slice(0, 10)}
          isFirstStage={stageIndex === 0}
          hasNextStage={stageIndex < event.stages.length - 1}
          pairingsConfig={
            stage.type === "SINGLE_ELIM" && stageIndex > 0 ? (
              <StagePairingsConfig
                eventId={event.id}
                stageId={stage.id}
                stages={event.stages.map((x) => ({
                  name: x.name,
                  type: x.type,
                  groupCount: x.groupCount,
                  advancingPerGroup: x.advancingPerGroup,
                }))}
                index={stageIndex}
                saved={
                  stage.pairings
                    ? (z.array(pairingSchema).safeParse(stage.pairings).data ??
                      null)
                    : null
                }
              />
            ) : undefined
          }
        />
      )}
    </div>
  );
}
