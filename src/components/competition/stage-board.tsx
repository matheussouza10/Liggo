"use client";

import {
  CheckCheckIcon,
  SwordsIcon,
  TrophyIcon,
  Undo2Icon,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  completeStageAction,
  generateNextRoundAction,
  resetMatchesAction,
} from "@/lib/competition/actions";
import type { PerfView } from "@/lib/competition/performance-view";
import type { SeriesConfig } from "@/lib/competition/series";
import type { SetsConfig } from "@/lib/competition/sets";
import type { DrawEntryProps } from "@/lib/competition/types";
import type { MatchView, RunView } from "@/lib/competition/view";
import { BracketView } from "./bracket-view";
import { DoubleBracketView } from "./double-bracket-view";
import { DrawPanel } from "./draw-panel";
import { DrawReveal } from "./draw-reveal";
import { MatchesPanel } from "./matches-panel";
import { PerformancePanel } from "./performance-panel";
import { ParticipantsPanel } from "./participants-panel";
import { StandingsTables } from "./standings-tables";
import { useAction } from "./use-action";

type Tab = "participants" | "matches" | "table" | "results";

export function StageBoard({
  eventId,
  stage,
  categoryId,
  view,
  candidates,
  referees,
  penalties,
  setsConfig,
  series,
  performance,
  combat,
  eventStart,
  isFirstStage,
  hasNextStage,
  pairingsConfig,
}: {
  eventId: string;
  stage: {
    id: string;
    type:
      | "ROUND_ROBIN"
      | "GROUPS"
      | "SINGLE_ELIM"
      | "DOUBLE_ELIM"
      | "SWISS"
      | "PERFORMANCE";
    swissRounds: number | null;
    groupCount: number | null;
    advancingPerGroup: number | null;
    seeding: DrawEntryProps["defaultMode"];
  };
  categoryId: string;
  view: RunView | null;
  candidates: DrawEntryProps["candidates"];
  referees: { id: string; name: string }[];
  penalties: boolean;
  setsConfig: SetsConfig | null;
  series: SeriesConfig | null;
  /** Ranking of a performance event (null for the other stage types). */
  performance: PerfView | null;
  /** Combat sport: record how each match was won. */
  combat: boolean;
  eventStart: string;
  isFirstStage: boolean;
  hasNextStage: boolean;
  pairingsConfig?: React.ReactNode;
}) {
  const double = stage.type === "DOUBLE_ELIM";
  const knockout = stage.type === "SINGLE_ELIM" || double;
  // A performance event split in heats uses the same group screens (Bateria 1, 2...).
  const isGroups =
    stage.type === "GROUPS" ||
    (stage.type === "PERFORMANCE" && (stage.groupCount ?? 0) >= 2);
  const hasMatches = !!view && view.matches.length > 0;
  const perf = stage.type === "PERFORMANCE";
  const perfStarted = perf && !!view && view.status !== "DRAWN";
  const [tab, setTab] = useState<Tab>(
    perfStarted ? "results" : hasMatches ? "matches" : "participants",
  );
  // Starting the event opens the results.
  const [hadPerfStarted, setHadPerfStarted] = useState(perfStarted);
  if (perfStarted !== hadPerfStarted) {
    setHadPerfStarted(perfStarted);
    setTab(perfStarted ? "results" : "participants");
  }
  const [bracketMatch, setBracketMatch] = useState<MatchView | null>(null);
  // Once the matches are generated the organizer wants to see them.
  const [hadMatches, setHadMatches] = useState(hasMatches);
  if (hasMatches !== hadMatches) {
    setHadMatches(hasMatches);
    if (hasMatches) setTab("matches");
  }
  // Set when a draw is saved: the reveal starts once the NEW participants
  // arrive, so it never replays stale data (the ids change on every draw).
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const signature = (v: RunView | null) =>
    v ? v.entries.map((e) => e.id).join(",") : "";
  const awaitingData = pendingSig !== null && signature(view) === pendingSig;
  const revealing = pendingSig !== null && !!view && !awaitingData;
  const { pending, error, run } = useAction();
  const swiss = stage.type === "SWISS";
  // Swiss: rounds are generated one at a time, from the standings.
  const currentRound = view?.matches.length
    ? Math.max(...view.matches.map((m) => m.round))
    : 0;
  const totalRounds = stage.swissRounds ?? 0;
  const allRoundsGenerated = !swiss || currentRound >= totalRounds;

  const live = view?.status === "LIVE";
  const allPlayed =
    hasMatches && view.matches.every((m) => m.status !== "SCHEDULED");
  const drawProps = {
    onDrawn: (mode: string) =>
      // Nothing to reveal for a manual draw, or for people who asked for less motion.
      setPendingSig(
        mode !== "MANUAL" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? signature(view)
          : null,
      ),
    eventId,
    stageId: stage.id,
    categoryId,
    isGroups,
    defaultMode: stage.seeding,
    candidates,
    redraw: false,
  };

  return (
    <div className="flex flex-col gap-5">
      {perf &&
      view?.status === "DONE" &&
      performance?.rows[0]?.status === "OK" ? (
        <Alert>
          <TrophyIcon />
          <AlertTitle>
            Vencedor: {performance.rows[0].name} ({performance.rows[0].value})
          </AlertTitle>
          <AlertDescription>Prova concluída.</AlertDescription>
        </Alert>
      ) : null}

      {view?.champion ? (
        <Alert>
          <TrophyIcon />
          <AlertTitle>
            {knockout ? "Campeão" : "Líder"}: {view.champion}
          </AlertTitle>
          <AlertDescription>
            {view.podium.length > 1 ? (
              <span data-testid="podium">
                {view.podium
                  .map(
                    (p) =>
                      `${p.place}º ${p.name}${p.note ? ` (${p.note})` : ""}`,
                  )
                  .join(" · ")}
              </span>
            ) : knockout ? (
              "A final foi decidida."
            ) : (
              "Fase concluída."
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {awaitingData ? (
        <p
          role="status"
          className="liquid-card rounded-xl p-8 text-center text-muted-foreground"
        >
          Preparando o sorteio…
        </p>
      ) : revealing && view ? (
        <DrawReveal
          entries={view.entries}
          groups={view.groups}
          onFinish={() => {
            setPendingSig(null);
            setTab("participants");
          }}
        />
      ) : !view ? (
        isFirstStage ? (
          <section className="liquid-card rounded-xl p-5">
            <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
              Sorteio
            </h2>
            <p className="mt-2 mb-5 text-sm text-muted-foreground">
              {candidates.length} inscrições nesta categoria vão participar.
            </p>
            <DrawPanel {...drawProps} />
          </section>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
              Esta fase começa quando a fase anterior for concluída: os
              classificados entram aqui automaticamente.
            </p>
            {pairingsConfig}
          </div>
        )
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="participants" className="px-4 py-2">
              Participantes
            </TabsTrigger>
            {perfStarted && performance ? (
              <TabsTrigger value="results" className="px-4 py-2">
                Resultados
              </TabsTrigger>
            ) : null}
            {hasMatches ? (
              <TabsTrigger value="matches" className="px-4 py-2">
                Jogos
              </TabsTrigger>
            ) : null}
            {hasMatches ? (
              <TabsTrigger value="table" className="px-4 py-2">
                {knockout ? "Chave" : "Classificação"}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="participants" className="pt-4">
            <ParticipantsPanel
              eventId={eventId}
              runId={view.id}
              run={view}
              isGroups={isGroups}
              isKnockout={knockout}
              canRedraw={isFirstStage}
              drawProps={drawProps}
              startLabel={perf ? "Iniciar prova" : "Gerar jogos"}
            />
          </TabsContent>

          {perfStarted && performance ? (
            <TabsContent value="results" className="pt-4">
              <PerformancePanel
                eventId={eventId}
                view={performance}
                editable={live}
              />
            </TabsContent>
          ) : null}

          {hasMatches ? (
            <TabsContent value="matches" className="pt-4">
              <MatchesPanel
                eventId={eventId}
                runId={view.id}
                matches={view.matches}
                groups={view.groups}
                referees={referees}
                knockout={knockout}
                penalties={penalties}
                setsConfig={setsConfig}
                series={series}
                recordMethod={combat}
                live={!!live}
                eventStart={eventStart}
                openMatch={bracketMatch}
                onCloseMatch={() => setBracketMatch(null)}
              />
            </TabsContent>
          ) : null}

          {hasMatches ? (
            <TabsContent value="table" className="pt-4">
              {double ? (
                <DoubleBracketView
                  matches={view.matches}
                  onOpen={(m) => {
                    if (!live || !m.homeId || !m.awayId) return;
                    setBracketMatch(m);
                    setTab("matches");
                  }}
                />
              ) : knockout ? (
                <BracketView
                  matches={view.matches}
                  onOpen={(m) => {
                    if (!live || !m.homeId || !m.awayId) return;
                    setBracketMatch(m);
                    setTab("matches");
                  }}
                />
              ) : (
                <StandingsTables
                  tables={view.tables}
                  ignored={view.ignored}
                  qualify={hasNextStage ? stage.advancingPerGroup : null}
                  bySets={!!setsConfig}
                />
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {perf && live ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={pending}
            onClick={() => run(() => completeStageAction(eventId, view.id))}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCheckIcon data-icon="inline-start" />
            )}
            Concluir prova
          </Button>
          <span className="text-sm text-muted-foreground">
            Só conclui quando todas as tentativas estiverem lançadas.
          </span>
        </div>
      ) : null}

      {live && hasMatches ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={!allPlayed || !allRoundsGenerated || pending}
            onClick={() => run(() => completeStageAction(eventId, view.id))}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCheckIcon data-icon="inline-start" />
            )}
            {hasNextStage ? "Concluir fase e avançar" : "Concluir fase"}
          </Button>
          {swiss && allPlayed && !allRoundsGenerated ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-11 px-5"
              disabled={pending}
              onClick={() =>
                run(() => generateNextRoundAction(eventId, view.id))
              }
            >
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SwordsIcon data-icon="inline-start" />
              )}
              Gerar próxima rodada
            </Button>
          ) : null}
          {swiss ? (
            <span
              className="text-sm text-muted-foreground"
              data-testid="swiss-progress"
            >
              Rodada {currentRound} de {totalRounds}
            </span>
          ) : null}
          {!allPlayed ? (
            <span className="text-sm text-muted-foreground">
              Faltam resultados para concluir.
            </span>
          ) : null}
          {view.results === 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto h-11"
              disabled={pending}
              onClick={() => run(() => resetMatchesAction(eventId, view.id))}
            >
              <Undo2Icon data-icon="inline-start" />
              Desfazer jogos
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
