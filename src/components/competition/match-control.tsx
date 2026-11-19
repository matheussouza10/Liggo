"use client";

import {
  ExternalLinkIcon,
  FlagIcon,
  PlayIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  addMatchEventAction,
  deleteMatchEventAction,
  resetLiveAction,
  setPossessionAction,
  scoreSetPointAction,
  startMatchAction,
  type LiveResult,
} from "@/lib/competition/live-actions";
import {
  describeEvent,
  elapsedMinutes,
  EVENT_META,
  type MatchEventType,
} from "@/lib/competition/live";
import type { MatchSnapshot } from "@/lib/competition/live-queries";
import { formatKickoff } from "@/lib/competition/format";
import type { MatchView } from "@/lib/competition/view";
import { cn } from "@/lib/utils";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { EventIcon } from "./event-icon";
import type { SetsConfig } from "@/lib/competition/sets";
import { liveState } from "@/lib/competition/sets";
import { ResultDialog } from "./matches-panel";
import { useAction } from "./use-action";

type Player = { id: string; name: string; shirt: number | null };

const SIDE_BUTTONS: MatchEventType[] = [
  "GOAL",
  "FOUL",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
  "PENALTY_MISSED",
  "OWN_GOAL",
  "TIMEOUT",
  "INJURY",
];
const GENERAL_BUTTONS: MatchEventType[] = [
  "PERIOD_START",
  "PERIOD_END",
  "NOTE",
];

export function MatchControl({
  eventId,
  snapshot,
  homeRoster,
  awayRoster,
  publicVisible,
  ready,
  knockout,
  penalties,
  setsConfig,
  recordMethod,
}: {
  eventId: string;
  snapshot: MatchSnapshot;
  homeRoster: Player[];
  awayRoster: Player[];
  publicVisible: boolean;
  ready: boolean;
  knockout: boolean;
  penalties: boolean;
  setsConfig: SetsConfig | null;
  recordMethod: boolean;
}) {
  const s = snapshot;
  const live = s.state === "LIVE";
  const { pending, error, run } = useAction();
  const [adding, setAdding] = useState<{
    type: MatchEventType;
    side: "HOME" | "AWAY" | null;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, [live]);

  const call = (fn: () => Promise<LiveResult>, onOk?: () => void) =>
    run(fn, onOk);
  const newestFirst = [...s.events].reverse();
  const names = { home: s.home, away: s.away };

  // The result dialog wants a MatchView; the live score fills the fields.
  const asView: MatchView = {
    id: s.id,
    groupId: null,
    round: 0,
    position: 0,
    label: s.label,
    sets: s.sets,
    games: [],
    winMethod: s.winMethod,
    homeId: "home",
    awayId: "away",
    homeName: s.home,
    awayName: s.away,
    status: "SCHEDULED",
    homeScore: s.scoreHome,
    awayScore: s.scoreAway,
    homePenalties: null,
    awayPenalties: null,
    winnerId: null,
    scheduledAt: s.scheduledAt,
    venue: s.venue,
    refereeId: null,
    refereeName: s.referee,
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="liquid-card rounded-xl p-5" aria-label="Placar">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {s.eventName} · {s.categoryName} · {s.label}
          </p>
          <Badge variant={live ? "default" : "secondary"}>
            {live
              ? "Ao vivo"
              : s.state === "FINISHED"
                ? "Encerrado"
                : s.state === "WALKOVER"
                  ? "W.O."
                  : "Agendado"}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <p className="truncate text-right font-display text-2xl leading-none font-bold uppercase sm:text-4xl">
            {s.home ?? "A definir"}
          </p>
          <p
            data-testid="live-score"
            className="rounded-xl bg-muted/40 px-5 py-2 font-display text-4xl leading-none font-extrabold tabular-nums sm:text-6xl"
          >
            {s.scoreHome ?? "–"}{" "}
            <span className="text-muted-foreground">x</span>{" "}
            {s.scoreAway ?? "–"}
          </p>
          <p className="truncate font-display text-2xl leading-none font-bold uppercase sm:text-4xl">
            {s.away ?? "A definir"}
          </p>
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {s.scheduledAt ? formatKickoff(s.scheduledAt) : "Sem horário"}
          {s.venue ? ` · ${s.venue}` : ""}
          {live ? ` · ${elapsedMinutes(s.startedAt, now)} min de jogo` : ""}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {publicVisible ? (
            <Link
              href={`/watch/matches/${s.id}`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9",
              )}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              Página pública do jogo
            </Link>
          ) : (
            <Badge variant="outline">Evento oculto ao público</Badge>
          )}
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {s.state === "SCHEDULED" ? (
        <section className="liquid-card flex flex-col items-start gap-3 rounded-xl p-5">
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Começar o jogo
          </h2>
          <p className="text-sm text-muted-foreground">
            Ao iniciar, o jogo aparece como ao vivo na página pública e você
            passa a lançar os lances.
          </p>
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            disabled={!ready || pending}
            onClick={() => call(() => startMatchAction(eventId, s.id))}
          >
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlayIcon data-icon="inline-start" />
            )}
            Iniciar jogo
          </Button>
          {!ready ? (
            <p className="text-sm text-muted-foreground">
              Este jogo ainda não tem os dois participantes.
            </p>
          ) : null}
        </section>
      ) : null}

      {live && setsConfig ? (
        <SetsScoreboard
          config={setsConfig}
          sets={s.sets}
          home={s.home ?? "Mandante"}
          away={s.away ?? "Visitante"}
          pending={pending}
          onPoint={(side, delta) =>
            call(() => scoreSetPointAction(eventId, s.id, side, delta))
          }
          onFinish={() => setFinishing(true)}
        />
      ) : null}

      {live ? (
        <section aria-label="Lançar lance" className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {(["HOME", "AWAY"] as const).map((side) => (
              <div key={side} className="liquid-card rounded-xl p-4">
                <h3 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
                  {side === "HOME" ? s.home : s.away}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {SIDE_BUTTONS.filter(
                    (type) => !setsConfig || !EVENT_META[type].scores,
                  ).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      className="h-10 justify-start"
                      onClick={() => setAdding({ type, side })}
                      aria-label={`${EVENT_META[type].label} ${side === "HOME" ? "do mandante" : "do visitante"}`}
                    >
                      <EventIcon type={type} />
                      <span className="truncate">{EVENT_META[type].label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {GENERAL_BUTTONS.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setAdding({ type, side: null })}
              >
                <EventIcon type={type} />
                {EVENT_META[type].label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {s.state !== "SCHEDULED" ? (
        <PossessionControl
          key={`${s.id}-${s.possessionHome ?? "none"}`}
          eventId={eventId}
          matchId={s.id}
          initial={s.possessionHome}
          home={s.home ?? "Mandante"}
          away={s.away ?? "Visitante"}
        />
      ) : null}

      <MatchStatsPanel
        home={s.home}
        away={s.away}
        events={s.events}
        possessionHome={s.possessionHome}
      />

      <section aria-label="Lances" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Lances
        </h2>
        {newestFirst.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum lance ainda.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {newestFirst.map((e) => {
              const d = describeEvent(e, names);
              return (
                <li
                  key={e.id}
                  data-testid="timeline-item"
                  className="liquid-card flex items-center gap-3 rounded-xl px-3 py-2"
                >
                  <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {e.minute != null ? `${e.minute}'` : ""}
                  </span>
                  <EventIcon type={e.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{d.title}</span>
                    {d.detail ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.detail}
                      </span>
                    ) : null}
                  </span>
                  {live && EVENT_META[e.type].manual ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Excluir lance: ${d.title}`}
                      disabled={pending}
                      onClick={() =>
                        call(() => deleteMatchEventAction(eventId, s.id, e.id))
                      }
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {live ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="h-11 px-5"
            onClick={() => setFinishing(true)}
          >
            <FlagIcon data-icon="inline-start" />
            Encerrar jogo
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto h-11"
            onClick={() => setConfirmReset(true)}
          >
            <Undo2Icon data-icon="inline-start" />
            Desfazer início
          </Button>
        </div>
      ) : null}

      {adding ? (
        <LanceDialog
          key={`${adding.type}-${adding.side}`}
          eventId={eventId}
          matchId={s.id}
          type={adding.type}
          initialSide={adding.side}
          names={names}
          rosters={{ HOME: homeRoster, AWAY: awayRoster }}
          defaultMinute={elapsedMinutes(s.startedAt, now)}
          onClose={() => setAdding(null)}
        />
      ) : null}
      {finishing ? (
        <ResultDialog
          key="finish"
          eventId={eventId}
          match={asView}
          knockout={knockout}
          penalties={penalties}
          setsConfig={setsConfig}
          series={null}
          recordMethod={recordMethod}
          onClose={() => setFinishing(false)}
        />
      ) : null}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer o início do jogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os lances lançados são apagados e o jogo volta a ficar
              agendado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => call(() => resetLiveAction(eventId, s.id))}
            >
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LanceDialog({
  eventId,
  matchId,
  type,
  initialSide,
  names,
  rosters,
  defaultMinute,
  onClose,
}: {
  eventId: string;
  matchId: string;
  type: MatchEventType;
  initialSide: "HOME" | "AWAY" | null;
  names: { home: string | null; away: string | null };
  rosters: { HOME: Player[]; AWAY: Player[] };
  defaultMinute: number;
  onClose: () => void;
}) {
  const meta = EVENT_META[type];
  const { pending, error, run } = useAction();
  const [side, setSide] = useState<"HOME" | "AWAY" | "">(initialSide ?? "");
  const [minute, setMinute] = useState(String(defaultMinute));
  const [player, setPlayer] = useState("");
  const [other, setOther] = useState("");
  const [value, setValue] = useState("1");
  const [text, setText] = useState("");
  const roster = side ? rosters[side] : [];
  const label = (p: Player) =>
    `${p.shirt != null ? `#${p.shirt} ` : ""}${p.name}`;
  const sideEditable = meta.needsSide && !initialSide;

  const save = () =>
    run(
      () =>
        addMatchEventAction(eventId, matchId, {
          type,
          side: side || null,
          minute: minute.trim() === "" ? null : Number(minute),
          athleteId: player || null,
          otherAthleteId: other || null,
          value: Number(value) || 1,
          text,
        }),
      onClose,
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-dark sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EventIcon type={type} />
            {meta.label}
          </DialogTitle>
          <DialogDescription>
            {initialSide
              ? initialSide === "HOME"
                ? names.home
                : names.away
              : "Lance do jogo"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="lance-minute">Minuto</FieldLabel>
              <Input
                id="lance-minute"
                type="number"
                inputMode="numeric"
                min={0}
                max={300}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="h-10 tabular-nums"
              />
            </Field>
            {meta.scores ? (
              <Field>
                <FieldLabel htmlFor="lance-value">Pontos</FieldLabel>
                <Input
                  id="lance-value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-10 tabular-nums"
                />
              </Field>
            ) : null}
          </div>
          {sideEditable || (type === "NOTE" && !initialSide) ? (
            <Field>
              <FieldLabel htmlFor="lance-side">Time</FieldLabel>
              <NativeSelect
                id="lance-side"
                className="w-full"
                value={side}
                onChange={(e) => {
                  setSide(e.target.value as typeof side);
                  setPlayer("");
                  setOther("");
                }}
              >
                <NativeSelectOption value="">
                  {meta.needsSide ? "Escolha o time" : "Nenhum (lance geral)"}
                </NativeSelectOption>
                <NativeSelectOption value="HOME">
                  {names.home}
                </NativeSelectOption>
                <NativeSelectOption value="AWAY">
                  {names.away}
                </NativeSelectOption>
              </NativeSelect>
            </Field>
          ) : null}
          {meta.player !== "none" ? (
            <Field>
              <FieldLabel htmlFor="lance-player">
                {meta.playerLabel ?? "Atleta"}
                {meta.player === "optional" ? " (opcional)" : ""}
              </FieldLabel>
              <NativeSelect
                id="lance-player"
                className="w-full"
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                disabled={!side}
              >
                <NativeSelectOption value="">
                  {side ? "Escolha o atleta" : "Escolha o time antes"}
                </NativeSelectOption>
                {roster.map((p) => (
                  <NativeSelectOption
                    key={p.id}
                    value={p.id}
                    disabled={p.id === other}
                  >
                    {label(p)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          {meta.other !== "none" ? (
            <Field>
              <FieldLabel htmlFor="lance-other">
                {meta.otherLabel ?? "Outro atleta"}
                {meta.other === "optional" ? " (opcional)" : ""}
              </FieldLabel>
              <NativeSelect
                id="lance-other"
                className="w-full"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                disabled={!side}
              >
                <NativeSelectOption value="">
                  {side ? "Escolha o atleta" : "Escolha o time antes"}
                </NativeSelectOption>
                {roster.map((p) => (
                  <NativeSelectOption
                    key={p.id}
                    value={p.id}
                    disabled={p.id === player}
                  >
                    {label(p)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="lance-text">
              {type === "NOTE" ? "Descrição" : "Observação (opcional)"}
            </FieldLabel>
            <Input
              id="lance-text"
              value={text}
              maxLength={160}
              placeholder={type === "NOTE" ? "Bola na trave" : ""}
              onChange={(e) => setText(e.target.value)}
              className="h-10"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Records the ball possession of the match (home share; the away side is the rest). */
function PossessionControl({
  eventId,
  matchId,
  initial,
  home,
  away,
}: {
  eventId: string;
  matchId: string;
  initial: number | null;
  home: string;
  away: string;
}) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState(initial ?? 50);
  return (
    <section
      aria-label="Posse de bola"
      className="liquid-card flex flex-col gap-3 rounded-xl p-5"
    >
      <div>
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Posse de bola
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Arraste para a posse de {home}. A de {away} é o resto. Pode ser
          atualizada durante e depois do jogo.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={`Posse de bola de ${home}`}
          className="h-2 w-full max-w-md accent-[#3987e5]"
        />
        <span
          className="font-display text-2xl leading-none font-bold tabular-nums"
          data-testid="possession-readout"
        >
          {value}% x {100 - value}%
        </span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10"
          disabled={pending}
          onClick={() =>
            run(() => setPossessionAction(eventId, matchId, value))
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Salvar posse
        </Button>
        {initial != null ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            disabled={pending}
            onClick={() =>
              run(() => setPossessionAction(eventId, matchId, null))
            }
          >
            Não informar
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/** Point by point for sports scored by sets: big buttons for the table, the set closes by itself. */
function SetsScoreboard({
  config,
  sets,
  home,
  away,
  pending,
  onPoint,
  onFinish,
}: {
  config: SetsConfig;
  sets: { home: number; away: number }[];
  home: string;
  away: string;
  pending: boolean;
  onPoint: (side: "HOME" | "AWAY", delta: 1 | -1) => void;
  onFinish: () => void;
}) {
  const st = liveState(config, sets);
  const shown = st.complete ? st.finished.at(-1) : st.current;
  const number = st.complete ? st.finished.length : st.finished.length + 1;
  return (
    <section
      aria-label="Sets"
      className="liquid-card flex flex-col gap-4 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Set {number}
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="set-target">
          {st.complete
            ? "Jogo decidido"
            : `Set a ${st.target} pontos${config.winByTwo ? ", com 2 de diferença" : ""}`}
        </p>
      </div>
      <p
        data-testid="set-score"
        className="text-center font-display text-6xl leading-none font-extrabold tabular-nums sm:text-7xl"
      >
        {shown?.home ?? 0} <span className="text-muted-foreground">x</span>{" "}
        {shown?.away ?? 0}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["HOME", "AWAY"] as const).map((side) => (
          <div key={side} className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="h-16 text-lg"
              disabled={pending || st.complete}
              onClick={() => onPoint(side, 1)}
              aria-label={`Ponto para ${side === "HOME" ? home : away}`}
            >
              +1 {side === "HOME" ? home : away}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onPoint(side, -1)}
              aria-label={`Desfazer ponto de ${side === "HOME" ? home : away}`}
            >
              Desfazer ponto
            </Button>
          </div>
        ))}
      </div>
      <p
        className="text-center text-sm text-muted-foreground"
        data-testid="sets-summary"
      >
        Sets: {st.homeSets} x {st.awaySets}
        {st.finished.length
          ? ` · ${st.finished.map((x) => `${x.home}-${x.away}`).join(" · ")}`
          : ""}
      </p>
      {st.complete ? (
        <Button
          type="button"
          size="lg"
          className="h-11 self-center px-6"
          onClick={onFinish}
        >
          Confirmar resultado
        </Button>
      ) : null}
    </section>
  );
}
