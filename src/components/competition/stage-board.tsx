"use client";

import { CheckCheckIcon, TrophyIcon, Undo2Icon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  completeStageAction,
  resetMatchesAction,
} from "@/lib/competition/actions";
import type { DrawEntryProps } from "@/lib/competition/types";
import type { MatchView, RunView } from "@/lib/competition/view";
import { BracketView } from "./bracket-view";
import { DrawPanel } from "./draw-panel";
import { DrawReveal } from "./draw-reveal";
import { MatchesPanel } from "./matches-panel";
import { ParticipantsPanel } from "./participants-panel";
import { StandingsTables } from "./standings-tables";
import { useAction } from "./use-action";

type Tab = "participants" | "matches" | "table";

export function StageBoard({
  eventId,
  stage,
  categoryId,
  view,
  candidates,
  referees,
  penalties,
  eventStart,
  isFirstStage,
  hasNextStage,
  pairingsConfig,
}: {
  eventId: string;
  stage: {
    id: string;
    type: "ROUND_ROBIN" | "GROUPS" | "SINGLE_ELIM";
    advancingPerGroup: number | null;
    seeding: DrawEntryProps["defaultMode"];
  };
  categoryId: string;
  view: RunView | null;
  candidates: DrawEntryProps["candidates"];
  referees: { id: string; name: string }[];
  penalties: boolean;
  eventStart: string;
  isFirstStage: boolean;
  hasNextStage: boolean;
  pairingsConfig?: React.ReactNode;
}) {
  const knockout = stage.type === "SINGLE_ELIM";
  const isGroups = stage.type === "GROUPS";
  const hasMatches = !!view && view.matches.length > 0;
  const [tab, setTab] = useState<Tab>(hasMatches ? "matches" : "participants");
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
      {view?.champion ? (
        <Alert>
          <TrophyIcon />
          <AlertTitle>
            {knockout ? "Campeão" : "Líder"}: {view.champion}
          </AlertTitle>
          <AlertDescription>
            {knockout ? "A final foi decidida." : "Fase concluída."}
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
            />
          </TabsContent>

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
                live={!!live}
                eventStart={eventStart}
                openMatch={bracketMatch}
                onCloseMatch={() => setBracketMatch(null)}
              />
            </TabsContent>
          ) : null}

          {hasMatches ? (
            <TabsContent value="table" className="pt-4">
              {knockout ? (
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

      {live && hasMatches ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={!allPlayed || pending}
            onClick={() => run(() => completeStageAction(eventId, view.id))}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckCheckIcon data-icon="inline-start" />
            )}
            {hasNextStage ? "Concluir fase e avançar" : "Concluir fase"}
          </Button>
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
