"use client";

import { TriangleAlertIcon, WandSparklesIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { assignSlot } from "@/lib/competition/pairings";
import {
  defaultTemplate,
  expectedSources,
  sourceKey,
  sourceLabel,
  templateFromOrder,
  templateToOrder,
  validateTemplate,
  type StageCfg,
  type Template,
} from "@/lib/competition/pairing-template";

/**
 * Chooses the matchups of a knockout stage by origin, while configuring:
 * "1st of Group A against 2nd of Group B", "winner of game 1 against winner
 * of game 3". Controlled: `value` null means the automatic cross.
 */
export function PairingsTemplateEditor({
  stages,
  index,
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  stages: StageCfg[];
  index: number;
  value: Template | null;
  onChange: (next: Template | null) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const sources = expectedSources(stages, index);
  if (!sources) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Os confrontos desta fase podem ser escolhidos quando a fase anterior
        classificar 2, 4, 8, 16... participantes (por exemplo, 4 grupos com 2
        classificados cada).
      </p>
    );
  }

  const previousName = stages[index - 1]?.name ?? null;
  const label = (s: (typeof sources)[number]) => sourceLabel(s, previousName);
  const automatic = defaultTemplate(stages, index) as Template;
  const invalid = value ? validateTemplate(stages, index, value) : null;
  const manual = value !== null && invalid === null;
  const shown = manual ? (value as Template) : automatic;
  const order = templateToOrder(shown);
  const byKey = new Map(sources.map((s) => [sourceKey(s), s]));

  return (
    <div className="flex flex-col gap-3" data-testid={`${idPrefix}-editor`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={manual ? "secondary" : "outline"}>
          {manual ? "Confrontos definidos por você" : "Automático"}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {manual
            ? "Os confrontos abaixo valem quando a fase anterior terminar."
            : "O sistema cruza o 1º de um grupo com o 2º de outro; nas rodadas seguintes, os vencedores seguem a chave."}
        </p>
      </div>

      {invalid ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>
            Os confrontos salvos não combinam mais com a fase anterior (
            {invalid}). Escolha de novo ou volte ao automático antes de salvar.
          </AlertDescription>
        </Alert>
      ) : null}

      <ol className="grid gap-3 md:grid-cols-2">
        {shown.map((_, game) => (
          <li
            key={game}
            className="liquid-card flex flex-col gap-2 rounded-xl p-3"
            data-testid={`${idPrefix}-game-${game + 1}`}
          >
            <span className="text-sm font-semibold">Jogo {game + 1}</span>
            {[0, 1].map((side) => {
              const slot = 2 * game + side;
              return manual ? (
                <NativeSelect
                  key={side}
                  aria-label={`${stages[index].name}: jogo ${game + 1}, ${side === 0 ? "primeiro" : "segundo"} time`}
                  className="w-full"
                  value={sourceKey(order[slot])}
                  disabled={disabled}
                  onChange={(e) => {
                    const keys = assignSlot(
                      order.map(sourceKey),
                      slot,
                      e.target.value,
                    );
                    onChange(
                      templateFromOrder(
                        keys.map(
                          (k) => byKey.get(k) as (typeof sources)[number],
                        ),
                      ),
                    );
                  }}
                >
                  {sources.map((s) => (
                    <NativeSelectOption key={sourceKey(s)} value={sourceKey(s)}>
                      {label(s)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <p
                  key={side}
                  className="rounded-lg border px-3 py-2 text-sm text-muted-foreground"
                >
                  {label(order[slot])}
                </p>
              );
            })}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        {manual ? (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <WandSparklesIcon data-icon="inline-start" />
            Voltar ao automático
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(automatic)}
          >
            Definir os confrontos
          </Button>
        )}
      </div>
    </div>
  );
}
