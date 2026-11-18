"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  BEST_OF_OPTIONS,
  MATCH_FORMATS,
  MATCH_FORMAT_LABELS,
} from "@/lib/rules/catalog";
import { cn } from "@/lib/utils";
import { Block, SwitchField, type SectionProps } from "./fields";

const FORMAT_HELP = {
  SINGLE: "Uma partida decide o confronto.",
  BEST_OF: "Vence quem ganhar a maioria das partidas.",
  HOME_AWAY: "Duas partidas, com mando de campo invertido.",
} as const;

export function MatchesSection({ rules, patch, errors }: SectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Formato do confronto"
        description="Como duas equipes ou atletas se enfrentam nas fases eliminatórias e nas séries."
      >
        <div
          role="radiogroup"
          aria-label="Formato do confronto"
          className="grid gap-3 sm:grid-cols-3"
        >
          {MATCH_FORMATS.map((format) => {
            const active = rules.matchFormat === format;
            return (
              <button
                key={format}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  patch({
                    matchFormat: format,
                    bestOf: format === "BEST_OF" ? (rules.bestOf ?? 3) : null,
                  })
                }
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary/10"
                    : "bg-muted/30 hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-semibold">
                  {MATCH_FORMAT_LABELS[format]}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {FORMAT_HELP[format]}
                </span>
              </button>
            );
          })}
        </div>

        {rules.matchFormat === "BEST_OF" ? (
          <Field
            data-invalid={errors.bestOf ? true : undefined}
            className="max-w-xs"
          >
            <FieldLabel htmlFor="best-of">Melhor de</FieldLabel>
            <NativeSelect
              id="best-of"
              className="w-full"
              value={String(rules.bestOf ?? 3)}
              onChange={(e) => patch({ bestOf: Number(e.target.value) })}
            >
              {BEST_OF_OPTIONS.map((n) => (
                <NativeSelectOption key={n} value={n}>
                  {n} partidas (vence quem ganhar {Math.ceil(n / 2)})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{errors.bestOf}</FieldError>
          </Field>
        ) : null}
        {rules.matchFormat === "HOME_AWAY" ? (
          <SwitchField
            label="Gol fora como critério"
            description="Em caso de empate no agregado, o time que marcou mais fora de casa avança."
            checked={rules.awayGoals}
            onChange={(awayGoals) => patch({ awayGoals })}
          />
        ) : null}
      </Block>

      <Block
        title="Quando o jogo precisa de um vencedor"
        description="Procedimentos usados nas fases eliminatórias se a partida terminar empatada."
      >
        <SwitchField
          label="Prorrogação"
          description="Tempo extra antes de decidir de outra forma."
          checked={rules.extraTime}
          onChange={(extraTime) => patch({ extraTime })}
        />
        <SwitchField
          label="Pênaltis ou desempate final"
          description="Cobranças, morte súbita ou equivalente da modalidade."
          checked={rules.penalties}
          onChange={(penalties) => patch({ penalties })}
        />
        <FieldDescription>
          Esses procedimentos só valem em fases eliminatórias ou séries.
        </FieldDescription>
      </Block>
    </div>
  );
}
