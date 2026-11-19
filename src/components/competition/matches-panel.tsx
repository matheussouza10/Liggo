"use client";

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
  onClose,
}: {
  eventId: string;
  match: MatchView;
  knockout: boolean;
  penalties: boolean;
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
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
  const tie =
    knockout && penalties && home !== "" && home === away && wo === "";
  const played = match.status !== "SCHEDULED";

  const save = () =>
    run(
      () =>
        saveResultAction(eventId, match.id, {
          homeScore: num(home),
          awayScore: num(away),
          homePenalties: tie ? num(hp) : null,
          awayPenalties: tie ? num(ap) : null,
          walkover: wo || null,
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
          {wo === "" ? (
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
          <Button type="button" disabled={pending} onClick={save}>
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
