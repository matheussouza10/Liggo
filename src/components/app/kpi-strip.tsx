import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: string | number;
  /** One short line under the value: a share, a comparison, a hint. */
  hint?: string;
  icon: LucideIcon;
  /** "warn" colors the tile when something needs attention. */
  tone?: "default" | "good" | "warn";
};

/** A row of key numbers at the top of a screen. */
export function KpiStrip({ items, label }: { items: Kpi[]; label: string }) {
  return (
    <dl aria-label={label} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(
        ({ label: name, value, hint, icon: Icon, tone = "default" }) => (
          <div
            key={name}
            data-tone={tone}
            className={cn(
              "liquid-card flex items-center gap-4 rounded-xl px-4 py-4",
              tone === "warn" && "border-amber-400/40",
            )}
          >
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl",
                tone === "warn"
                  ? "bg-amber-400/15 text-amber-300"
                  : tone === "good"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-primary/15 text-primary",
              )}
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs tracking-wider text-muted-foreground uppercase">
                {name}
              </dt>
              <dd className="mt-0.5 font-display text-3xl leading-none font-bold tabular-nums">
                {value}
              </dd>
              {hint ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {hint}
                </p>
              ) : null}
            </div>
          </div>
        ),
      )}
    </dl>
  );
}
