"use client";

import { SaveIcon, TriangleAlertIcon, WandSparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { savePairingsAction } from "@/lib/competition/actions";
import { seedOrder } from "@/lib/competition/bracket";
import { assignSlot } from "@/lib/competition/pairings";
import type { EntryView } from "@/lib/competition/view";
import { useAction } from "./use-action";

/**
 * Who plays whom in a knockout stage. The entries come in bracket order:
 * game 1 is slots 1 and 2, game 2 is slots 3 and 4... Picking someone for a
 * slot swaps them with whoever was there.
 */
export function PairingsEditor({
  eventId,
  runId,
  entries,
  manual,
  canReset,
  onDirtyChange,
}: {
  eventId: string;
  runId: string;
  entries: EntryView[];
  manual: boolean;
  canReset: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  // What the system would play: by bracket position when the stage follows a
  // knockout stage (or you already chose), otherwise seed against seed
  // (1st against the last, 2nd against the one before...).
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const adjacentDefault = entries.some((e) => e.fromMatch);
  const display =
    manual || adjacentDefault || !isPowerOfTwo(sorted.length)
      ? sorted
      : seedOrder(sorted.length).map((seed) => sorted[seed - 1]);
  const initial = display.map((e) => e.id);
  const saved = initial.join();
  const [order, setOrder] = useState(initial);
  const dirty = order.join() !== saved;
  const { pending, error, run } = useAction();
  const byId = new Map(entries.map((e) => [e.id, e]));

  // New data from the server (after saving or resetting) replaces the draft.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setOrder(initial);
  }
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const label = (e: EntryView) =>
    e.origin ? `${e.origin} · ${e.name}` : e.name;

  if (!isPowerOfTwo(entries.length)) {
    return (
      <p className="liquid-card rounded-xl p-5 text-sm text-muted-foreground">
        Há um número ímpar de participantes: a chave é montada automaticamente e
        os cabeças de chave avançam direto na rodada.
      </p>
    );
  }

  const games = Array.from({ length: order.length / 2 }, (_, i) => i);
  return (
    <section aria-label="Confrontos" className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
          Confrontos
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha quem enfrenta quem em cada jogo. Ao trocar um time de lugar,
          quem estava ali vai para o lugar dele. O jogo 1 é o do topo da chave.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {games.map((g) => {
          const a = byId.get(order[2 * g]);
          const b = byId.get(order[2 * g + 1]);
          const rematch =
            a && b && a.origin && b.origin && sameGroup(a.origin, b.origin);
          return (
            <li
              key={g}
              className="liquid-card flex flex-col gap-2 rounded-xl p-4"
              data-testid={`pairing-${g + 1}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Jogo {g + 1}</span>
                {rematch ? (
                  <Badge variant="outline" className="gap-1">
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                    Mesmo grupo da fase anterior
                  </Badge>
                ) : null}
              </div>
              {[0, 1].map((side) => {
                const slot = 2 * g + side;
                return (
                  <NativeSelect
                    key={side}
                    aria-label={`Jogo ${g + 1}, ${side === 0 ? "primeiro" : "segundo"} time`}
                    className="w-full"
                    value={order[slot]}
                    onChange={(e) =>
                      setOrder(assignSlot(order, slot, e.target.value))
                    }
                    disabled={pending}
                  >
                    {entries.map((e) => (
                      <NativeSelectOption key={e.id} value={e.id}>
                        {label(e)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                );
              })}
            </li>
          );
        })}
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!dirty || pending}
          onClick={() => run(() => savePairingsAction(eventId, runId, order))}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Salvar confrontos
        </Button>
        {canReset && (manual || dirty) ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => savePairingsAction(eventId, runId, null))}
          >
            <WandSparklesIcon data-icon="inline-start" />
            Voltar ao automático
          </Button>
        ) : null}
        {dirty ? (
          <span className="text-sm text-muted-foreground">
            Salve os confrontos antes de gerar os jogos.
          </span>
        ) : manual ? (
          <Badge variant="secondary">Confrontos definidos por você</Badge>
        ) : (
          <Badge variant="outline">Automático</Badge>
        )}
      </div>
    </section>
  );
}

const sameGroup = (a: string, b: string) => {
  const ga = a.match(/Grupo ([A-Z])/)?.[1];
  const gb = b.match(/Grupo ([A-Z])/)?.[1];
  return !!ga && ga === gb;
};

const isPowerOfTwo = (n: number) => n >= 2 && (n & (n - 1)) === 0;
