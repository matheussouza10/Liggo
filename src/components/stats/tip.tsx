import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A hover and keyboard-focus tooltip with no script: the bubble shows when the
 * wrapper is hovered or focused. The wrapper is the hit target, so it can be
 * larger than the mark inside it.
 */
export function Tip({
  text,
  children,
  className,
  style,
}: {
  text: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      tabIndex={0}
      className={cn(
        "group/tip relative inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 rounded-md bg-[#1a2745] px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover/tip:opacity-100 group-focus/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
