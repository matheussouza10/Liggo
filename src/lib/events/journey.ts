/** The organizer's path through an event, from setup to the final. Pure: no database. */

export type JourneyStage = {
  id: string;
  name: string;
  type:
    | "ROUND_ROBIN"
    | "GROUPS"
    | "SINGLE_ELIM"
    | "DOUBLE_ELIM"
    | "SWISS"
    | "PERFORMANCE";
  groupCount: number | null;
  swissRounds: number | null;
};
export type JourneyRun = {
  stageId: string;
  categoryId: string;
  status: "DRAWN" | "LIVE" | "DONE";
  matches: number;
  played: number;
};
export type JourneyInput = {
  startDate: Date;
  now: Date;
  categories: { id: string; name: string; registrations: number }[];
  hasRules: boolean;
  stages: JourneyStage[];
  runs: JourneyRun[];
  pendingRequests: number;
  registrationOpen: boolean;
  publicVisible: boolean;
};

export type StepState = "done" | "current" | "todo" | "blocked";
export type JourneyStep = {
  key:
    | "rules"
    | "categories"
    | "registrations"
    | "draw"
    | "matches"
    | "publish"
    | "finish";
  title: string;
  state: StepState;
  /** One sentence about where this step is. */
  detail: string;
  /** Where to go next, relative to the event. */
  action: { label: string; path: string } | null;
};
export type JourneyWarning = { key: string; text: string; path: string | null };
export type Journey = {
  steps: JourneyStep[];
  warnings: JourneyWarning[];
  progress: number;
  next: JourneyStep | null;
};

/** Fewest participants the first stage needs to be generated. */
export function minParticipants(stage: JourneyStage | undefined): number {
  if (!stage) return 2;
  if (stage.type === "GROUPS") return (stage.groupCount ?? 2) * 2;
  if (stage.type === "DOUBLE_ELIM") return 3;
  if (stage.type === "PERFORMANCE") return 1;
  return 2;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
const names = (list: string[]) =>
  list.length <= 3
    ? list.join(", ")
    : `${list.slice(0, 3).join(", ")} e mais ${list.length - 3}`;
const DAY = 24 * 60 * 60 * 1000;

export function buildJourney(input: JourneyInput): Journey {
  const { categories, stages, runs } = input;
  const first = stages[0];
  const need = minParticipants(first);
  const total = categories.reduce((t, c) => t + c.registrations, 0);
  const ready = categories.filter((c) => c.registrations >= need);
  const short = categories.filter(
    (c) => c.registrations > 0 && c.registrations < need,
  );
  const empty = categories.filter((c) => c.registrations === 0);

  const firstRuns = first ? runs.filter((r) => r.stageId === first.id) : [];
  const drawnIds = new Set(firstRuns.map((r) => r.categoryId));
  const toDraw = ready.filter((c) => !drawnIds.has(c.id));
  const expectedRuns = stages.length * ready.length;
  const doneRuns = runs.filter((r) => r.status === "DONE").length;
  const totalMatches = runs.reduce((t, r) => t + r.matches, 0);
  const playedMatches = runs.reduce((t, r) => t + r.played, 0);
  const allDone =
    ready.length > 0 &&
    stages.length > 0 &&
    stages.every((s) =>
      ready.every((c) =>
        runs.some(
          (r) =>
            r.stageId === s.id && r.categoryId === c.id && r.status === "DONE",
        ),
      ),
    );

  const steps: JourneyStep[] = [];
  const rulesDone = input.hasRules && stages.length > 0;
  steps.push({
    key: "rules",
    title: "Regras e fases",
    state: rulesDone ? "done" : "current",
    detail: rulesDone
      ? `${plural(stages.length, "fase", "fases")} configurada${stages.length === 1 ? "" : "s"}.`
      : "Defina a pontuação, o desempate e as fases do evento.",
    action: rulesDone
      ? { label: "Ver regras", path: "/rules" }
      : { label: "Configurar regras", path: "/rules" },
  });
  steps.push({
    key: "categories",
    title: "Categorias",
    state: categories.length > 0 ? "done" : "todo",
    detail:
      categories.length > 0
        ? `${plural(categories.length, "categoria", "categorias")}: ${names(categories.map((c) => c.name))}.`
        : "Crie ao menos uma categoria (sexo, idade, tamanho do elenco).",
    action: { label: "Categorias", path: "/categories" },
  });

  const regDone = ready.length > 0 && short.length === 0 && empty.length === 0;
  steps.push({
    key: "registrations",
    title: "Inscrições",
    state: regDone
      ? "done"
      : categories.length === 0 || !rulesDone
        ? "todo"
        : "current",
    detail:
      total === 0
        ? "Nenhuma inscrição ainda. Inscreva times e atletas ou abra as inscrições públicas."
        : `${plural(total, "inscrição", "inscrições")}. ${ready.length} de ${categories.length} ${categories.length === 1 ? "categoria" : "categorias"} com o mínimo para a 1ª fase (${need}).`,
    action: {
      label: total === 0 ? "Inscrever" : "Ver inscrições",
      path: "/registrations",
    },
  });

  const drawDone = ready.length > 0 && toDraw.length === 0;
  steps.push({
    key: "draw",
    title: "Sorteio",
    state: drawDone ? "done" : ready.length === 0 ? "blocked" : "current",
    detail:
      ready.length === 0
        ? "Depende de ter categorias com inscrições suficientes."
        : drawDone
          ? "Todas as categorias prontas já foram sorteadas."
          : `Falta sortear ${names(toDraw.map((c) => c.name))}.`,
    action:
      ready.length === 0 ? null : { label: "Abrir fases", path: "/stages" },
  });

  const matchesDone = allDone;
  steps.push({
    key: "matches",
    title: "Jogos e resultados",
    state: matchesDone ? "done" : !drawDone ? "blocked" : "current",
    detail: !drawDone
      ? "Começa depois do sorteio."
      : totalMatches === 0
        ? "Gere os jogos (ou inicie a prova) e lance os resultados."
        : `${playedMatches} de ${totalMatches} jogos com resultado.`,
    action: !drawDone ? null : { label: "Fases e jogos", path: "/stages" },
  });

  const publishDone =
    input.publicVisible && (input.registrationOpen || total > 0);
  steps.push({
    key: "publish",
    title: "Divulgação",
    state: publishDone ? "done" : "todo",
    detail: input.publicVisible
      ? input.registrationOpen
        ? "Evento público e com inscrições abertas."
        : "Evento aparece na página pública."
      : "O evento está oculto da página pública.",
    action: { label: "Divulgar", path: "#public-heading" },
  });

  steps.push({
    key: "finish",
    title: "Encerramento",
    state: allDone ? "done" : "blocked",
    detail: allDone
      ? "Todas as fases foram concluídas."
      : expectedRuns > 0
        ? `${doneRuns} de ${expectedRuns} fases concluídas.`
        : "Conclua todas as fases de todas as categorias.",
    action: allDone ? { label: "Estatísticas", path: "/stats" } : null,
  });

  // The next thing to do: the first step still open that is not blocked.
  const next =
    steps.find((s) => s.state === "current") ??
    steps.find((s) => s.state === "todo" && s.key !== "publish") ??
    null;
  if (next && next.state === "todo") next.state = "current";

  const warnings: JourneyWarning[] = [];
  if (input.pendingRequests > 0)
    warnings.push({
      key: "requests",
      text: `${plural(input.pendingRequests, "pedido de inscrição aguarda", "pedidos de inscrição aguardam")} a sua resposta.`,
      path: "/requests",
    });
  if (short.length > 0)
    warnings.push({
      key: "short",
      text: `${names(short.map((c) => c.name))} ${short.length === 1 ? "tem" : "têm"} menos de ${need} inscritos, o mínimo para a 1ª fase${first ? ` (${first.name})` : ""}.`,
      path: "/registrations",
    });
  if (empty.length > 0 && total > 0)
    warnings.push({
      key: "empty",
      text: `Sem inscrições: ${names(empty.map((c) => c.name))}. Categorias sem inscritos não geram jogos.`,
      path: "/categories",
    });
  if (first?.type === "SWISS" && ready.some((c) => c.registrations % 2 === 1))
    warnings.push({
      key: "swiss-odd",
      text: "Há categorias com número ímpar de participantes: a cada rodada do suíço um participante folga e recebe os pontos de W.O.",
      path: null,
    });
  if (first?.type === "SWISS" && first.swissRounds)
    for (const c of ready) {
      const max =
        c.registrations % 2 === 0 ? c.registrations - 1 : c.registrations;
      if (first.swissRounds > max)
        warnings.push({
          key: `swiss-rounds-${c.id}`,
          text: `${c.name}: ${first.swissRounds} rodadas de suíço pedem mais participantes (máximo ${max} com ${c.registrations}).`,
          path: "/rules",
        });
    }
  if (input.registrationOpen && !input.publicVisible)
    warnings.push({
      key: "hidden-open",
      text: "As inscrições estão abertas, mas o evento está oculto da página pública. O link de inscrição funciona, mas o evento não aparece na lista.",
      path: "#public-heading",
    });
  const daysToStart = Math.ceil(
    (input.startDate.getTime() - input.now.getTime()) / DAY,
  );
  if (daysToStart >= 0 && daysToStart <= 7 && !drawDone)
    warnings.push({
      key: "soon",
      text: `O evento começa em ${daysToStart === 0 ? "hoje" : plural(daysToStart, "dia", "dias")} e o sorteio ainda não foi feito.`,
      path: "/stages",
    });
  if (daysToStart < 0 && !allDone && drawDone === false && total > 0)
    warnings.push({
      key: "late",
      text: "A data de início já passou e o evento ainda não começou.",
      path: "/edit",
    });

  const countable = steps.filter((s) => s.key !== "publish");
  const progress = Math.round(
    (countable.filter((s) => s.state === "done").length / countable.length) *
      100,
  );
  return { steps, warnings, progress, next };
}
