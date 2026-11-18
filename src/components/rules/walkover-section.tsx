"use client";

import { Block, NumberField, SwitchField, type SectionProps } from "./fields";

export function WalkoverSection({ rules, patch, errors }: SectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Placar atribuído"
        description="Quando alguém não comparece (W.O.), o jogo é decidido na mesa com este placar a favor de quem estava presente."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Placar de quem ganha"
            value={rules.woScoreFor}
            onChange={(v) => patch({ woScoreFor: v ?? Number.NaN })}
            min={0}
            error={errors.woScoreFor}
          />
          <NumberField
            label="Placar de quem dá W.O."
            value={rules.woScoreAgainst}
            onChange={(v) => patch({ woScoreAgainst: v ?? Number.NaN })}
            min={0}
            error={errors.woScoreAgainst}
          />
        </div>
      </Block>

      <Block
        title="Pontos na tabela"
        description="Quantos pontos entram na classificação."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Para quem ganha"
            value={rules.woPointsAwarded}
            onChange={(v) => patch({ woPointsAwarded: v ?? Number.NaN })}
            step={0.5}
            error={errors.woPointsAwarded}
          />
          <NumberField
            label="Para quem dá W.O."
            hint="Use um valor negativo para punir (ex.: -1)."
            value={rules.woPointsPenalty}
            onChange={(v) => patch({ woPointsPenalty: v ?? Number.NaN })}
            step={0.5}
            error={errors.woPointsPenalty}
          />
        </div>
      </Block>

      <Block
        title="Consequências"
        description="O que acontece quando o W.O. se repete."
      >
        <NumberField
          label="Eliminar no W.O. de número"
          hint="Deixe vazio para nunca eliminar. No basquete da FIBA, o 2º W.O. elimina o time."
          value={rules.woEliminationLimit}
          nullable
          min={1}
          max={10}
          placeholder="Nunca"
          onChange={(v) => patch({ woEliminationLimit: v })}
          error={errors.woEliminationLimit}
          className="max-w-xs"
        />
        <SwitchField
          label="Anular os resultados de quem foi eliminado"
          description="Os jogos anteriores do time eliminado deixam de contar na classificação dos demais."
          checked={rules.woNullifyResults}
          onChange={(woNullifyResults) => patch({ woNullifyResults })}
        />
      </Block>
    </div>
  );
}
