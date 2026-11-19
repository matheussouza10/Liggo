"use client";

import { MedalIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatValue,
  isCircuit,
  isCumulative,
  STATUS_LABELS,
  type AttemptStatus,
  type PerfMetric,
} from "@/lib/competition/performance";
import type { PerfRowView, PerfView } from "@/lib/competition/performance-view";
import { savePerformanceAttemptsAction } from "@/lib/competition/performance-actions";
import { useAction } from "./use-action";

const METRIC_HINT: Record<PerfMetric, string> = {
  TIME: "Tempo: 1:23.45 ou 83,45",
  DISTANCE: "Distância em metros: 7,85",
  HEIGHT: "Altura em metros: 2,31",
  POINTS: "Pontuação: 12,5",
};

const STATUS_BADGE: Record<string, string> = {
  OK: "",
  PENDING: "Aguardando",
  NM: "Sem marca",
  DNF: "DNF",
  DNS: "DNS",
  DQ: "DQ",
};

/** Text to show again in an input. */
const inputText = (metric: PerfMetric, v: number | null) =>
  v === null
    ? ""
    : metric === "TIME"
      ? formatValue("TIME", v)
      : String(v).replace(".", ",");

/** Ranking of a performance event, with the attempts of each participant. `editable` shows the entry buttons. */
export function PerformancePanel({
  eventId,
  view,
  editable,
}: {
  eventId: string;
  view: PerfView;
  editable: boolean;
}) {
  const [editing, setEditing] = useState<PerfRowView | null>(null);
  const { config } = view;
  const circuit = isCircuit(config);
  const bar = view.bar;
  const relay = isCumulative(config);
  return (
    <section aria-label="Resultados" className="flex flex-col gap-4">
      {relay ? (
        <p className="text-sm text-muted-foreground">
          {config.attempts} pernas por equipe. O resultado é a soma dos tempos:
          a equipe só é classificada quando todas as pernas tiverem tempo.
        </p>
      ) : bar ? (
        <p className="text-sm text-muted-foreground">
          Barra progressiva: lance cada salto com a altura e se passou (O) ou
          falhou (X). Quem passa uma altura não lança salto nela. Três falhas
          seguidas eliminam. O resultado é a maior altura saltada.
        </p>
      ) : circuit ? (
        <p className="text-sm text-muted-foreground">
          {config.attempts} etapas. Informe a posição de cada participante em
          cada etapa. Pontos por colocação:{" "}
          {(config.placePoints ?? [])
            .map((p) => `${p.place}º ${p.points}`)
            .join(", ")}
          .{" "}
          {config.dropWorst
            ? `Os ${config.dropWorst} piores resultados são descartados.`
            : "Todas as etapas contam."}
        </p>
      ) : config.finalists && config.extraAttempts ? (
        <p className="text-sm text-muted-foreground">
          {config.attempts} tentativas para todos. Depois que todos terminarem,
          os {config.finalists} melhores fazem mais {config.extraAttempts}.
          {view.prelimDone ? " As tentativas extras já estão liberadas." : ""}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {config.attempts} {config.attempts === 1 ? "tentativa" : "tentativas"}{" "}
          por participante.
        </p>
      )}
      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Participante</TableHead>
              <TableHead>
                {relay ? "Pernas" : circuit ? "Etapas" : "Tentativas"}
              </TableHead>
              <TableHead className="w-32 text-right">
                {circuit ? "Pontos" : "Resultado"}
              </TableHead>
              {editable ? <TableHead className="w-28" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">
                  {r.status === "OK" && r.position <= 3 ? (
                    <MedalIcon
                      className="size-4"
                      aria-label={`${r.position}º lugar`}
                    />
                  ) : null}
                  {r.status === "OK" ? r.position : "–"}
                </TableCell>
                <TableCell className="font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {r.name}
                    {r.tied ? <Badge variant="outline">Empate</Badge> : null}
                    {config.finalists && view.prelimDone && r.finalist ? (
                      <Badge variant="secondary">Finalista</Badge>
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {r.attempts.length
                    ? r.attempts.map((a) => a.text).join(" · ")
                    : "–"}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {r.status === "OK" ? (
                    r.value
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground">
                      {STATUS_BADGE[r.status]}
                    </span>
                  )}
                </TableCell>
                {editable ? (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Lançar tentativas de ${r.name}`}
                      onClick={() => setEditing(r)}
                    >
                      <PencilIcon data-icon="inline-start" />
                      Lançar
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing ? (
        <AttemptsDialog
          key={editing.id}
          eventId={eventId}
          row={editing}
          metric={config.metric}
          circuit={circuit}
          bar={bar}
          relay={relay}
          cutNote={!!(config.finalists && config.extraAttempts)}
          attempts={config.attempts}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

type Draft = { status: AttemptStatus; value: string };

function AttemptsDialog({
  eventId,
  row,
  metric,
  circuit,
  bar,
  relay,
  cutNote,
  attempts,
  onClose,
}: {
  eventId: string;
  row: PerfRowView;
  metric: PerfMetric;
  circuit: boolean;
  bar: boolean;
  relay: boolean;
  cutNote: boolean;
  attempts: number;
  onClose: () => void;
}) {
  const { pending, error, setError, run } = useAction();
  // A bar competition has no fixed number of jumps: show what exists plus a free line.
  const slots = bar
    ? Math.max(3, row.attempts.length + 1)
    : Math.max(row.maxAttempts, row.attempts.length);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    Array.from({ length: slots }, (_, i) => ({
      status: row.attempts[i]?.status ?? "OK",
      value: circuit
        ? String(row.attempts[i]?.value ?? "")
        : inputText(metric, row.attempts[i]?.value ?? null),
    })),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const set = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const save = () => {
    setLocalError(null);
    setError(null);
    // Attempts are taken in order: drop the empty ones at the end, none may be empty in the middle.
    // Which statuses carry a value: a valid mark, or (in a bar competition) a missed jump.
    const needsValue = (d: Draft) =>
      d.status === "OK" || (bar && d.status === "NM");
    const filled = drafts.map((d) => !needsValue(d) || d.value.trim() !== "");
    const last = filled.lastIndexOf(true);
    const list = drafts.slice(0, last + 1);
    const hole = list.findIndex((d) => needsValue(d) && d.value.trim() === "");
    if (hole >= 0)
      return setLocalError(`A tentativa ${hole + 1} está em branco.`);
    run(
      () => savePerformanceAttemptsAction(eventId, row.id, { attempts: list }),
      onClose,
    );
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-dark sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{circuit ? "Etapas" : "Tentativas"}</DialogTitle>
          <DialogDescription>
            {row.name}.{" "}
            {bar
              ? "Altura do salto em metros (ex.: 2,15) e se passou ou falhou."
              : circuit
                ? "Posição na etapa: 1, 2, 3..."
                : `${METRIC_HINT[metric]}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {error || localError ? (
            <Alert variant="destructive">
              <AlertDescription>{localError ?? error}</AlertDescription>
            </Alert>
          ) : null}
          {drafts.map((d, i) => (
            <div
              key={i}
              className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-3"
            >
              <span className="text-sm font-medium">
                {bar
                  ? `Salto ${i + 1}`
                  : relay
                    ? `Perna ${i + 1}`
                    : circuit
                      ? `Etapa ${i + 1}`
                      : `${i + 1}ª`}
                {cutNote && i >= attempts ? " extra" : ""}
              </span>
              <NativeSelect
                aria-label={`Situação da tentativa ${i + 1}`}
                className="w-full"
                value={d.status}
                onChange={(e) =>
                  set(i, { status: e.target.value as AttemptStatus })
                }
              >
                {(Object.keys(STATUS_LABELS) as AttemptStatus[]).map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {bar && s === "OK"
                      ? "Passou a altura (O)"
                      : bar && s === "NM"
                        ? "Falhou (X)"
                        : STATUS_LABELS[s]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                aria-label={`Valor da tentativa ${i + 1}`}
                value={d.value}
                disabled={d.status !== "OK" && !(bar && d.status === "NM")}
                onChange={(e) => set(i, { value: e.target.value })}
                className="h-10 tabular-nums"
                inputMode="decimal"
              />
            </div>
          ))}
          {bar ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                setDrafts((d) => [...d, { status: "OK", value: "" }])
              }
            >
              Adicionar salto
            </Button>
          ) : null}
          {cutNote && row.maxAttempts === attempts ? (
            <p className="text-xs text-muted-foreground">
              As tentativas extras abrem para os finalistas depois que todos
              terminarem as {attempts} primeiras.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Salvar tentativas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
