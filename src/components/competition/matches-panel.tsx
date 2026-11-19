"use client";

import {
  evaluateSeries,
  type SeriesConfig,
  type SeriesOutcome,
} from "@/lib/competition/series";
import {
  evaluateSets,
  type SetsConfig,
  type SetsOutcome,
} from "@/lib/competition/sets";
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  ClipboardPenIcon,
  MapPinIcon,
  RadioIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import {
  autoScheduleAction,
  clearResultAction,
  saveResultAction,
  scheduleMatchAction,
} from "@/lib/competition/actions";
import { formatKickoff, toLocalInputs } from "@/lib/competition/format";
import type { MatchView } from "@/lib/competition/view";
import { useAction } from "./use-action";

type Referee = { id: string; name: string };
const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

export function MatchesPanel({
  eventId,
  runId,
  matches,
  groups,
  referees,
  knockout,
  penalties,
  setsConfig,
  series,
  live,
  eventStart,
  openMatch,
  onCloseMatch,
}: {
  eventId: string;
  runId: string;
  matches: MatchView[];
  groups: { id: string; name: string }[];
  referees: Referee[];
  knockout: boolean;
  penalties: boolean;
  setsConfig: SetsConfig | null;
  series: SeriesConfig | null;
  live: boolean;
  eventStart: string;
  openMatch: MatchView | null;
  onCloseMatch: () => void;
}) {
  const [result, setResult] = useState<MatchView | null>(null);
  const [schedule, setSchedule] = useState<MatchView | null>(null);
  const [auto, setAuto] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  const shown = matches.filter((m) => !onlyPending || m.status === "SCHEDULED");
  const rounds = [...new Set(shown.map((m) => m.label))];
  const groupName = (id: string | null) =>
    groups.find((g) => g.id === id)?.name;
  const pending = matches.filter((m) => m.status === "SCHEDULED").length;

  const current = openMatch ?? result;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {matches.length - pending} de {matches.length} jogos com resultado
          </Badge>
          <label className="flex items-center gap-2">
            <Switch
              checked={onlyPending}
              onCheckedChange={setOnlyPending}
              aria-label="Só pendentes"
            />
            Só pendentes
          </label>
        </div>
        {live && pending > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => setAuto(true)}
          >
            <CalendarPlusIcon data-icon="inline-start" />
            Agendar automaticamente
          </Button>
        ) : null}
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum jogo para mostrar.
        </p>
      ) : null}

      {rounds.map((label) => (
        <section key={label} aria-label={label} className="flex flex-col gap-2">
          <h3 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
            {label}
          </h3>
          <ul className="flex flex-col gap-2">
            {shown
              .filter((m) => m.label === label)
              .map((m) => {
                const ready = m.homeId && m.awayId;
                return (
                  <li
                    key={m.id}
                    className="liquid-card grid gap-3 rounded-xl p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                        <span
                          className={`truncate text-right ${m.winnerId && m.winnerId === m.homeId ? "font-semibold" : ""} ${!m.homeName ? "text-muted-foreground" : ""}`}
                        >
                          {m.homeName ?? "A definir"}
                        </span>
                        <span className="min-w-16 rounded-md bg-muted/40 px-2 py-1 text-center font-semibold tabular-nums">
                          {m.status === "SCHEDULED"
                            ? "x"
                            : `${m.homeScore} x ${m.awayScore}`}
                          {m.games.length ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {m.games
                                .map((x) => `${x.home}-${x.away}`)
                                .join(" · ")}
                            </span>
                          ) : null}
                          {m.sets.length ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {m.sets
                                .map((x) => `${x.home}-${x.away}`)
                                .join(" · ")}
                            </span>
                          ) : null}
                          {m.homePenalties != null ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              pên. {m.homePenalties} x {m.awayPenalties}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`truncate ${m.winnerId && m.winnerId === m.awayId ? "font-semibold" : ""} ${!m.awayName ? "text-muted-foreground" : ""}`}
                        >
                          {m.awayName ?? "A definir"}
                        </span>
                      </div>
                      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {groupName(m.groupId) ? (
                          <Badge variant="outline">
                            {groupName(m.groupId)}
                          </Badge>
                        ) : null}
                        {m.status === "WALKOVER" ? (
                          <Badge variant="outline">W.O.</Badge>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <CalendarClockIcon className="size-3.5" />
                          {m.scheduledAt
                            ? formatKickoff(m.scheduledAt)
                            : "Sem horário"}
                        </span>
                        {m.venue ? (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="size-3.5" />
                            {m.venue}
                          </span>
                        ) : null}
                        {m.refereeName ? (
                          <span className="flex items-center gap-1">
                            <UserIcon className="size-3.5" />
                            {m.refereeName}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {live || ready ? (
                      <div className="flex justify-end gap-2">
                        {ready ? (
                          <Link
                            href={`/events/${eventId}/matches/${m.id}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            <RadioIcon data-icon="inline-start" />
                            {m.status === "SCHEDULED" ? "Ao vivo" : "Lances"}
                          </Link>
                        ) : null}
                        {live ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSchedule(m)}
                            >
                              <CalendarClockIcon data-icon="inline-start" />
                              Agendar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!ready}
                              onClick={() => setResult(m)}
                              aria-label={`Resultado de ${m.homeName ?? "A definir"} x ${m.awayName ?? "A definir"}`}
                            >
                              <ClipboardPenIcon data-icon="inline-start" />
                              {m.status === "SCHEDULED"
                                ? "Resultado"
                                : "Corrigir"}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      {current ? (
        <ResultDialog
          key={current.id}
          eventId={eventId}
          match={current}
          knockout={knockout}
          penalties={penalties}
          setsConfig={setsConfig}
          series={series}
          onClose={() => {
            setResult(null);
            onCloseMatch();
          }}
        />
      ) : null}
      {schedule ? (
        <ScheduleDialog
          key={schedule.id}
          eventId={eventId}
          match={schedule}
          referees={referees}
          onClose={() => setSchedule(null)}
        />
      ) : null}
      {auto ? (
        <AutoDialog
          eventId={eventId}
          runId={runId}
          eventStart={eventStart}
          onClose={() => setAuto(false)}
        />
      ) : null}
    </div>
  );
}

export function ResultDialog({
  eventId,
  match,
  knockout,
  penalties,
  setsConfig,
  series,
  onClose,
}: {
  eventId: string;
  match: MatchView;
  knockout: boolean;
  penalties: boolean;
  setsConfig: SetsConfig | null;
  series: SeriesConfig | null;
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  // A knockout tie played over several games: one row per game.
  const [games, setGames] = useState<{ home: string; away: string }[]>(() =>
    match.games.length
      ? match.games.map((x) => ({ home: String(x.home), away: String(x.away) }))
      : [{ home: "", away: "" }],
  );
  const filledGames = games.filter((x) => x.home !== "" || x.away !== "");
  // Scored by sets: one row per set instead of a single score.
  const [sets, setSets] = useState<{ home: string; away: string }[]>(() =>
    match.sets.length
      ? match.sets.map((x) => ({ home: String(x.home), away: String(x.away) }))
      : [{ home: "", away: "" }],
  );
  const filled = sets.filter((x) => x.home !== "" || x.away !== "");
  const outcome = setsConfig
    ? evaluateSets(
        setsConfig,
        filled.map((x) => ({ home: Number(x.home), away: Number(x.away) })),
      )
    : null;
  const [home, setHome] = useState(
    match.homeScore != null ? String(match.homeScore) : "",
  );
  const [away, setAway] = useState(
    match.awayScore != null ? String(match.awayScore) : "",
  );
  const [hp, setHp] = useState(
    match.homePenalties != null ? String(match.homePenalties) : "",
  );
  const [ap, setAp] = useState(
    match.awayPenalties != null ? String(match.awayPenalties) : "",
  );
  const [wo, setWo] = useState<"" | "HOME" | "AWAY">("");
  const penPair =
    hp !== "" && ap !== "" ? { home: Number(hp), away: Number(ap) } : null;
  const seriesOutcome = series
    ? evaluateSeries(
        series,
        filledGames.map((x) => ({
          home: Number(x.home),
          away: Number(x.away),
        })),
        penPair,
      )
    : null;
  const tie =
    knockout && penalties && home !== "" && home === away && wo === "";
  const played = match.status !== "SCHEDULED" || match.games.length > 0;

  const save = () =>
    run(
      () =>
        saveResultAction(eventId, match.id, {
          homeScore: num(home),
          awayScore: num(away),
          homePenalties: series
            ? seriesOutcome?.needsPenalties ||
              seriesOutcome?.decidedBy === "PENALTIES"
              ? (penPair?.home ?? null)
              : null
            : tie
              ? num(hp)
              : null,
          awayPenalties: series
            ? seriesOutcome?.needsPenalties ||
              seriesOutcome?.decidedBy === "PENALTIES"
              ? (penPair?.away ?? null)
              : null
            : tie
              ? num(ap)
              : null,
          ...(series && wo === ""
            ? {
                games: filledGames.map((x) => ({
                  home: Number(x.home),
                  away: Number(x.away),
                })),
              }
            : {}),
          walkover: wo || null,
          ...(setsConfig && wo === ""
            ? {
                sets: filled.map((x) => ({
                  home: Number(x.home),
                  away: Number(x.away),
                })),
              }
            : {}),
        }),
      onClose,
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-dark sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resultado</DialogTitle>
          <DialogDescription>
            {match.homeName} x {match.awayName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="wo">W.O.</FieldLabel>
            <NativeSelect
              id="wo"
              className="w-full"
              value={wo}
              onChange={(e) => setWo(e.target.value as typeof wo)}
            >
              <NativeSelectOption value="">Jogo disputado</NativeSelectOption>
              <NativeSelectOption value="HOME">
                {match.homeName} vence por W.O.
              </NativeSelectOption>
              <NativeSelectOption value="AWAY">
                {match.awayName} vence por W.O.
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          {wo === "" && series && seriesOutcome ? (
            <SeriesForm
              config={series}
              homeName={match.homeName}
              awayName={match.awayName}
              games={games}
              onChange={setGames}
              outcome={seriesOutcome}
              penalties={{ home: hp, away: ap }}
              onPenalties={(h, a) => {
                setHp(h);
                setAp(a);
              }}
            />
          ) : wo === "" && setsConfig && outcome ? (
            <SetsForm
              config={setsConfig}
              homeName={match.homeName}
              awayName={match.awayName}
              sets={sets}
              onChange={setSets}
              outcome={outcome}
            />
          ) : wo === "" ? (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="score-home" className="truncate">
                  {match.homeName}
                </FieldLabel>
                <Input
                  id="score-home"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={home}
                  onChange={(e) => setHome(e.target.value)}
                  className="h-11 text-lg tabular-nums"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="score-away" className="truncate">
                  {match.awayName}
                </FieldLabel>
                <Input
                  id="score-away"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={away}
                  onChange={(e) => setAway(e.target.value)}
                  className="h-11 text-lg tabular-nums"
                />
              </Field>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              O placar do W.O. segue as regras do evento.
            </p>
          )}
          {tie ? (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="pen-home">
                  Pênaltis {match.homeName}
                </FieldLabel>
                <Input
                  id="pen-home"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  className="h-10 tabular-nums"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pen-away">
                  Pênaltis {match.awayName}
                </FieldLabel>
                <Input
                  id="pen-away"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={ap}
                  onChange={(e) => setAp(e.target.value)}
                  className="h-10 tabular-nums"
                />
              </Field>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          {played ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive"
              disabled={pending}
              onClick={() =>
                run(() => clearResultAction(eventId, match.id), onClose)
              }
            >
              Limpar resultado
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              (!!setsConfig && wo === "" && !outcome?.complete) ||
              (!!series &&
                wo === "" &&
                (!!seriesOutcome?.error || filledGames.length === 0))
            }
            onClick={save}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Salvar resultado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  eventId,
  match,
  referees,
  onClose,
}: {
  eventId: string;
  match: MatchView;
  referees: Referee[];
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  const initial = toLocalInputs(match.scheduledAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [venue, setVenue] = useState(match.venue ?? "");
  const [referee, setReferee] = useState(match.refereeId ?? "");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-dark sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar jogo</DialogTitle>
          <DialogDescription>
            {match.homeName ?? "A definir"} x {match.awayName ?? "A definir"}.
            Horário de Brasília.
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
              <FieldLabel htmlFor="sch-date">Data</FieldLabel>
              <Input
                id="sch-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sch-time">Hora</FieldLabel>
              <Input
                id="sch-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="sch-venue">Local</FieldLabel>
            <Input
              id="sch-venue"
              value={venue}
              maxLength={60}
              placeholder="Campo 1"
              onChange={(e) => setVenue(e.target.value)}
              className="h-10"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sch-ref">Árbitro</FieldLabel>
            <NativeSelect
              id="sch-ref"
              className="w-full"
              value={referee}
              onChange={(e) => setReferee(e.target.value)}
            >
              <NativeSelectOption value="">Sem árbitro</NativeSelectOption>
              {referees.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {r.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  scheduleMatchAction(eventId, match.id, {
                    date,
                    time,
                    venue,
                    refereeId: referee || null,
                  }),
                onClose,
              )
            }
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutoDialog({
  eventId,
  runId,
  eventStart,
  onClose,
}: {
  eventId: string;
  runId: string;
  eventStart: string;
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  const [startDate, setStartDate] = useState(eventStart);
  const [firstTime, setFirstTime] = useState("08:00");
  const [lastTime, setLastTime] = useState("18:00");
  const [slot, setSlot] = useState("90");
  const [venues, setVenues] = useState("Campo 1, Campo 2");
  const [assign, setAssign] = useState(true);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="theme-dark sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar automaticamente</DialogTitle>
          <DialogDescription>
            Distribui os jogos pendentes por data, horário e local. Cada rodada
            começa em um horário novo, então ninguém joga duas vezes ao mesmo
            tempo.
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
              <FieldLabel htmlFor="auto-date">Primeiro dia</FieldLabel>
              <Input
                id="auto-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="auto-slot">
                Duração do horário (min)
              </FieldLabel>
              <Input
                id="auto-slot"
                type="number"
                inputMode="numeric"
                min={10}
                max={480}
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="h-10 tabular-nums"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="auto-first">Primeiro jogo do dia</FieldLabel>
              <Input
                id="auto-first"
                type="time"
                value={firstTime}
                onChange={(e) => setFirstTime(e.target.value)}
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="auto-last">Último jogo do dia</FieldLabel>
              <Input
                id="auto-last"
                type="time"
                value={lastTime}
                onChange={(e) => setLastTime(e.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="auto-venues">
              Locais (separados por vírgula)
            </FieldLabel>
            <Input
              id="auto-venues"
              value={venues}
              onChange={(e) => setVenues(e.target.value)}
              className="h-10"
            />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={assign}
              onCheckedChange={setAssign}
              aria-label="Distribuir árbitros"
            />
            Distribuir árbitros automaticamente
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  autoScheduleAction(eventId, runId, {
                    startDate,
                    firstTime,
                    lastTime,
                    slotMinutes: Number(slot),
                    venues: venues
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                    assignReferees: assign,
                  }),
                onClose,
              )
            }
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Agendar jogos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Set by set entry: a row per set, with the running count and the reason a set is wrong. */
function SetsForm({
  config,
  homeName,
  awayName,
  sets,
  onChange,
  outcome,
}: {
  config: SetsConfig;
  homeName: string | null;
  awayName: string | null;
  sets: { home: string; away: string }[];
  onChange: (sets: { home: string; away: string }[]) => void;
  outcome: SetsOutcome;
}) {
  const limit = 2 * config.setsToWin - 1;
  const set = (i: number, side: "home" | "away", value: string) =>
    onChange(sets.map((x, k) => (k === i ? { ...x, [side]: value } : x)));
  return (
    <div className="flex flex-col gap-3" aria-label="Sets">
      <div className="grid grid-cols-[3.5rem_1fr_1fr] items-end gap-3 text-sm text-muted-foreground">
        <span />
        <span className="truncate">{homeName}</span>
        <span className="truncate">{awayName}</span>
      </div>
      {sets.map((x, i) => (
        <div
          key={i}
          className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-3"
        >
          <span className="text-sm font-medium">Set {i + 1}</span>
          <Input
            aria-label={`Set ${i + 1}, ${homeName}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={x.home}
            onChange={(e) => set(i, "home", e.target.value)}
            className="h-10 tabular-nums"
          />
          <Input
            aria-label={`Set ${i + 1}, ${awayName}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={x.away}
            onChange={(e) => set(i, "away", e.target.value)}
            className="h-10 tabular-nums"
          />
          {sets.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remover set ${i + 1}`}
              onClick={() => onChange(sets.filter((_, k) => k !== i))}
            >
              Remover
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {sets.length < limit && !outcome.complete ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...sets, { home: "", away: "" }])}
        >
          Adicionar set
        </Button>
      ) : null}
      <p
        role="status"
        className={
          outcome.error
            ? "text-sm text-destructive"
            : "text-sm text-muted-foreground"
        }
      >
        {outcome.error ??
          (outcome.complete
            ? `Resultado: ${outcome.homeSets} x ${outcome.awaySets} em sets.`
            : `Sets: ${outcome.homeSets} x ${outcome.awaySets}. Vence quem chegar a ${config.setsToWin}.`)}
      </p>
    </div>
  );
}

const DECIDED_BY = {
  GAMES: "pelos jogos vencidos",
  AGGREGATE: "no agregado",
  AWAY_GOALS: "pelo gol fora",
  PENALTIES: "nos pênaltis",
} as const;

/** Games of a knockout tie: best of N, or two legs. Each row is a game; scores follow the order of the names. */
function SeriesForm({
  config,
  homeName,
  awayName,
  games,
  onChange,
  outcome,
  penalties,
  onPenalties,
}: {
  config: SeriesConfig;
  homeName: string | null;
  awayName: string | null;
  games: { home: string; away: string }[];
  onChange: (games: { home: string; away: string }[]) => void;
  outcome: SeriesOutcome;
  penalties: { home: string; away: string };
  onPenalties: (home: string, away: string) => void;
}) {
  const twoLegs = config.format === "HOME_AWAY";
  const limit = twoLegs ? 2 : config.bestOf;
  const rows = twoLegs ? 2 : games.length;
  const list = Array.from(
    { length: rows },
    (_, i) => games[i] ?? { home: "", away: "" },
  );
  const setRow = (i: number, side: "home" | "away", value: string) =>
    onChange(list.map((x, k) => (k === i ? { ...x, [side]: value } : x)));
  return (
    <div className="flex flex-col gap-3" aria-label="Jogos da série">
      <div className="grid grid-cols-[5.5rem_1fr_1fr] items-end gap-3 text-sm text-muted-foreground">
        <span />
        <span className="truncate">{homeName}</span>
        <span className="truncate">{awayName}</span>
      </div>
      {list.map((x, i) => (
        <div
          key={i}
          className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-3"
        >
          <span className="text-sm font-medium">
            {twoLegs ? (i === 0 ? "Ida" : "Volta") : `Jogo ${i + 1}`}
          </span>
          <Input
            aria-label={`Jogo ${i + 1}, ${homeName}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={x.home}
            onChange={(e) => setRow(i, "home", e.target.value)}
            className="h-10 tabular-nums"
          />
          <Input
            aria-label={`Jogo ${i + 1}, ${awayName}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={x.away}
            onChange={(e) => setRow(i, "away", e.target.value)}
            className="h-10 tabular-nums"
          />
          {!twoLegs && list.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remover jogo ${i + 1}`}
              onClick={() => onChange(list.filter((_, k) => k !== i))}
            >
              Remover
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
      {twoLegs ? (
        <p className="text-xs text-muted-foreground">
          Ida: {homeName} é o mandante. Volta: {awayName} é o mandante. Informe
          os gols de cada time em cada jogo.
        </p>
      ) : list.length < limit && !outcome.complete ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...list, { home: "", away: "" }])}
        >
          Adicionar jogo
        </Button>
      ) : null}
      {outcome.needsPenalties || outcome.decidedBy === "PENALTIES" ? (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="series-pen-home">
              Pênaltis {homeName}
            </FieldLabel>
            <Input
              id="series-pen-home"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={penalties.home}
              onChange={(e) => onPenalties(e.target.value, penalties.away)}
              className="h-10 tabular-nums"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="series-pen-away">
              Pênaltis {awayName}
            </FieldLabel>
            <Input
              id="series-pen-away"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={penalties.away}
              onChange={(e) => onPenalties(penalties.home, e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
        </div>
      ) : null}
      <p
        role="status"
        className={
          outcome.error
            ? "text-sm text-destructive"
            : "text-sm text-muted-foreground"
        }
      >
        {outcome.error ??
          (outcome.complete
            ? `${outcome.winner === "HOME" ? homeName : awayName} vence ${DECIDED_BY[outcome.decidedBy ?? "GAMES"]}: ${outcome.homeScore} x ${outcome.awayScore}.`
            : outcome.needsPenalties
              ? `Agregado empatado em ${outcome.homeScore} x ${outcome.awayScore}: informe os pênaltis.`
              : `Placar da série: ${outcome.homeScore} x ${outcome.awayScore}. Salve cada jogo conforme acontecer.`)}
      </p>
    </div>
  );
}
