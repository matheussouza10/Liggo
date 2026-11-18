"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import {
  PERFORMANCE_AGGREGATION_LABELS,
  PERFORMANCE_AGGREGATIONS,
  PERFORMANCE_METRIC_LABELS,
  PERFORMANCE_METRICS,
  SCORING_MODELS,
  SCORING_MODEL_LABELS,
  type ScoringModelKey,
} from "@/lib/rules/catalog";
import type { RulesInput, SportConfig } from "@/lib/rules/schema";
import { cn } from "@/lib/utils";
import { Block, NumberField, SwitchField, type SectionProps } from "./fields";

const DEFAULT_SETS: SportConfig = {
  kind: "SETS",
  setsToWin: 2,
  pointsPerSet: 25,
  decidingSetPoints: 15,
  winByTwo: true,
};
const DEFAULT_PERFORMANCE: SportConfig = {
  kind: "PERFORMANCE",
  metric: "TIME",
  bestIs: "LOWEST",
  attempts: 1,
  finalists: null,
  extraAttempts: null,
  aggregation: "BEST",
};

const DEFAULT_POINTS_TABLE: NonNullable<RulesInput["pointsTable"]> = [
  {
    label: "Vitória por 2-0",
    points: 3,
    when: { outcome: "WIN", setsFor: 2, setsAgainst: 0 },
  },
  {
    label: "Vitória por 2-1",
    points: 2,
    when: { outcome: "WIN", setsFor: 2, setsAgainst: 1 },
  },
  {
    label: "Derrota por 1-2",
    points: 1,
    when: { outcome: "LOSS", setsFor: 1, setsAgainst: 2 },
  },
  {
    label: "Derrota por 0-2",
    points: 0,
    when: { outcome: "LOSS", setsFor: 0, setsAgainst: 2 },
  },
];

export function ScoringSection({ rules, patch, errors }: SectionProps) {
  const chooseModel = (model: ScoringModelKey) => {
    if (model === rules.scoringModel) return;
    patch({
      scoringModel: model,
      sportConfig:
        model === "SETS"
          ? DEFAULT_SETS
          : model === "PERFORMANCE"
            ? DEFAULT_PERFORMANCE
            : null,
      pointsTable: model === "SETS" ? rules.pointsTable : null,
      placePoints: model === "PERFORMANCE" ? rules.placePoints : null,
    });
  };

  const config = rules.sportConfig;

  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Como a modalidade é decidida"
        description="Define quais campos aparecem a seguir."
      >
        <div
          role="radiogroup"
          aria-label="Modelo de placar"
          className="grid gap-3 sm:grid-cols-3"
        >
          {SCORING_MODELS.map((model) => {
            const active = rules.scoringModel === model;
            return (
              <button
                key={model}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseModel(model)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary/10"
                    : "bg-muted/30 hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-semibold">
                  {SCORING_MODEL_LABELS[model].label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {SCORING_MODEL_LABELS[model].description}
                </span>
              </button>
            );
          })}
        </div>
        <FieldError>{errors.sportConfig}</FieldError>
      </Block>

      {rules.scoringModel !== "PERFORMANCE" &&
      !(rules.pointsTable && rules.pointsTable.length > 0) ? (
        <Block
          title="Pontos de classificação"
          description="Quantos pontos cada resultado vale na tabela. Aceita meio ponto (ex.: 0,5 no xadrez)."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Vitória"
              value={rules.winPoints}
              onChange={(v) => patch({ winPoints: v ?? Number.NaN })}
              step={0.5}
              error={errors.winPoints}
            />
            <NumberField
              label="Empate"
              value={rules.drawPoints}
              onChange={(v) => patch({ drawPoints: v ?? Number.NaN })}
              step={0.5}
              disabled={!rules.allowDraw}
              error={errors.drawPoints}
            />
            <NumberField
              label="Derrota"
              value={rules.lossPoints}
              onChange={(v) => patch({ lossPoints: v ?? Number.NaN })}
              step={0.5}
              error={errors.lossPoints}
            />
          </div>
          <SwitchField
            label="Permite empate"
            description="Desligue em modalidades que sempre têm vencedor (basquete, vôlei, tênis)."
            checked={rules.allowDraw}
            onChange={(allowDraw) => patch({ allowDraw })}
          />
        </Block>
      ) : null}

      {rules.scoringModel === "SETS" && config?.kind === "SETS" ? (
        <>
          <Block title="Sets" description="Como cada partida é jogada.">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Sets para vencer"
                value={config.setsToWin}
                onChange={(v) =>
                  patch({
                    sportConfig: { ...config, setsToWin: v ?? Number.NaN },
                  })
                }
                min={1}
                max={5}
                error={errors["sportConfig.setsToWin"]}
              />
              <NumberField
                label="Pontos por set"
                value={config.pointsPerSet}
                onChange={(v) =>
                  patch({
                    sportConfig: { ...config, pointsPerSet: v ?? Number.NaN },
                  })
                }
                min={1}
                error={errors["sportConfig.pointsPerSet"]}
              />
              <NumberField
                label="Pontos do set decisivo"
                value={config.decidingSetPoints}
                onChange={(v) =>
                  patch({
                    sportConfig: {
                      ...config,
                      decidingSetPoints: v ?? Number.NaN,
                    },
                  })
                }
                min={1}
                error={errors["sportConfig.decidingSetPoints"]}
              />
            </div>
            <SwitchField
              label="Diferença mínima de 2 pontos"
              description="O set só termina quando um lado abre 2 pontos de vantagem."
              checked={config.winByTwo}
              onChange={(winByTwo) =>
                patch({ sportConfig: { ...config, winByTwo } })
              }
            />
          </Block>

          <Block
            title="Pontos por placar"
            description="Quando o placar de sets muda os pontos da tabela (como no vôlei). Substitui os valores de vitória, empate e derrota."
          >
            {rules.pointsTable ? (
              <div className="flex flex-col gap-2">
                {rules.pointsTable.map((row, index) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-2.5"
                  >
                    <span className="text-sm">{row.label}</span>
                    <NumberField
                      label=""
                      className="w-28 [&_label]:sr-only"
                      value={row.points}
                      step={0.5}
                      onChange={(v) =>
                        patch({
                          pointsTable: rules.pointsTable!.map((r, i) =>
                            i === index ? { ...r, points: v ?? Number.NaN } : r,
                          ),
                        })
                      }
                      error={errors[`pointsTable.${index}.points`]}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => patch({ pointsTable: null })}
                >
                  Remover pontos por placar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => patch({ pointsTable: DEFAULT_POINTS_TABLE })}
              >
                Definir pontos por placar
              </Button>
            )}
          </Block>
        </>
      ) : null}

      {rules.scoringModel === "PERFORMANCE" &&
      config?.kind === "PERFORMANCE" ? (
        <>
          <Block title="Prova" description="O que se mede e quem vence.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="perf-metric">O que é medido</FieldLabel>
                <NativeSelect
                  id="perf-metric"
                  className="w-full"
                  value={config.metric}
                  onChange={(e) =>
                    patch({
                      sportConfig: {
                        ...config,
                        metric: e.target.value as typeof config.metric,
                        bestIs:
                          e.target.value === "TIME" ? "LOWEST" : "HIGHEST",
                      },
                    })
                  }
                >
                  {PERFORMANCE_METRICS.map((m) => (
                    <NativeSelectOption key={m} value={m}>
                      {PERFORMANCE_METRIC_LABELS[m]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="perf-best">Vence</FieldLabel>
                <NativeSelect
                  id="perf-best"
                  className="w-full"
                  value={config.bestIs}
                  onChange={(e) =>
                    patch({
                      sportConfig: {
                        ...config,
                        bestIs: e.target.value as typeof config.bestIs,
                      },
                    })
                  }
                >
                  <NativeSelectOption value="LOWEST">
                    O menor valor (ex.: tempo)
                  </NativeSelectOption>
                  <NativeSelectOption value="HIGHEST">
                    O maior valor (ex.: distância)
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Tentativas por atleta"
                value={config.attempts}
                onChange={(v) =>
                  patch({
                    sportConfig: { ...config, attempts: v ?? Number.NaN },
                  })
                }
                min={1}
                max={10}
                error={errors["sportConfig.attempts"]}
              />
              <Field>
                <FieldLabel htmlFor="perf-agg">Resultado final</FieldLabel>
                <NativeSelect
                  id="perf-agg"
                  className="w-full"
                  value={config.aggregation}
                  onChange={(e) =>
                    patch({
                      sportConfig: {
                        ...config,
                        aggregation: e.target
                          .value as typeof config.aggregation,
                      },
                    })
                  }
                >
                  {PERFORMANCE_AGGREGATIONS.map((a) => (
                    <NativeSelectOption key={a} value={a}>
                      {PERFORMANCE_AGGREGATION_LABELS[a]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <SwitchField
              label="Rodada final só para os melhores"
              description="Depois das primeiras tentativas, os melhores fazem tentativas extras (ex.: os 8 melhores fazem mais 3)."
              checked={config.finalists != null}
              onChange={(on) =>
                patch({
                  sportConfig: {
                    ...config,
                    finalists: on ? 8 : null,
                    extraAttempts: on ? 3 : null,
                  },
                })
              }
            />
            {config.finalists != null ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Quantos avançam"
                  value={config.finalists}
                  onChange={(v) =>
                    patch({ sportConfig: { ...config, finalists: v } })
                  }
                  min={1}
                  nullable
                  error={errors["sportConfig.finalists"]}
                />
                <NumberField
                  label="Tentativas extras"
                  value={config.extraAttempts}
                  onChange={(v) =>
                    patch({ sportConfig: { ...config, extraAttempts: v } })
                  }
                  min={0}
                  nullable
                  error={errors["sportConfig.extraAttempts"]}
                />
              </div>
            ) : null}
          </Block>

          <Block
            title="Ranking por etapas"
            description="Para circuitos: pontos por colocação em cada etapa. Deixe vazio se a prova é única."
          >
            <PlacePointsField rules={rules} patch={patch} errors={errors} />
            <NumberField
              label="Descartar os piores resultados"
              hint="Quantas etapas piores não entram na soma. Sem fonte oficial: defina conforme o seu regulamento."
              value={rules.dropWorst}
              nullable
              min={0}
              max={10}
              onChange={(v) => patch({ dropWorst: v })}
              error={errors.dropWorst}
              className="max-w-xs"
            />
          </Block>
        </>
      ) : null}
    </div>
  );
}

function PlacePointsField({ rules, patch, errors }: SectionProps) {
  const text = (rules.placePoints ?? []).map((p) => p.points).join(", ");
  return (
    <Field data-invalid={errors.placePoints ? true : undefined}>
      <FieldLabel htmlFor="place-points">
        Pontos por posição, do 1º em diante
      </FieldLabel>
      <Input
        id="place-points"
        defaultValue={text}
        placeholder="25, 18, 15, 12, 10, 8, 6, 4, 2, 1"
        className="h-10 tabular-nums"
        aria-invalid={errors.placePoints ? true : undefined}
        onChange={(event) => {
          const values = event.target.value
            .split(/[;,\s]+/)
            .filter(Boolean)
            .map((v) => Number(v.replace(",", ".")));
          patch({
            placePoints:
              values.length === 0
                ? null
                : values.map((points, i) => ({ place: i + 1, points })),
          });
        }}
      />
      <FieldDescription>
        Separe por vírgula. O 1º lugar vem primeiro.
      </FieldDescription>
      <FieldError>{errors.placePoints}</FieldError>
    </Field>
  );
}
