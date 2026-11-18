/** Closed vocabularies for event rules. Client-safe (no server imports). */

export type TiebreakerDef = {
  key: string;
  label: string;
  description: string;
  /** Whether the criterion can also be applied only to matches between the tied. */
  headToHead: boolean;
};

// Criteria seen in federation rulebooks and tournament platforms
// (docs/research/regras-de-competicao.md, section 2).
export const TIEBREAKERS = [
  {
    key: "POINTS",
    label: "Pontos",
    description: "Pontos de classificação.",
    headToHead: true,
  },
  {
    key: "WINS",
    label: "Número de vitórias",
    description: "Quem venceu mais partidas.",
    headToHead: true,
  },
  {
    key: "SCORE_DIFF",
    label: "Saldo (gols, pontos)",
    description: "Marcados menos sofridos.",
    headToHead: true,
  },
  {
    key: "SCORE_FOR",
    label: "Marcados (gols, pontos)",
    description: "Mais gols ou pontos marcados.",
    headToHead: true,
  },
  {
    key: "SCORE_AGAINST",
    label: "Menos sofridos",
    description: "Menos gols ou pontos sofridos.",
    headToHead: true,
  },
  {
    key: "SET_RATIO",
    label: "Quociente de sets",
    description: "Sets ganhos divididos pelos perdidos.",
    headToHead: true,
  },
  {
    key: "POINT_RATIO",
    label: "Quociente de pontos",
    description: "Pontos ganhos divididos pelos perdidos.",
    headToHead: true,
  },
  {
    key: "TRIES_DIFF",
    label: "Saldo de tries",
    description: "Rúgbi: tries feitos menos sofridos.",
    headToHead: true,
  },
  {
    key: "TRIES_FOR",
    label: "Tries marcados",
    description: "Rúgbi: mais tries marcados.",
    headToHead: true,
  },
  {
    key: "FEWER_FORFEITS",
    label: "Menos W.O.",
    description: "Quem teve menos W.O.",
    headToHead: false,
  },
  {
    key: "LAST_MATCH",
    label: "Último confronto",
    description: "Resultado do último jogo entre os empatados.",
    headToHead: true,
  },
  {
    key: "BUCHHOLZ",
    label: "Buchholz",
    description: "Soma dos pontos dos adversários (suíço).",
    headToHead: false,
  },
  {
    key: "BUCHHOLZ_CUT1",
    label: "Buchholz sem o pior",
    description: "Buchholz descartando o pior adversário (FIDE).",
    headToHead: false,
  },
  {
    key: "MEDIAN_BUCHHOLZ",
    label: "Buchholz mediano",
    description: "Buchholz sem o melhor e o pior.",
    headToHead: false,
  },
  {
    key: "SONNEBORN_BERGER",
    label: "Sonneborn-Berger",
    description: "Pontos dos adversários vencidos (e metade dos empates).",
    headToHead: false,
  },
  {
    key: "FAIR_PLAY",
    label: "Fair play",
    description: "Menos cartões e punições.",
    headToHead: false,
  },
  {
    key: "SEED",
    label: "Cabeça de chave",
    description: "Posição no sorteio ou na semeadura.",
    headToHead: false,
  },
  {
    key: "EXTERNAL_RANKING",
    label: "Ranking externo",
    description: "Ranking oficial da modalidade.",
    headToHead: false,
  },
  {
    key: "COUNTBACK_PLACES",
    label: "Contagem de colocações",
    description: "Mais 1º lugares, depois 2º e assim por diante.",
    headToHead: false,
  },
  {
    key: "COUNTBACK_BEST_ATTEMPT",
    label: "Melhores tentativas",
    description:
      "Compara o 2º, depois o 3º melhor resultado (saltos e lançamentos).",
    headToHead: false,
  },
  {
    key: "JUMPS_AT_FINAL_HEIGHT",
    label: "Menos saltos na altura final",
    description: "Saltos verticais: menos saltos na última altura superada.",
    headToHead: false,
  },
  {
    key: "TOTAL_FAILURES",
    label: "Menos falhas no total",
    description: "Saltos verticais: menos falhas na prova.",
    headToHead: false,
  },
  {
    key: "DRAW_LOTS",
    label: "Sorteio",
    description: "Último recurso: sorteio.",
    headToHead: false,
  },
] as const satisfies readonly TiebreakerDef[];

export type TiebreakerKey = (typeof TIEBREAKERS)[number]["key"];
export const TIEBREAKER_KEYS = TIEBREAKERS.map((t) => t.key) as [
  TiebreakerKey,
  ...TiebreakerKey[],
];
export const TIEBREAKER_BY_KEY = Object.fromEntries(
  TIEBREAKERS.map((t) => [t.key, t]),
) as Record<TiebreakerKey, TiebreakerDef>;
export const TIEBREAKER_SCOPES = ["OVERALL", "HEAD_TO_HEAD"] as const;
export type TiebreakerScope = (typeof TIEBREAKER_SCOPES)[number];
export const SCOPE_LABELS: Record<TiebreakerScope, string> = {
  OVERALL: "Geral",
  HEAD_TO_HEAD: "Confronto direto",
};

export const SCORING_MODELS = ["SETS", "POINTS", "PERFORMANCE"] as const;
export type ScoringModelKey = (typeof SCORING_MODELS)[number];
export const SCORING_MODEL_LABELS: Record<
  ScoringModelKey,
  { label: string; description: string }
> = {
  POINTS: {
    label: "Gols ou pontos",
    description: "Futebol, basquete, handebol, lutas e e-sports.",
  },
  SETS: {
    label: "Sets",
    description: "Vôlei, tênis, tênis de mesa, badminton e padel.",
  },
  PERFORMANCE: {
    label: "Desempenho",
    description: "Tempo, distância, altura ou pontuação individual.",
  },
};

export const MATCH_FORMATS = ["SINGLE", "BEST_OF", "HOME_AWAY"] as const;
export const MATCH_FORMAT_LABELS = {
  SINGLE: "Jogo único",
  BEST_OF: "Melhor de N",
  HOME_AWAY: "Ida e volta",
} as const;
export const BEST_OF_OPTIONS = [3, 5, 7, 9] as const;

export const STAGE_TYPES = [
  "ROUND_ROBIN",
  "GROUPS",
  "SINGLE_ELIM",
  "DOUBLE_ELIM",
  "SWISS",
  "PERFORMANCE",
] as const;
export type StageTypeKey = (typeof STAGE_TYPES)[number];
export const STAGE_TYPE_LABELS: Record<
  StageTypeKey,
  { label: string; description: string }
> = {
  ROUND_ROBIN: {
    label: "Pontos corridos",
    description: "Todos contra todos, em turno único ou turno e returno.",
  },
  GROUPS: {
    label: "Fase de grupos",
    description: "Grupos de pontos corridos; os melhores avançam.",
  },
  SINGLE_ELIM: {
    label: "Mata-mata",
    description: "Eliminatória simples: perdeu, saiu.",
  },
  DOUBLE_ELIM: {
    label: "Dupla eliminação",
    description: "Chave superior e inferior; só sai quem perde duas vezes.",
  },
  SWISS: {
    label: "Sistema suíço",
    description: "Rodadas fixas, emparelhando quem tem campanha parecida.",
  },
  PERFORMANCE: {
    label: "Prova por desempenho",
    description: "Ranking por tempo, distância, altura ou pontos.",
  },
};

export const SEEDING_MODES = ["MANUAL", "RANDOM", "RANKING", "SNAKE"] as const;
export const SEEDING_LABELS = {
  MANUAL: "Manual",
  RANDOM: "Sorteio",
  RANKING: "Por ranking",
  SNAKE: "Em serpentina",
} as const;
export const GRAND_FINAL_MODES = ["NONE", "SINGLE", "RESET"] as const;
export const GRAND_FINAL_LABELS = {
  NONE: "Sem final da chave",
  SINGLE: "Final única",
  RESET: "Final com jogo extra se vencer a chave inferior",
} as const;

export const PERFORMANCE_METRICS = [
  "TIME",
  "DISTANCE",
  "HEIGHT",
  "POINTS",
] as const;
export const PERFORMANCE_METRIC_LABELS = {
  TIME: "Tempo",
  DISTANCE: "Distância",
  HEIGHT: "Altura",
  POINTS: "Pontuação",
} as const;
export const PERFORMANCE_AGGREGATIONS = ["BEST", "SUM", "AVERAGE"] as const;
export const PERFORMANCE_AGGREGATION_LABELS = {
  BEST: "Melhor tentativa",
  SUM: "Soma das tentativas",
  AVERAGE: "Média das tentativas",
} as const;

export const LIMITS = {
  maxTiebreakers: 12,
  maxStages: 4,
  points: { min: -10, max: 100 },
} as const;
