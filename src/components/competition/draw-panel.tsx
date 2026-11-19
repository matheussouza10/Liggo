"use client";

import { DicesIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { drawStageAction } from "@/lib/competition/actions";
import { DRAW_MODE_HELP, DRAW_MODE_LABELS } from "@/lib/competition/format";
import { useAction } from "./use-action";

type Mode = keyof typeof DRAW_MODE_LABELS;

export function DrawPanel({
  eventId,
  stageId,
  categoryId,
  isGroups,
  defaultMode,
  candidates,
  redraw,
  onDrawn,
}: {
  eventId: string;
  stageId: string;
  categoryId: string;
  isGroups: boolean;
  defaultMode: Mode;
  candidates: { id: string; name: string; seed: number | null }[];
  redraw: boolean;
  onDrawn?: (mode: Mode) => void;
}) {
  const modes: Mode[] = isGroups
    ? ["RANDOM", "SNAKE", "RANKING", "MANUAL"]
    : ["RANDOM", "SNAKE"];
  const [mode, setMode] = useState<Mode>(
    modes.includes(defaultMode) ? defaultMode : "RANDOM",
  );
  const [seeds, setSeeds] = useState<Record<string, string>>(
    Object.fromEntries(
      candidates.map((c) => [c.id, c.seed != null ? String(c.seed) : ""]),
    ),
  );
  const { pending, error, run } = useAction();
  const usesSeeds = mode !== "RANDOM";

  const submit = () =>
    run(
      () =>
        drawStageAction(eventId, stageId, categoryId, {
          mode,
          seeds: Object.fromEntries(
            Object.entries(seeds).map(([id, v]) => [
              id,
              v.trim() === "" ? null : Number(v),
            ]),
          ),
        }),
      () => onDrawn?.(mode),
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="draw-mode">Como sortear</FieldLabel>
          <NativeSelect
            id="draw-mode"
            className="w-full"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            {modes.map((m) => (
              <NativeSelectOption key={m} value={m}>
                {!isGroups && m === "SNAKE"
                  ? "Por cabeça de chave"
                  : DRAW_MODE_LABELS[m]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            {isGroups
              ? DRAW_MODE_HELP[mode]
              : mode === "RANDOM"
                ? "Embaralha a ordem da chave."
                : "Os cabeças de chave ocupam as melhores posições e os demais são sorteados."}
          </FieldDescription>
        </Field>
      </div>

      {usesSeeds ? (
        <section
          aria-labelledby="seeds-heading"
          className="flex flex-col gap-3"
        >
          <div>
            <h3
              id="seeds-heading"
              className="font-display text-xl leading-none font-bold tracking-wide uppercase"
            >
              Cabeças de chave
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Opcional. 1 é o melhor. Quem fica sem número é sorteado depois dos
              cabeças.
            </p>
          </div>
          <ul className="grid max-h-80 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-sm">{c.name}</span>
                <Input
                  aria-label={`Cabeça de chave de ${c.name}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  placeholder="–"
                  value={seeds[c.id] ?? ""}
                  onChange={(e) =>
                    setSeeds({ ...seeds, [c.id]: e.target.value })
                  }
                  className="h-9 w-20 tabular-nums"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button
          type="button"
          size="lg"
          className="h-11 px-5"
          onClick={submit}
          disabled={pending}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DicesIcon data-icon="inline-start" />
          )}
          {redraw
            ? "Sortear de novo"
            : mode === "MANUAL"
              ? "Criar participantes"
              : "Sortear"}
        </Button>
      </div>
    </div>
  );
}
