"use client";

import { MapPinIcon, UserIcon, WifiOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EventIcon } from "@/components/competition/event-icon";
import { MatchStatsPanel } from "@/components/stats/match-stats-panel";
import { Badge } from "@/components/ui/badge";
import { formatKickoff } from "@/lib/competition/format";
import { describeEvent, elapsedMinutes } from "@/lib/competition/live";
import type { MatchSnapshot } from "@/lib/competition/live-queries";
import { cn } from "@/lib/utils";

const POLL_LIVE_MS = 3000;
const POLL_IDLE_MS = 20000;

/**
 * The live match page. Starts from the server render, then asks for news
 * every few seconds (and only while the tab is visible).
 */
export function LiveMatch({ initial }: { initial: MatchSnapshot }) {
  const [m, setM] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [gone, setGone] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const known = useRef(new Set(initial.events.map((e) => e.id)));
  const version = useRef(initial.version);
  const state = useRef(initial.state);
  useEffect(() => {
    state.current = m.state;
  }, [m.state]);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/watch/api/matches/${initial.id}`, {
            cache: "no-store",
          });
          if (res.status === 404) {
            setGone(true);
          } else if (res.ok) {
            const next = (await res.json()) as MatchSnapshot;
            setOffline(false);
            if (next.version !== version.current) {
              version.current = next.version;
              const added = next.events.filter((e) => !known.current.has(e.id));
              added.forEach((e) => known.current.add(e.id));
              if (added.length) {
                setFresh(new Set(added.map((e) => e.id)));
                const last = added[added.length - 1];
                const d = describeEvent(last, {
                  home: next.home,
                  away: next.away,
                });
                setAnnounce(
                  `${last.minute != null ? `${last.minute} minutos: ` : ""}${d.title}${d.detail ? `, ${d.detail}` : ""}. Placar ${next.scoreHome ?? 0} a ${next.scoreAway ?? 0}.`,
                );
                window.setTimeout(() => setFresh(new Set()), 6000);
              }
              setM(next);
            }
          } else {
            setOffline(true);
          }
        } catch {
          setOffline(true);
        }
      }
      const delay =
        state.current === "FINISHED" || state.current === "WALKOVER"
          ? POLL_IDLE_MS
          : POLL_LIVE_MS;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, POLL_LIVE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial.id]);

  useEffect(() => {
    if (m.state !== "LIVE") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [m.state]);

  const live = m.state === "LIVE";
  const names = { home: m.home, away: m.away };
  const score = m.scoreHome != null && m.scoreAway != null;
  const events = [...m.events].reverse();

  if (gone)
    return (
      <p className="liquid-card rounded-xl p-8 text-center text-muted-foreground">
        Este jogo não está mais disponível.
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      <section
        className="liquid-card rounded-2xl p-5 sm:p-8"
        aria-label="Placar"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {m.eventName} · {m.categoryName} · {m.label}
          </p>
          {live ? (
            <Badge className="gap-1.5 bg-red-600 text-white">
              <span
                className="size-2 animate-pulse rounded-full bg-white"
                aria-hidden
              />
              Ao vivo · {elapsedMinutes(m.startedAt, now)} min
            </Badge>
          ) : (
            <Badge variant="secondary">
              {m.state === "FINISHED"
                ? "Encerrado"
                : m.state === "WALKOVER"
                  ? "Encerrado por W.O."
                  : "Agendado"}
            </Badge>
          )}
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <p className="text-right font-display text-xl leading-tight font-bold uppercase sm:text-4xl">
            {m.home ?? "A definir"}
          </p>
          <p
            key={`${m.scoreHome}-${m.scoreAway}`}
            data-testid="public-score"
            className="animate-in zoom-in-75 rounded-2xl bg-muted/40 px-4 py-2 font-display text-4xl leading-none font-extrabold tabular-nums duration-300 sm:px-8 sm:py-3 sm:text-7xl"
          >
            {score ? `${m.scoreHome} x ${m.scoreAway}` : "x"}
          </p>
          <p className="font-display text-xl leading-tight font-bold uppercase sm:text-4xl">
            {m.away ?? "A definir"}
          </p>
        </div>
        {m.penaltiesHome != null && m.penaltiesAway != null ? (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Pênaltis: {m.penaltiesHome} x {m.penaltiesAway}
          </p>
        ) : null}

        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {m.scheduledAt ? <span>{formatKickoff(m.scheduledAt)}</span> : null}
          {m.venue ? (
            <span className="flex items-center gap-1">
              <MapPinIcon className="size-4" />
              {m.venue}
            </span>
          ) : null}
          {m.referee ? (
            <span className="flex items-center gap-1">
              <UserIcon className="size-4" />
              {m.referee}
            </span>
          ) : null}
        </p>
      </section>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {offline ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm"
        >
          <WifiOffIcon className="size-4" />
          Sem conexão. Tentando de novo…
        </p>
      ) : live ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-1.5 animate-pulse rounded-full bg-emerald-500"
            aria-hidden
          />
          Atualizando automaticamente
        </p>
      ) : null}

      {m.state !== "SCHEDULED" ? (
        <MatchStatsPanel
          home={m.home}
          away={m.away}
          events={m.events}
          possessionHome={m.possessionHome}
        />
      ) : null}

      <section aria-label="Lances" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Lance a lance
        </h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {m.state === "SCHEDULED"
              ? "O jogo ainda não começou."
              : "Nenhum lance registrado."}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {events.map((e) => {
              const d = describeEvent(e, names);
              return (
                <li
                  key={e.id}
                  data-testid="public-event"
                  className={cn(
                    "liquid-card flex items-center gap-3 rounded-xl px-4 py-3",
                    fresh.has(e.id) &&
                      "animate-in fade-in slide-in-from-top-4 border-primary/60 duration-500",
                  )}
                >
                  <span className="w-12 shrink-0 text-right text-base font-semibold tabular-nums">
                    {e.minute != null ? `${e.minute}'` : ""}
                  </span>
                  <EventIcon type={e.type} className="size-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{d.title}</span>
                    {d.detail ? (
                      <span className="block text-sm text-muted-foreground">
                        {d.detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
