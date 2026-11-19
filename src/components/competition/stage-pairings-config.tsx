"use client";

import { SaveIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { saveStagePairingsAction } from "@/lib/competition/actions";
import type { StageCfg, Template } from "@/lib/competition/pairing-template";
import { PairingsTemplateEditor } from "./pairings-template-editor";
import { useAction } from "./use-action";

/** The configuration of a stage that has not started, saved on its own (works with the rules locked). */
export function StagePairingsConfig({
  eventId,
  stageId,
  stages,
  index,
  saved,
}: {
  eventId: string;
  stageId: string;
  stages: StageCfg[];
  index: number;
  saved: Template | null;
}) {
  const [value, setValue] = useState<Template | null>(saved);
  const [base, setBase] = useState(JSON.stringify(saved));
  const dirty = JSON.stringify(value) !== base;
  const { pending, error, run } = useAction();

  return (
    <section
      aria-label="Confrontos desta fase"
      className="liquid-card flex flex-col gap-4 rounded-xl p-5"
    >
      <div>
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Confrontos desta fase
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina agora quem enfrenta quem. Quando a fase anterior terminar, os
          confrontos são montados sozinhos.
        </p>
      </div>
      <PairingsTemplateEditor
        stages={stages}
        index={index}
        value={value}
        onChange={setValue}
        disabled={pending}
        idPrefix="stage"
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            run(
              () => saveStagePairingsAction(eventId, stageId, value),
              () => setBase(JSON.stringify(value)),
            )
          }
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Salvar confrontos
        </Button>
      </div>
    </section>
  );
}
