import type { RulesInput, StageInput } from "./schema";
import type { TiebreakerKey, TiebreakerScope } from "./catalog";

/**
 * Starting points for an event's rules. Choosing one COPIES its values into
 * the event, which the organizer can then edit; later changes here never
 * touch existing events.
 *
 * `confidence` records how solid each preset is, from
 * docs/research/regras-de-competicao.md:
 *  - OFFICIAL: values read from the federation rulebook
 *  - PARTIAL: some values read from a rulebook, the rest is convention
 *  - CONVENTION: common practice; check the regulation of your competition
 */
export type PresetConfidence = "OFFICIAL" | "PARTIAL" | "CONVENTION";

export type RulePreset = {
  key: string;
  name: string;
  description: string;
  confidence: PresetConfidence;
  source: string;
  rules: RulesInput;
};

const tb = (key: TiebreakerKey, scope: TiebreakerScope = "OVERALL") => ({
  key,
  scope,
});

const stage = (
  type: StageInput["type"],
  over: Partial<StageInput> = {},
): StageInput => ({
  name: "",
  type,
  groupCount: null,
  groupSize: null,
  advancingPerGroup: null,
  roundRobinLegs: 1,
  swissRounds: null,
  thirdPlaceMatch: false,
  grandFinalMode: "NONE",
  seeding: "MANUAL",
  pairings: null,
  ...over,
});

const rules = (over: Partial<RulesInput>): RulesInput => ({
  presetKey: null,
  scoringModel: "POINTS",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowDraw: true,
  pointsTable: null,
  tiebreakers: [],
  woScoreFor: 3,
  woScoreAgainst: 0,
  woPointsAwarded: 3,
  woPointsPenalty: 0,
  woEliminationLimit: null,
  woNullifyResults: false,
  matchFormat: "SINGLE",
  bestOf: null,
  extraTime: false,
  penalties: false,
  awayGoals: false,
  sportConfig: null,
  placePoints: null,
  dropWorst: null,
  stages: [stage("ROUND_ROBIN", { name: "Pontos corridos" })],
  ...over,
});

const list: Array<Omit<RulePreset, "rules"> & { rules: Partial<RulesInput> }> =
  [
    {
      key: "generic",
      name: "Genérico (pontos)",
      description:
        "Ponto de partida neutro: 3 pontos por vitória, 1 por empate, pontos corridos.",
      confidence: "CONVENTION",
      source: "Convenção. Ajuste ao regulamento da sua competição.",
      rules: {
        tiebreakers: [
          tb("POINTS", "HEAD_TO_HEAD"),
          tb("WINS"),
          tb("SCORE_DIFF"),
          tb("SCORE_FOR"),
          tb("DRAW_LOTS"),
        ],
      },
    },
    {
      key: "football",
      name: "Futebol e futsal",
      description:
        "3-1-0, desempate por confronto direto e saldo, W.O. por 3 a 0.",
      confidence: "CONVENTION",
      source:
        "IFAB Law 10: só define que vence quem marca mais e que o empate é permitido. 3-1-0, desempates e W.O. são convenção (não confirmados em FIFA, UEFA ou CBF).",
      rules: {
        tiebreakers: [
          tb("POINTS", "HEAD_TO_HEAD"),
          tb("SCORE_DIFF", "HEAD_TO_HEAD"),
          tb("SCORE_FOR", "HEAD_TO_HEAD"),
          tb("SCORE_DIFF"),
          tb("SCORE_FOR"),
          tb("WINS"),
          tb("DRAW_LOTS"),
        ],
      },
    },
    {
      key: "basketball_fiba",
      name: "Basquete (FIBA)",
      description:
        "Vitória vale 2 pontos, derrota 1, W.O. 0. W.O. conta 20 a 0 e o 2º W.O. elimina.",
      confidence: "OFFICIAL",
      source:
        "FIBA Official Basketball Rules 2026, Apêndice D.1.1, D.1.3 a D.1.4 e art. 20.",
      rules: {
        winPoints: 2,
        drawPoints: 0,
        lossPoints: 1,
        allowDraw: false,
        tiebreakers: [
          tb("WINS", "HEAD_TO_HEAD"),
          tb("SCORE_DIFF", "HEAD_TO_HEAD"),
          tb("SCORE_FOR", "HEAD_TO_HEAD"),
          tb("SCORE_DIFF"),
          tb("SCORE_FOR"),
          tb("DRAW_LOTS"),
        ],
        woScoreFor: 20,
        woScoreAgainst: 0,
        woPointsAwarded: 2,
        woPointsPenalty: 0,
        woEliminationLimit: 2,
        woNullifyResults: true,
        extraTime: true,
      },
    },
    {
      key: "volleyball_fivb",
      name: "Vôlei (FIVB)",
      description:
        "Melhor de 5 sets. Vitória por 3-0 ou 3-1 vale 3 pontos, 3-2 vale 2, derrota por 2-3 vale 1.",
      confidence: "PARTIAL",
      source:
        "FIVB Mundial 2025, regulamento de competição art. 2.4 e 7.3 (pontos e W.O.); regra de jogo 6.3 (5º set a 15, diferença de 2). 25 pontos no set normal e os pontos do W.O. para quem ganha são deduções.",
      rules: {
        scoringModel: "SETS",
        winPoints: 3,
        drawPoints: 0,
        lossPoints: 0,
        allowDraw: false,
        pointsTable: [
          {
            label: "Vitória por 3-0",
            points: 3,
            when: { outcome: "WIN", setsFor: 3, setsAgainst: 0 },
          },
          {
            label: "Vitória por 3-1",
            points: 3,
            when: { outcome: "WIN", setsFor: 3, setsAgainst: 1 },
          },
          {
            label: "Vitória por 3-2",
            points: 2,
            when: { outcome: "WIN", setsFor: 3, setsAgainst: 2 },
          },
          {
            label: "Derrota por 2-3",
            points: 1,
            when: { outcome: "LOSS", setsFor: 2, setsAgainst: 3 },
          },
          {
            label: "Derrota por 1-3",
            points: 0,
            when: { outcome: "LOSS", setsFor: 1, setsAgainst: 3 },
          },
          {
            label: "Derrota por 0-3",
            points: 0,
            when: { outcome: "LOSS", setsFor: 0, setsAgainst: 3 },
          },
        ],
        tiebreakers: [
          tb("WINS"),
          tb("POINTS"),
          tb("SET_RATIO"),
          tb("POINT_RATIO"),
          tb("LAST_MATCH", "HEAD_TO_HEAD"),
          tb("EXTERNAL_RANKING"),
        ],
        woScoreFor: 3,
        woScoreAgainst: 0,
        woPointsAwarded: 3,
        woPointsPenalty: 0,
        matchFormat: "BEST_OF",
        bestOf: 5,
        sportConfig: {
          kind: "SETS",
          setsToWin: 3,
          pointsPerSet: 25,
          decidingSetPoints: 15,
          winByTwo: true,
        },
        stages: [
          stage("GROUPS", {
            name: "Fase de grupos",
            groupCount: 4,
            groupSize: 4,
            advancingPerGroup: 2,
          }),
          stage("SINGLE_ELIM", { name: "Mata-mata", thirdPlaceMatch: true }),
        ],
      },
    },
    {
      key: "racket_sets",
      name: "Raquete (por sets)",
      description:
        "Tênis, tênis de mesa, badminton, padel e similares: melhor de 3 sets em mata-mata.",
      confidence: "CONVENTION",
      source:
        "Convenção. Regras do ITF, ITTF e BWF não foram lidas na pesquisa. Ajuste os sets e os pontos (ex.: tênis de mesa é melhor de 5 sets a 11).",
      rules: {
        scoringModel: "SETS",
        winPoints: 1,
        drawPoints: 0,
        lossPoints: 0,
        allowDraw: false,
        tiebreakers: [
          tb("WINS"),
          tb("WINS", "HEAD_TO_HEAD"),
          tb("SET_RATIO"),
          tb("POINT_RATIO"),
          tb("DRAW_LOTS"),
        ],
        woScoreFor: 2,
        woScoreAgainst: 0,
        woPointsAwarded: 1,
        matchFormat: "BEST_OF",
        bestOf: 3,
        sportConfig: {
          kind: "SETS",
          setsToWin: 2,
          pointsPerSet: 21,
          decidingSetPoints: 21,
          winByTwo: true,
        },
        stages: [
          stage("SINGLE_ELIM", { name: "Mata-mata", seeding: "RANKING" }),
        ],
      },
    },
    {
      key: "combat",
      name: "Lutas e artes marciais",
      description: "Mata-mata de luta única, com disputa de 3º lugar.",
      confidence: "CONVENTION",
      source:
        "Convenção. Categorias de peso e regras de pontuação de cada luta não são cobertas.",
      rules: {
        winPoints: 1,
        drawPoints: 0,
        lossPoints: 0,
        allowDraw: false,
        tiebreakers: [tb("WINS"), tb("DRAW_LOTS")],
        woScoreFor: 1,
        woScoreAgainst: 0,
        woPointsAwarded: 1,
        stages: [
          stage("SINGLE_ELIM", {
            name: "Chave",
            thirdPlaceMatch: true,
            seeding: "RANDOM",
          }),
        ],
      },
    },
    {
      key: "esports",
      name: "E-sports (chave com melhor de N)",
      description:
        "Dupla eliminação, melhor de 3, final com jogo extra se vencer a chave inferior.",
      confidence: "CONVENTION",
      source:
        "Opções inspiradas na documentação do Challonge (grand_finals_modifier) e do Toornament (grand_final). Regulamentos de cada jogo não foram lidos.",
      rules: {
        winPoints: 1,
        drawPoints: 0,
        lossPoints: 0,
        allowDraw: false,
        tiebreakers: [tb("WINS"), tb("SCORE_DIFF"), tb("DRAW_LOTS")],
        woScoreFor: 2,
        woScoreAgainst: 0,
        woPointsAwarded: 1,
        matchFormat: "BEST_OF",
        bestOf: 3,
        stages: [
          stage("DOUBLE_ELIM", {
            name: "Chaves",
            grandFinalMode: "RESET",
            seeding: "RANKING",
          }),
        ],
      },
    },
    {
      key: "chess_swiss",
      name: "Xadrez (sistema suíço)",
      description:
        "Vitória 1, empate meio ponto, derrota 0, emparelhamento suíço com Buchholz.",
      confidence: "PARTIAL",
      source:
        "FIDE Handbook: Tie-Break Regulations (catálogo de critérios, ordem escolhida pelo organizador) e General Handling Rules for Swiss Tournaments. Número de rodadas fica por sua conta.",
      rules: {
        winPoints: 1,
        drawPoints: 0.5,
        lossPoints: 0,
        allowDraw: true,
        tiebreakers: [
          tb("BUCHHOLZ_CUT1"),
          tb("BUCHHOLZ"),
          tb("SONNEBORN_BERGER"),
          tb("WINS"),
          tb("DRAW_LOTS"),
        ],
        woScoreFor: 1,
        woScoreAgainst: 0,
        woPointsAwarded: 1,
        woPointsPenalty: 0,
        stages: [
          stage("SWISS", { name: "Suíço", swissRounds: 7, seeding: "RANKING" }),
        ],
      },
    },
    {
      key: "athletics_distance",
      name: "Atletismo: saltos e lançamentos",
      description:
        "3 tentativas, os 8 melhores fazem mais 3. Vale a melhor. Desempate pela 2ª e 3ª melhor.",
      confidence: "OFFICIAL",
      source:
        "World Athletics Competition and Technical Rules 2026, regras 25 (tentativas) e 25.22 (resultado e desempate).",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_BEST_ATTEMPT")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "DISTANCE",
          bestIs: "HIGHEST",
          attempts: 3,
          finalists: 8,
          extraAttempts: 3,
          aggregation: "BEST",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "athletics_height",
      name: "Atletismo: salto em altura e com vara",
      description:
        "Barra que sobe a cada rodada. Desempate por menos saltos na altura final e menos falhas.",
      confidence: "OFFICIAL",
      source:
        "World Athletics Competition and Technical Rules 2026, regras 26.8 e 26.9 (desempate e jump-off).",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("JUMPS_AT_FINAL_HEIGHT"), tb("TOTAL_FAILURES")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "HEIGHT",
          bestIs: "HIGHEST",
          attempts: 3,
          finalists: null,
          extraAttempts: null,
          aggregation: "BEST",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "race_time",
      name: "Corridas e provas por tempo",
      description:
        "Vence o menor tempo. Empate em tempo é resolvido por sorteio quando precisa avançar.",
      confidence: "PARTIAL",
      source:
        "World Athletics TR 20/21 (empate de posição e sorteio para avançar). Natação e corridas de rua não foram lidas na pesquisa.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "TIME",
          bestIs: "LOWEST",
          attempts: 1,
          finalists: null,
          extraAttempts: null,
          aggregation: "BEST",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "circuit_points",
      name: "Circuito por etapas (pontos por posição)",
      description:
        "Cada etapa dá pontos pela colocação; o ranking soma as etapas (6 de exemplo: ajuste). Tabela da Fórmula 1 como exemplo.",
      confidence: "PARTIAL",
      source:
        "FIA 2026 Formula 1 General Regulatory Provisions, A2.1.4 e A2.2.1 (coluna de 75% ou mais da distância). O descarte do pior resultado não tem fonte oficial: é requisito de produto.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_PLACES")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "HIGHEST",
          attempts: 6,
          finalists: null,
          extraAttempts: null,
          aggregation: "SUM",
        },
        placePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1].map((p, i) => ({
          place: i + 1,
          points: p,
        })),
        dropWorst: 0,
        stages: [stage("PERFORMANCE", { name: "Etapas" })],
      },
    },
    {
      key: "relay_time",
      name: "Revezamento (soma dos tempos das pernas)",
      description:
        "Cada equipe tem 4 pernas; o resultado é a soma dos tempos e vence o menor. Só classifica a equipe com todas as pernas.",
      confidence: "CONVENTION",
      source:
        "Convenção. Regras de passagem de bastão e desclassificação (World Athletics, World Aquatics) não foram lidas na pesquisa: lance DQ para desclassificar.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "TIME",
          bestIs: "LOWEST",
          attempts: 4,
          finalists: null,
          extraAttempts: null,
          aggregation: "SUM",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "judged_score",
      name: "Nota dos juízes (ginástica, patinação, saltos, dança...)",
      description:
        "Duas rotinas somam a nota; vence a maior soma. Ajuste o número de rotinas ou aparelhos nas tentativas.",
      confidence: "CONVENTION",
      source:
        "Convenção. Os códigos de pontuação de cada modalidade (FIG, World Skate, World Aquatics...) não foram lidos na pesquisa.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_BEST_ATTEMPT"), tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "HIGHEST",
          attempts: 2,
          finalists: null,
          extraAttempts: null,
          aggregation: "SUM",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "precision_score",
      name: "Precisão por pontos (tiro, arco, boliche)",
      description:
        "Séries de tentativas somadas; vence a maior soma. Desempate pela melhor série.",
      confidence: "CONVENTION",
      source:
        "Convenção. Regulamentos de tiro (ISSF), arco (World Archery) e boliche não foram lidos na pesquisa.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_BEST_ATTEMPT"), tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "HIGHEST",
          attempts: 3,
          finalists: null,
          extraAttempts: null,
          aggregation: "SUM",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "precision_low",
      name: "Menor pontuação vence (golfe, minigolfe)",
      description: "Rodadas somadas; vence o menor total de tacadas.",
      confidence: "CONVENTION",
      source:
        "Convenção. Regras do R&A/USGA e desempates de golfe (playoff) não foram lidas na pesquisa.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_BEST_ATTEMPT"), tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "LOWEST",
          attempts: 4,
          finalists: null,
          extraAttempts: null,
          aggregation: "SUM",
        },
        stages: [stage("PERFORMANCE", { name: "Rodadas" })],
      },
    },
    {
      key: "strength_lifts",
      name: "Levantamentos (powerlifting, halterofilismo)",
      description:
        "3 tentativas de carga em kg; vale a maior carga válida. Falhas entram como sem marca.",
      confidence: "CONVENTION",
      source:
        "Convenção. Regras da IPF e da IWF (desempate pelo menor peso corporal) não foram lidas na pesquisa: use sorteio ou ajuste.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("COUNTBACK_BEST_ATTEMPT"), tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "HIGHEST",
          attempts: 3,
          finalists: null,
          extraAttempts: null,
          aggregation: "BEST",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
    {
      key: "points_total",
      name: "Pontuação total (decatlo, heptatlo, CrossFit...)",
      description:
        "Cada participante recebe o total de pontos da prova; vence o maior total.",
      confidence: "CONVENTION",
      source:
        "Convenção. As tabelas de pontos do decatlo e do heptatlo (World Athletics) não foram lidas na pesquisa: informe o total já calculado.",
      rules: {
        scoringModel: "PERFORMANCE",
        tiebreakers: [tb("DRAW_LOTS")],
        sportConfig: {
          kind: "PERFORMANCE",
          metric: "POINTS",
          bestIs: "HIGHEST",
          attempts: 1,
          finalists: null,
          extraAttempts: null,
          aggregation: "BEST",
        },
        stages: [stage("PERFORMANCE", { name: "Prova" })],
      },
    },
  ];

export const PRESETS: RulePreset[] = list.map((p) => ({
  ...p,
  rules: rules({ ...p.rules, presetKey: p.key }),
}));

export const PRESET_BY_KEY = Object.fromEntries(
  PRESETS.map((p) => [p.key, p]),
) as Record<string, RulePreset>;

export const CONFIDENCE_LABELS: Record<PresetConfidence, string> = {
  OFFICIAL: "Regulamento oficial",
  PARTIAL: "Parcialmente oficial",
  CONVENTION: "Convenção",
};

function norm(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Picks the preset that best matches a sport (by name and category). */
export function suggestPresetKey(
  sportName: string,
  categoryName: string,
): string {
  const name = norm(sportName);
  const category = norm(categoryName);
  const has = (re: RegExp) => re.test(name);

  // Fights, wherever the category puts them (wheelchair fencing, para taekwondo).
  if (category.includes("artes marciais") || category.includes("lutas"))
    return "combat";
  if (has(/esgrima|taekwondo/)) return "combat";
  // Racket sports, including the adapted ones.
  if (category.includes("raquete") || has(/tenis|badminton/))
    return "racket_sets";
  if (category.includes("e-sports")) return "esports";
  if (category.includes("mentais")) {
    if (has(/xadrez|damas|^go$|shogi|xiangqi|gamao/)) return "chess_swiss";
    return has(/cubo/) ? "race_time" : "generic";
  }

  // Team games that live inside categories of races or scores.
  if (has(/polo aquatico|roller derby|curling|polo equestre|goalball/))
    return "generic";

  // Relays add the legs of a team.
  if (has(/revezamento/)) return "relay_time";

  // Judged by a panel.
  if (
    category.includes("ginastica") ||
    has(
      /natacao artistica|saltos ornamentais|patinacao artistica|skate park|skate street|bmx freestyle|adestramento|volteio|redeas|fisiculturismo|surfe|bodyboard|wakeboard|salto de esqui/,
    )
  )
    return "judged_score";

  // Precision and strength.
  if (has(/golfe|minigolfe|disc golf/)) return "precision_low";
  if (has(/tiro esportivo|tiro com arco|boliche|bolao/))
    return "precision_score";
  if (has(/powerlifting|levantamento|halterofilismo/)) return "strength_lifts";
  if (
    has(
      /decatlo|heptatlo|pentatlo|crossfit|strongman|cross training|fitness funcional|calistenia|street workout/,
    )
  )
    return "points_total";

  if (category.includes("motorizados")) return "circuit_points";

  if (category.includes("atletismo")) {
    if (has(/altura|vara/)) return "athletics_height";
    if (has(/salto|arremesso|lancamento/)) return "athletics_distance";
    return "race_time";
  }
  if (
    /aquaticos|ciclismo|inverno|aventura|multiesportes|equestres/.test(category)
  )
    return "race_time";
  // Adapted sports follow their base sport (below); the timed ones are races.
  if (
    category.includes("paralimpicos") &&
    has(/atletismo|natacao|paraciclismo/)
  )
    return "race_time";
  if (has(/hyrox|corrida fitness/)) return "race_time";

  if (/^basquete/.test(name)) return "basketball_fiba";
  if (/^volei/.test(name)) return "volleyball_fivb";
  if (/^(futebol|futsal)/.test(name)) return "football";
  return "generic";
}
