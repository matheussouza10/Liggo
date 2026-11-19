"use client";

import { DicesIcon, FastForwardIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EntryView } from "@/lib/competition/view";
import { cn } from "@/lib/utils";

/** team: drawing the team, group: drawing its group, slot: drawing its slot, land: placed. */
type Phase = "team" | "group" | "slot" | "land";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const randomOrder = <T,>(items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Replays a draw that is already saved. Teams come out in random order; for
 * each one the group is drawn, then a free slot inside it, and the team lands
 * in the saved place. The result never depends on this component.
 */
export function DrawReveal({
  entries,
  groups,
  onFinish,
}: {
  entries: EntryView[];
  groups: { id: string; name: string }[];
  onFinish: () => void;
}) {
  const isGroups = groups.length > 0;
  const placeable = useMemo(
    () => entries.filter((e) => !isGroups || e.groupId),
    [entries, isGroups],
  );
  // A random order of teams, fixed for the whole animation.
  const [order] = useState(() => randomOrder(placeable));
  const total = order.length;
  const slotsPerGroup = isGroups
    ? Math.max(0, ...entries.map((e) => e.position + 1))
    : total;

  const [reduced] = useState(reducedMotion);
  const [step, setStep] = useState(reduced ? total : 0);
  const [phase, setPhase] = useState<Phase>("team");
  const [rolling, setRolling] = useState("");
  const [focusGroup, setFocusGroup] = useState<number | null>(null);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const [fast, setFast] = useState(false);
  const finished = step >= total;

  // Roughly 25 seconds for the whole draw, never too slow or too fast per team.
  const perTeam = Math.min(1800, Math.max(900, 25000 / Math.max(total, 1)));

  useEffect(() => {
    if (finished) return;
    const current = order[step];
    const k = fast ? 0.35 : 1;
    const t1 = perTeam * 0.36 * k;
    const t2 = perTeam * (isGroups ? 0.24 : 0) * k;
    const t3 = perTeam * 0.28 * k;
    const t4 = perTeam * 0.12 * k;
    const timers: number[] = [];
    const intervals: number[] = [];
    const stopRolling = () => {
      intervals.forEach(clearInterval);
      intervals.length = 0;
    };
    const pool = order.slice(step).map((e) => e.name);
    const targetGroup = isGroups
      ? groups.findIndex((g) => g.id === current.groupId)
      : -1;
    // Free slots of the team's group (or of the whole list), the target included.
    const placedBefore = new Set(order.slice(0, step).map((e) => e.id));
    const free = entries
      .filter(
        (e) =>
          (!isGroups || e.groupId === current.groupId) &&
          !placedBefore.has(e.id),
      )
      .map((e) => e.position);

    intervals.push(
      window.setInterval(
        () => setRolling(pool[Math.floor(Math.random() * pool.length)]),
        70,
      ),
    );
    timers.push(
      window.setTimeout(() => {
        stopRolling();
        setRolling(current.name);
        if (isGroups) {
          setPhase("group");
          let i = Math.floor(Math.random() * groups.length);
          setFocusGroup(i);
          intervals.push(
            window.setInterval(() => {
              i = (i + 1) % groups.length;
              setFocusGroup(i);
            }, 90),
          );
        }
      }, t1),
    );
    timers.push(
      window.setTimeout(() => {
        stopRolling();
        setFocusGroup(targetGroup >= 0 ? targetGroup : null);
        setPhase("slot");
        let i = Math.floor(Math.random() * free.length);
        setFocusSlot(free[i]);
        intervals.push(
          window.setInterval(() => {
            i = (i + 1) % free.length;
            setFocusSlot(free[i]);
          }, 80),
        );
      }, t1 + t2),
    );
    timers.push(
      window.setTimeout(
        () => {
          stopRolling();
          setFocusSlot(current.position);
          setPhase("land");
        },
        t1 + t2 + t3,
      ),
    );
    timers.push(
      window.setTimeout(
        () => {
          // Next team starts from the beginning: team, group, slot.
          setPhase("team");
          setFocusGroup(null);
          setFocusSlot(null);
          setStep((s) => s + 1);
        },
        t1 + t2 + t3 + t4,
      ),
    );

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [step, finished, order, entries, groups, isGroups, perTeam, fast]);

  const current = !finished ? order[step] : null;
  const placed = new Set(order.slice(0, step).map((e) => e.id));
  // The team lands in its slot during the last phase.
  if (current && phase === "land") placed.add(current.id);

  const columns = isGroups
    ? groups.map((g, i) => ({
        id: g.id as string | null,
        name: g.name,
        index: i,
      }))
    : [{ id: null as string | null, name: "Ordem do sorteio", index: -1 }];
  const groupName = (id: string | null) =>
    groups.find((g) => g.id === id)?.name;

  const caption = current
    ? phase === "team"
      ? "Sorteando a equipe"
      : phase === "group"
        ? "Sorteando o grupo"
        : phase === "slot"
          ? "Sorteando a posição"
          : `Posição ${current.position + 1}${isGroups ? ` no ${groupName(current.groupId)}` : ""}`
    : "Sorteio concluído";

  return (
    <section
      aria-label="Sorteio ao vivo"
      className="flex flex-col gap-5"
      data-testid="draw-reveal"
    >
      <div className="liquid-card flex flex-col items-center gap-3 rounded-xl px-4 py-6 text-center">
        <Badge variant="secondary" className="gap-1.5">
          <DicesIcon className="size-3.5" />
          {finished
            ? "Sorteio concluído"
            : `Equipe ${Math.min(step + 1, total)} de ${total}`}
        </Badge>
        <div className="min-h-24" aria-hidden="true">
          {current ? (
            <>
              <p
                data-testid="draw-caption"
                className="text-xs tracking-widest text-muted-foreground uppercase"
              >
                {caption}
              </p>
              <p
                data-testid="draw-current"
                className={cn(
                  "mt-2 font-display text-4xl leading-none font-extrabold uppercase transition-transform duration-200 sm:text-5xl",
                  phase !== "team" && "scale-105 text-primary",
                )}
              >
                {rolling || "…"}
              </p>
            </>
          ) : (
            <p className="mt-6 font-display text-3xl leading-none font-extrabold uppercase">
              Tudo definido
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {finished ? (
            <Button
              type="button"
              size="lg"
              className="h-11 px-5"
              onClick={onFinish}
            >
              Ver {isGroups ? "grupos" : "participantes"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                aria-pressed={fast}
                onClick={() => {
                  // Changing speed restarts the current team from the draw.
                  setPhase("team");
                  setFocusGroup(null);
                  setFocusSlot(null);
                  setFast(!fast);
                }}
              >
                {fast ? "Velocidade normal" : "Acelerar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={() => setStep(total)}
              >
                <FastForwardIcon data-icon="inline-start" />
                Pular animação
              </Button>
            </>
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {current ? `${current.name}: ${caption}` : "Sorteio concluído"}
        </p>
      </div>

      <div
        className={cn(isGroups && "grid gap-4 md:grid-cols-2 xl:grid-cols-4")}
      >
        {columns.map((c) => {
          const members = entries.filter((e) => e.groupId === c.id);
          const focused = isGroups && focusGroup === c.index && !finished;
          return (
            <section
              key={c.id ?? "all"}
              aria-label={c.name}
              data-testid={`reveal-${c.name}`}
              data-focused={focused ? "true" : "false"}
              className={cn(
                "liquid-card rounded-xl p-4 transition-all duration-200",
                focused && "scale-[1.02] ring-2 ring-primary",
              )}
            >
              <h3 className="font-display text-lg leading-none font-bold tracking-wide uppercase">
                {c.name}
              </h3>
              <ol
                className={cn(
                  "mt-3 gap-2",
                  isGroups
                    ? "flex flex-col"
                    : "grid sm:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {Array.from({ length: slotsPerGroup }, (_, pos) => {
                  const entry = members.find((m) => m.position === pos);
                  const show = entry && placed.has(entry.id);
                  const picking =
                    !!current &&
                    phase === "slot" &&
                    focusSlot === pos &&
                    (isGroups ? focused : true);
                  return (
                    <li
                      key={pos}
                      data-placed={show ? "true" : "false"}
                      data-picking={picking ? "true" : "false"}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg border px-3 text-sm transition-colors",
                        show
                          ? "animate-in fade-in zoom-in-95 slide-in-from-top-2 bg-muted/30 duration-300"
                          : "border-dashed text-muted-foreground",
                        picking && "border-primary bg-primary/10",
                        show &&
                          current &&
                          current.id === entry.id &&
                          "border-primary ring-1 ring-primary",
                      )}
                    >
                      <span className="w-5 text-xs text-muted-foreground tabular-nums">
                        {pos + 1}º
                      </span>
                      {show ? (
                        <span className="truncate font-medium">
                          {entry.name}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
