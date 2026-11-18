"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  GRAND_FINAL_LABELS,
  GRAND_FINAL_MODES,
  LIMITS,
  SEEDING_LABELS,
  SEEDING_MODES,
  STAGE_TYPES,
  STAGE_TYPE_LABELS,
  type StageTypeKey,
} from "@/lib/rules/catalog";
import type { StageInput } from "@/lib/rules/schema";
import { Block, NumberField, SwitchField, type SectionProps } from "./fields";

function defaultsFor(type: StageTypeKey): StageInput {
  return {
    name: STAGE_TYPE_LABELS[type].label,
    type,
    groupCount: type === "GROUPS" ? 4 : null,
    groupSize: type === "GROUPS" ? 4 : null,
    advancingPerGroup: type === "GROUPS" ? 2 : null,
    roundRobinLegs: 1,
    swissRounds: null,
    thirdPlaceMatch: false,
    grandFinalMode: type === "DOUBLE_ELIM" ? "SINGLE" : "NONE",
    seeding: "MANUAL",
  };
}

export function StagesSection({ rules, patch, errors }: SectionProps) {
  const stages = rules.stages;
  // Bumped on reorder/remove so uncontrolled number inputs remount with the right values.
  const [version, setVersion] = useState(0);
  const set = (next: StageInput[]) => patch({ stages: next });
  const restructure = (next: StageInput[]) => {
    setVersion((v) => v + 1);
    set(next);
  };
  const update = (index: number, changes: Partial<StageInput>) =>
    set(stages.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    restructure(next);
  };
  const err = (index: number, field: string) =>
    errors[`stages.${index}.${field}`];

  return (
    <Block
      title="Fases do evento"
      description="O evento passa pelas fases na ordem abaixo. Exemplo: fase de grupos, depois mata-mata."
    >
      <ol className="flex flex-col gap-4">
        {stages.map((stage, index) => (
          <li
            key={`${version}-${index}`}
            className="rounded-2xl border bg-muted/20 p-4 sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge
                variant="secondary"
                className="size-7 justify-center rounded-full tabular-nums"
              >
                {index + 1}
              </Badge>
              <p className="min-w-0 flex-1 text-sm font-semibold">
                {STAGE_TYPE_LABELS[stage.type].label}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Subir fase ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Descer fase ${index + 1}`}
                  disabled={index === stages.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover fase ${index + 1}`}
                  disabled={stages.length === 1}
                  onClick={() =>
                    restructure(stages.filter((_, i) => i !== index))
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={err(index, "name") ? true : undefined}>
                <FieldLabel htmlFor={`stage-name-${index}`}>
                  Nome da fase
                </FieldLabel>
                <Input
                  id={`stage-name-${index}`}
                  defaultValue={stage.name}
                  maxLength={40}
                  className="h-10"
                  aria-invalid={err(index, "name") ? true : undefined}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
                <FieldError>{err(index, "name")}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`stage-type-${index}`}>Tipo</FieldLabel>
                <NativeSelect
                  id={`stage-type-${index}`}
                  className="w-full"
                  value={stage.type}
                  onChange={(e) =>
                    update(index, defaultsFor(e.target.value as StageTypeKey))
                  }
                >
                  {STAGE_TYPES.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {STAGE_TYPE_LABELS[t].label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {STAGE_TYPE_LABELS[stage.type].description}
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {stage.type === "GROUPS" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    label="Quantos grupos"
                    value={stage.groupCount}
                    nullable
                    min={2}
                    max={16}
                    onChange={(v) => update(index, { groupCount: v })}
                    error={err(index, "groupCount")}
                  />
                  <NumberField
                    label="Times por grupo"
                    value={stage.groupSize}
                    nullable
                    min={2}
                    max={12}
                    onChange={(v) => update(index, { groupSize: v })}
                    error={err(index, "groupSize")}
                  />
                  <NumberField
                    label="Avançam por grupo"
                    value={stage.advancingPerGroup}
                    nullable
                    min={1}
                    max={12}
                    onChange={(v) => update(index, { advancingPerGroup: v })}
                    error={err(index, "advancingPerGroup")}
                  />
                </div>
              ) : null}

              {stage.type === "ROUND_ROBIN" || stage.type === "GROUPS" ? (
                <Field className="max-w-xs">
                  <FieldLabel htmlFor={`stage-legs-${index}`}>
                    Turnos
                  </FieldLabel>
                  <NativeSelect
                    id={`stage-legs-${index}`}
                    className="w-full"
                    value={String(stage.roundRobinLegs)}
                    onChange={(e) =>
                      update(index, {
                        roundRobinLegs: Number(e.target.value) as 1 | 2,
                      })
                    }
                  >
                    <NativeSelectOption value="1">
                      Turno único
                    </NativeSelectOption>
                    <NativeSelectOption value="2">
                      Turno e returno
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              ) : null}

              {stage.type === "SWISS" ? (
                <NumberField
                  label="Rodadas"
                  hint="Deixe vazio para o sistema calcular pelo número de participantes."
                  value={stage.swissRounds}
                  nullable
                  min={1}
                  max={15}
                  placeholder="Automático"
                  onChange={(v) => update(index, { swissRounds: v })}
                  error={err(index, "swissRounds")}
                  className="max-w-xs"
                />
              ) : null}

              {stage.type === "SINGLE_ELIM" ? (
                <SwitchField
                  label="Disputa de 3º lugar"
                  description="Os dois perdedores das semifinais se enfrentam."
                  checked={stage.thirdPlaceMatch}
                  onChange={(thirdPlaceMatch) =>
                    update(index, { thirdPlaceMatch })
                  }
                />
              ) : null}

              {stage.type === "DOUBLE_ELIM" ? (
                <Field className="max-w-md">
                  <FieldLabel htmlFor={`stage-gf-${index}`}>
                    Final da chave
                  </FieldLabel>
                  <NativeSelect
                    id={`stage-gf-${index}`}
                    className="w-full"
                    value={stage.grandFinalMode}
                    onChange={(e) =>
                      update(index, {
                        grandFinalMode: e.target
                          .value as StageInput["grandFinalMode"],
                      })
                    }
                  >
                    {GRAND_FINAL_MODES.map((m) => (
                      <NativeSelectOption key={m} value={m}>
                        {GRAND_FINAL_LABELS[m]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}

              {stage.type !== "PERFORMANCE" ? (
                <Field className="max-w-xs">
                  <FieldLabel htmlFor={`stage-seed-${index}`}>
                    Como os participantes entram
                  </FieldLabel>
                  <NativeSelect
                    id={`stage-seed-${index}`}
                    className="w-full"
                    value={stage.seeding}
                    onChange={(e) =>
                      update(index, {
                        seeding: e.target.value as StageInput["seeding"],
                      })
                    }
                  >
                    {SEEDING_MODES.map((m) => (
                      <NativeSelectOption key={m} value={m}>
                        {SEEDING_LABELS[m]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <FieldError>{errors.stages}</FieldError>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={stages.length >= LIMITS.maxStages}
        onClick={() => restructure([...stages, defaultsFor("SINGLE_ELIM")])}
      >
        <PlusIcon data-icon="inline-start" />
        Adicionar fase
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {stages.length} de {LIMITS.maxStages} fases
      </span>
    </Block>
  );
}
