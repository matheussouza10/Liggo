"use client";

import { SwordsIcon, Undo2Icon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  generateMatchesAction,
  moveEntryAction,
  resetRunAction,
} from "@/lib/competition/actions";
import { DRAW_MODE_LABELS } from "@/lib/competition/format";
import type { RunView } from "@/lib/competition/view";
import { DrawPanel } from "./draw-panel";
import { PairingsEditor } from "./pairings-editor";
import { useAction } from "./use-action";

export function ParticipantsPanel({
  eventId,
  runId,
  run,
  isGroups,
  isKnockout,
  canRedraw,
  drawProps,
}: {
  eventId: string;
  runId: string;
  run: RunView;
  isGroups: boolean;
  isKnockout: boolean;
  canRedraw: boolean;
  drawProps: React.ComponentProps<typeof DrawPanel>;
}) {
  const { pending, error, run: act } = useAction();
  const [confirmReset, setConfirmReset] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editable = run.status === "DRAWN";
  const unassigned = run.entries.filter((e) => !e.groupId);

  const columns = isGroups
    ? run.groups.map((g) => ({
        id: g.id as string | null,
        name: g.name,
        entries: run.entries.filter((e) => e.groupId === g.id),
      }))
    : [{ id: null, name: "Participantes", entries: run.entries }];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{run.entries.length} participantes</Badge>
        {run.entries.some((e) => e.origin) ? null : (
          <span>Sorteio: {DRAW_MODE_LABELS[run.drawMode]}.</span>
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {isGroups && unassigned.length > 0 ? (
        <section aria-label="Sem grupo" className="liquid-card rounded-xl p-4">
          <h3 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
            Sem grupo ({unassigned.length})
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {unassigned.map((e) => (
              <MoveRow
                key={e.id}
                eventId={eventId}
                entryId={e.id}
                name={e.name}
                seed={e.seed}
                groupId={null}
                groups={run.groups}
                editable={editable}
                onError={act}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {isKnockout && editable ? (
        <PairingsEditor
          eventId={eventId}
          runId={runId}
          entries={run.entries}
          manual={run.manualPairing}
          canReset={run.entries.every((e) => e.seed != null) && !canRedraw}
          onDirtyChange={setDirty}
        />
      ) : (
        <div
          className={isGroups ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : ""}
        >
          {columns.map((c) => (
            <section
              key={c.id ?? "all"}
              aria-label={c.name}
              className="liquid-card rounded-xl p-4"
            >
              <h3 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
                {c.name}{" "}
                <span className="text-sm font-normal text-muted-foreground normal-case">
                  ({c.entries.length})
                </span>
              </h3>
              <ul
                className={
                  isGroups
                    ? "mt-3 flex flex-col gap-2"
                    : "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {c.entries.map((e) =>
                  isGroups ? (
                    <MoveRow
                      key={e.id}
                      eventId={eventId}
                      entryId={e.id}
                      name={e.name}
                      seed={e.seed}
                      groupId={e.groupId}
                      groups={run.groups}
                      editable={editable}
                      onError={act}
                    />
                  ) : (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{e.name}</span>
                        {e.origin ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {e.origin}
                          </span>
                        ) : null}
                      </span>
                      {e.seed != null && !e.origin ? (
                        <Badge variant="outline">Cabeça {e.seed}</Badge>
                      ) : null}
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editable ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={pending || dirty}
            onClick={() => act(() => generateMatchesAction(eventId, runId))}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SwordsIcon data-icon="inline-start" />
            )}
            Gerar jogos
          </Button>
          {canRedraw ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setRedrawing(!redrawing)}
            >
              Sortear de novo
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="ml-auto h-11"
            onClick={() => setConfirmReset(true)}
          >
            <Undo2Icon data-icon="inline-start" />
            Desfazer sorteio
          </Button>
        </div>
      ) : null}

      {redrawing && canRedraw ? (
        <section className="rounded-xl border p-5">
          <DrawPanel {...drawProps} redraw />
        </section>
      ) : null}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer o sorteio?</AlertDialogTitle>
            <AlertDialogDescription>
              Os grupos e os jogos desta fase são apagados. As inscrições
              continuam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => act(() => resetRunAction(eventId, runId))}
            >
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MoveRow({
  eventId,
  entryId,
  name,
  seed,
  groupId,
  groups,
  editable,
  onError,
}: {
  eventId: string;
  entryId: string;
  name: string;
  seed: number | null;
  groupId: string | null;
  groups: { id: string; name: string }[];
  editable: boolean;
  onError: ReturnType<typeof useAction>["run"];
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{name}</span>
        {seed != null ? <Badge variant="outline">{seed}</Badge> : null}
      </span>
      {editable ? (
        <NativeSelect
          aria-label={`Grupo de ${name}`}
          className="w-28"
          value={groupId ?? ""}
          onChange={(e) =>
            onError(() =>
              moveEntryAction(eventId, entryId, e.target.value || null),
            )
          }
        >
          <NativeSelectOption value="">Sem grupo</NativeSelectOption>
          {groups.map((g) => (
            <NativeSelectOption key={g.id} value={g.id}>
              {g.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
    </li>
  );
}
