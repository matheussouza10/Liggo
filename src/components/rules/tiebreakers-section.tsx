"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  LIMITS,
  SCOPE_LABELS,
  TIEBREAKERS,
  TIEBREAKER_BY_KEY,
  type TiebreakerKey,
  type TiebreakerScope,
} from "@/lib/rules/catalog";
import { Block, type SectionProps } from "./fields";

export function TiebreakersSection({ rules, patch, errors }: SectionProps) {
  const list = rules.tiebreakers;
  const [choice, setChoice] = useState<string>("");

  const used = new Set(list.map((t) => `${t.key}:${t.scope}`));
  const available = TIEBREAKERS.filter(
    (t) =>
      !used.has(`${t.key}:OVERALL`) ||
      (t.headToHead && !used.has(`${t.key}:HEAD_TO_HEAD`)),
  );

  const set = (next: typeof list) => patch({ tiebreakers: next });
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    set(next);
  };

  const add = () => {
    const key = (choice || available[0]?.key) as TiebreakerKey | undefined;
    if (!key || list.length >= LIMITS.maxTiebreakers) return;
    const scope: TiebreakerScope = used.has(`${key}:OVERALL`)
      ? "HEAD_TO_HEAD"
      : "OVERALL";
    set([...list, { key, scope }]);
    setChoice("");
  };

  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Ordem de desempate"
        description="Quando duas equipes ou atletas terminam empatados, o primeiro critério decide; se ainda empatar, passa para o seguinte. Arraste a ordem com as setas."
      >
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sem critérios, empates ficam para o organizador resolver. Adicione
            ao menos um.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {list.map((item, index) => {
              const def = TIEBREAKER_BY_KEY[item.key];
              return (
                <li
                  key={`${item.key}:${item.scope}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3"
                >
                  <Badge
                    variant="secondary"
                    className="size-7 justify-center rounded-full tabular-nums"
                  >
                    {index + 1}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{def.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {def.description}
                    </p>
                    <FieldError>{errors[`tiebreakers.${index}`]}</FieldError>
                  </div>
                  {def.headToHead ? (
                    <ToggleGroup
                      value={[item.scope]}
                      onValueChange={(value) => {
                        const scope = value[0] as TiebreakerScope | undefined;
                        if (scope)
                          set(
                            list.map((t, i) =>
                              i === index ? { ...t, scope } : t,
                            ),
                          );
                      }}
                      variant="outline"
                      size="sm"
                      aria-label={`Escopo de ${def.label}`}
                    >
                      <ToggleGroupItem value="OVERALL">
                        {SCOPE_LABELS.OVERALL}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="HEAD_TO_HEAD">
                        {SCOPE_LABELS.HEAD_TO_HEAD}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Subir ${def.label}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Descer ${def.label}`}
                      disabled={index === list.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${def.label}`}
                      onClick={() => set(list.filter((_, i) => i !== index))}
                    >
                      <XIcon />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <FieldError>{errors.tiebreakers}</FieldError>

        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect
            aria-label="Critério para adicionar"
            className="w-full sm:w-80"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={
              available.length === 0 || list.length >= LIMITS.maxTiebreakers
            }
          >
            <NativeSelectOption value="">
              Escolha um critério
            </NativeSelectOption>
            {available.map((t) => (
              <NativeSelectOption key={t.key} value={t.key}>
                {t.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            onClick={add}
            disabled={!choice || list.length >= LIMITS.maxTiebreakers}
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar critério
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {list.length} de {LIMITS.maxTiebreakers}
          </span>
        </div>
      </Block>
    </div>
  );
}
