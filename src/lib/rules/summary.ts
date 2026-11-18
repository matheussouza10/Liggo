import {
  MATCH_FORMAT_LABELS,
  PERFORMANCE_METRIC_LABELS,
  STAGE_TYPE_LABELS,
  TIEBREAKER_BY_KEY,
  type StageTypeKey,
  type TiebreakerKey,
} from "./catalog";
import type { RulesInput } from "./schema";

const num = (n: number) => String(n).replace(".", ",");

/** Short, human sentences describing saved rules (used in the event summary). */
export function summarizeRules(rules: RulesInput) {
  let scoring: string;
  if (
    rules.scoringModel === "PERFORMANCE" &&
    rules.sportConfig?.kind === "PERFORMANCE"
  ) {
    const c = rules.sportConfig;
    scoring = `${PERFORMANCE_METRIC_LABELS[c.metric]}: vence o ${c.bestIs === "LOWEST" ? "menor" : "maior"} valor, ${c.attempts} ${c.attempts === 1 ? "tentativa" : "tentativas"}`;
  } else if (rules.pointsTable && rules.pointsTable.length > 0) {
    scoring = `Pontos por placar de sets (${rules.pointsTable.length} faixas)`;
  } else {
    scoring = `Vitória ${num(rules.winPoints)}${rules.allowDraw ? `, empate ${num(rules.drawPoints)}` : ""}, derrota ${num(rules.lossPoints)}`;
  }

  const tiebreakers = rules.tiebreakers.map(
    (t) => TIEBREAKER_BY_KEY[t.key as TiebreakerKey].label,
  );

  const walkover = `W.O. vale ${rules.woScoreFor} a ${rules.woScoreAgainst}${
    rules.woEliminationLimit
      ? `; ${rules.woEliminationLimit}º W.O. elimina`
      : ""
  }`;

  let match: string = MATCH_FORMAT_LABELS[rules.matchFormat];
  if (rules.matchFormat === "BEST_OF" && rules.bestOf)
    match = `Melhor de ${rules.bestOf}`;
  const extras = [
    rules.extraTime ? "prorrogação" : null,
    rules.penalties ? "pênaltis" : null,
    rules.awayGoals ? "gol fora" : null,
  ].filter(Boolean);
  if (extras.length) match += `, com ${extras.join(" e ")}`;

  const stages = rules.stages.map((s) => ({
    name: s.name,
    type: STAGE_TYPE_LABELS[s.type as StageTypeKey].label,
  }));

  return { scoring, tiebreakers, walkover, match, stages };
}
