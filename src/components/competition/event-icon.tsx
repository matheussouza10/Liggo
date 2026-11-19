import {
  ArrowLeftRightIcon,
  CircleDotIcon,
  CircleXIcon,
  FlagIcon,
  HandIcon,
  HeartPulseIcon,
  MessageSquareTextIcon,
  PauseIcon,
  PlayIcon,
  RectangleVerticalIcon,
  TimerIcon,
} from "lucide-react";
import type { MatchEventType } from "@/lib/competition/live";
import { cn } from "@/lib/utils";

/** An icon per kind of moment. Cards are colored, but always have a text label next to them. */
export function EventIcon({
  type,
  className,
}: {
  type: MatchEventType;
  className?: string;
}) {
  const c = cn("size-4 shrink-0", className);
  switch (type) {
    case "GOAL":
      return (
        <CircleDotIcon className={cn(c, "text-emerald-400")} aria-hidden />
      );
    case "OWN_GOAL":
      return <CircleDotIcon className={cn(c, "text-orange-400")} aria-hidden />;
    case "PENALTY_MISSED":
      return <CircleXIcon className={cn(c, "text-orange-400")} aria-hidden />;
    case "YELLOW_CARD":
      return (
        <RectangleVerticalIcon
          className={cn(c, "fill-yellow-400 text-yellow-400")}
          aria-hidden
        />
      );
    case "RED_CARD":
      return (
        <RectangleVerticalIcon
          className={cn(c, "fill-red-500 text-red-500")}
          aria-hidden
        />
      );
    case "FOUL":
      return <HandIcon className={cn(c, "text-amber-400")} aria-hidden />;
    case "SUBSTITUTION":
      return (
        <ArrowLeftRightIcon className={cn(c, "text-sky-400")} aria-hidden />
      );
    case "TIMEOUT":
      return <TimerIcon className={c} aria-hidden />;
    case "INJURY":
      return <HeartPulseIcon className={cn(c, "text-rose-400")} aria-hidden />;
    case "NOTE":
      return <MessageSquareTextIcon className={c} aria-hidden />;
    case "KICKOFF":
    case "PERIOD_START":
      return <PlayIcon className={cn(c, "text-primary")} aria-hidden />;
    case "PERIOD_END":
      return <PauseIcon className={c} aria-hidden />;
    case "FULL_TIME":
      return <FlagIcon className={cn(c, "text-primary")} aria-hidden />;
  }
}
