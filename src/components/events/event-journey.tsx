import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  LockIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Journey, JourneyStep, StepState } from "@/lib/events/journey";
import { cn } from "@/lib/utils";

const ICON: Record<StepState, typeof CheckCircle2Icon> = {
  done: CheckCircle2Icon,
  current: CircleDotIcon,
  todo: CircleDashedIcon,
  blocked: LockIcon,
};
const STATE_LABEL: Record<StepState, string> = {
  done: "Feito",
  current: "Agora",
  todo: "A fazer",
  blocked: "Aguardando",
};

const href = (eventId: string, path: string) =>
  path.startsWith("#") ? path : `/events/${eventId}${path}`;

/** The path of an event from setup to the final: what is done, what is next, and what looks wrong. */
export function EventJourney({
  eventId,
  journey,
}: {
  eventId: string;
  journey: Journey;
}) {
  const next = journey.next;
  return (
    <section
      aria-label="Jornada do evento"
      className="liquid-card flex flex-col gap-5 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Jornada do evento
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {next
              ? `Próximo passo: ${next.title}.`
              : "Tudo concluído. Bom evento!"}
          </p>
        </div>
        <div
          className="flex min-w-40 flex-col gap-1.5"
          aria-label={`Progresso: ${journey.progress}%`}
        >
          <span className="text-right text-sm font-semibold tabular-nums">
            {journey.progress}%
          </span>
          <div
            className="h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={journey.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${journey.progress}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="grid gap-2 lg:grid-cols-2">
        {journey.steps.map((s, i) => (
          <Step
            key={s.key}
            step={s}
            index={i + 1}
            eventId={eventId}
            highlight={next?.key === s.key}
          />
        ))}
      </ol>

      {journey.warnings.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Avisos">
          {journey.warnings.map((w) => (
            <li
              key={w.key}
              className="flex items-start gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm"
            >
              <TriangleAlertIcon
                className="mt-0.5 size-4 shrink-0 text-amber-300"
                aria-hidden
              />
              <span className="flex-1">{w.text}</span>
              {w.path ? (
                <Link
                  href={href(eventId, w.path)}
                  className="inline-flex shrink-0 items-center gap-1 font-medium"
                >
                  Resolver
                  <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Step({
  step,
  index,
  eventId,
  highlight,
}: {
  step: JourneyStep;
  index: number;
  eventId: string;
  highlight: boolean;
}) {
  const Icon = ICON[step.state];
  return (
    <li
      data-state={step.state}
      aria-label={`${step.title}: ${STATE_LABEL[step.state]}`}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        highlight ? "border-primary/60 bg-primary/10" : "border-white/10",
        step.state === "blocked" && "opacity-60",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          step.state === "done" && "text-emerald-400",
          step.state === "current" && "text-primary",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <span className="text-muted-foreground tabular-nums">{index}.</span>
          {step.title}
          {highlight ? <Badge>Agora</Badge> : null}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
      </div>
      {step.action ? (
        <Link
          href={href(eventId, step.action.path)}
          className={cn(
            buttonVariants({
              variant: highlight ? "default" : "outline",
              size: "sm",
            }),
            "h-8 shrink-0",
          )}
        >
          {step.action.label}
        </Link>
      ) : null}
    </li>
  );
}
