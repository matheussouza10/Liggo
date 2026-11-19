/** Knockout ties played over several games: best of N, or two legs (home and away). Pure: no database. */

export type SeriesFormat = "BEST_OF" | "HOME_AWAY";
/** One game, from the point of view of the tie's home side (the first participant). */
export type SeriesGame = { home: number; away: number };

export type SeriesConfig = {
  format: SeriesFormat;
  /** Games of a best-of series (odd). Ignored for two legs. */
  bestOf: number;
  /** Two legs: a tie on aggregate goes to the team that scored more away goals. */
  awayGoals: boolean;
  /** A tie that is still level goes to penalties. */
  penalties: boolean;
};

export type SeriesOutcome = {
  /** What the tie shows as its score: games won (best of) or aggregate goals (two legs). */
  homeScore: number;
  awayScore: number;
  winner: "HOME" | "AWAY" | null;
  complete: boolean;
  /** Level after every game and the away goals rule: penalties must be entered. */
  needsPenalties: boolean;
  /** How it was decided, for the screen. */
  decidedBy: "GAMES" | "AGGREGATE" | "AWAY_GOALS" | "PENALTIES" | null;
  error: string | null;
};

/** Games a best-of series needs a side to win. */
export const gamesToWin = (bestOf: number) => Math.ceil(bestOf / 2);
/** Most games the series can have. */
export const maxGames = (c: SeriesConfig) =>
  c.format === "HOME_AWAY" ? 2 : c.bestOf;

const blank = (over: Partial<SeriesOutcome> = {}): SeriesOutcome => ({
  homeScore: 0,
  awayScore: 0,
  winner: null,
  complete: false,
  needsPenalties: false,
  decidedBy: null,
  error: null,
  ...over,
});

const validGame = (g: SeriesGame) =>
  Number.isInteger(g.home) &&
  Number.isInteger(g.away) &&
  g.home >= 0 &&
  g.away >= 0;

export function evaluateSeries(
  c: SeriesConfig,
  games: readonly SeriesGame[],
  penalties: SeriesGame | null = null,
): SeriesOutcome {
  if (
    c.format === "BEST_OF" &&
    (!Number.isInteger(c.bestOf) || c.bestOf < 1 || c.bestOf % 2 === 0)
  )
    return blank({ error: "Melhor de N exige um número ímpar de jogos." });
  for (let i = 0; i < games.length; i++)
    if (!validGame(games[i]))
      return blank({
        error: `Jogo ${i + 1}: use placares inteiros, sem números negativos.`,
      });
  if (games.length > maxGames(c))
    return blank({ error: `A série tem no máximo ${maxGames(c)} jogos.` });

  if (c.format === "BEST_OF") {
    const need = gamesToWin(c.bestOf);
    let home = 0;
    let away = 0;
    for (let i = 0; i < games.length; i++) {
      if (home === need || away === need)
        return blank({
          homeScore: home,
          awayScore: away,
          winner: home > away ? "HOME" : "AWAY",
          complete: true,
          decidedBy: "GAMES",
          error: `A série já terminou antes do jogo ${i + 1}.`,
        });
      if (games[i].home === games[i].away)
        return blank({
          homeScore: home,
          awayScore: away,
          error: `Jogo ${i + 1}: na série não há empate.`,
        });
      if (games[i].home > games[i].away) home++;
      else away++;
    }
    const done = home === need || away === need;
    return blank({
      homeScore: home,
      awayScore: away,
      winner: done ? (home > away ? "HOME" : "AWAY") : null,
      complete: done,
      decidedBy: done ? "GAMES" : null,
    });
  }

  // Two legs: aggregate, then away goals, then penalties.
  const homeAgg = games.reduce((t, g) => t + g.home, 0);
  const awayAgg = games.reduce((t, g) => t + g.away, 0);
  if (games.length < 2)
    return blank({ homeScore: homeAgg, awayScore: awayAgg });
  if (homeAgg !== awayAgg)
    return blank({
      homeScore: homeAgg,
      awayScore: awayAgg,
      winner: homeAgg > awayAgg ? "HOME" : "AWAY",
      complete: true,
      decidedBy: "AGGREGATE",
    });
  if (c.awayGoals) {
    // The tie's home side hosts leg 1 and is away in leg 2.
    const homeAway = games[1].home;
    const awayAway = games[0].away;
    if (homeAway !== awayAway)
      return blank({
        homeScore: homeAgg,
        awayScore: awayAgg,
        winner: homeAway > awayAway ? "HOME" : "AWAY",
        complete: true,
        decidedBy: "AWAY_GOALS",
      });
  }
  if (!c.penalties)
    return blank({
      homeScore: homeAgg,
      awayScore: awayAgg,
      error:
        "Empate no agregado: ative os pênaltis nas regras do evento para desempatar.",
    });
  if (!penalties)
    return blank({
      homeScore: homeAgg,
      awayScore: awayAgg,
      needsPenalties: true,
    });
  if (
    !Number.isInteger(penalties.home) ||
    !Number.isInteger(penalties.away) ||
    penalties.home < 0 ||
    penalties.away < 0
  )
    return blank({
      homeScore: homeAgg,
      awayScore: awayAgg,
      needsPenalties: true,
      error: "Pênaltis inválidos.",
    });
  if (penalties.home === penalties.away)
    return blank({
      homeScore: homeAgg,
      awayScore: awayAgg,
      needsPenalties: true,
      error: "Os pênaltis não podem terminar empatados.",
    });
  return blank({
    homeScore: homeAgg,
    awayScore: awayAgg,
    winner: penalties.home > penalties.away ? "HOME" : "AWAY",
    complete: true,
    decidedBy: "PENALTIES",
  });
}

/** The series configuration from the event rules, or null for single matches. */
export function seriesConfigOf(
  rules:
    | {
        matchFormat: string;
        bestOf: number | null;
        awayGoals: boolean;
        penalties: boolean;
      }
    | null
    | undefined,
): SeriesConfig | null {
  if (
    !rules ||
    (rules.matchFormat !== "BEST_OF" && rules.matchFormat !== "HOME_AWAY")
  )
    return null;
  return {
    format: rules.matchFormat,
    bestOf: rules.bestOf ?? 3,
    awayGoals: rules.awayGoals,
    penalties: rules.penalties,
  };
}
