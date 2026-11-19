import { entryName, type RunDetail } from "./queries";
import {
  finalistIds,
  formatValue,
  isCircuit,
  maxAttemptsFor,
  preliminaryDone,
  rankPerformance,
  tiebreakerKeys,
  type AttemptStatus,
  type PerfConfig,
  type PerfRowStatus,
} from "./performance";

export type PerfAttemptView = {
  number: number;
  status: AttemptStatus;
  value: number | null;
  text: string;
};
export type PerfRowView = {
  id: string;
  name: string;
  position: number;
  status: PerfRowStatus;
  /** The result, formatted. */
  value: string;
  tied: boolean;
  attempts: PerfAttemptView[];
  /** Attempts this participant may have right now. */
  maxAttempts: number;
  finalist: boolean;
};
export type PerfView = {
  config: PerfConfig;
  rows: PerfRowView[];
  /** Everybody took the attempts all participants take. */
  prelimDone: boolean;
};

/** The ranking of a performance run, ready to show. Plain data. */
export function buildPerfView(
  run: RunDetail,
  config: PerfConfig,
  rules: { tiebreakers: unknown },
): PerfView {
  const parts = run.entries.map((e) => ({
    id: e.id,
    attempts: e.attempts.map((a) => ({
      number: a.number,
      status: a.status,
      value: a.value,
    })),
  }));
  const opts = {
    tiebreakers: tiebreakerKeys(rules),
    lotsSeed: run.drawSeed ?? 1,
  };
  const ranks = rankPerformance(config, parts, opts);
  const finalists = finalistIds(config, parts, opts);
  const byId = new Map(run.entries.map((e) => [e.id, e]));
  return {
    config,
    prelimDone: preliminaryDone(config, parts),
    rows: ranks.map((r) => {
      const e = byId.get(r.id)!;
      return {
        id: r.id,
        name: entryName(e),
        position: r.position,
        status: r.status,
        value: formatValue(
          isCircuit(config) ? "POINTS" : config.metric,
          r.value,
        ),
        tied: r.tied,
        attempts: e.attempts.map((a) => ({
          number: a.number,
          status: a.status,
          value: a.value,
          text:
            a.status !== "OK"
              ? a.status
              : isCircuit(config)
                ? `${a.value}º`
                : formatValue(config.metric, a.value),
        })),
        maxAttempts: maxAttemptsFor(config, parts, r.id, opts),
        finalist: finalists.has(r.id),
      };
    }),
  };
}
