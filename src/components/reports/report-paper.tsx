import type { ReactNode } from "react";
import { PrintButton } from "./print-button";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
export const formatDate = (d: Date) => dateFmt.format(d);

/** A white sheet for reports: the same on screen (preview) and on paper. */
export function ReportPaper({
  title,
  event,
  children,
  backHref,
}: {
  title: string;
  event: {
    name: string;
    organization: string;
    sport: string;
    place: string;
    period: { start: Date; end: Date };
  };
  children: ReactNode;
  backHref: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <a
          href={backHref}
          className="text-sm text-muted-foreground no-underline hover:text-white"
        >
          Voltar aos relatórios
        </a>
        <PrintButton />
      </div>
      <article
        aria-label={title}
        className="mx-auto w-full max-w-[210mm] rounded-xl bg-white p-8 text-[13px] leading-relaxed text-black shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none"
      >
        <header className="mb-6 border-b-2 border-black pb-3">
          <p className="text-xs tracking-wider text-neutral-600 uppercase">
            {event.organization}
          </p>
          <h1 className="mt-1 text-2xl leading-tight font-bold">
            {event.name}
          </h1>
          <p className="text-neutral-700">
            {event.sport} · {formatDate(event.period.start)} a{" "}
            {formatDate(event.period.end)}
            {event.place ? ` · ${event.place}` : ""}
          </p>
          <h2 className="mt-3 text-lg font-semibold uppercase">{title}</h2>
        </header>
        {children}
        <footer className="mt-8 border-t border-neutral-300 pt-2 text-[11px] text-neutral-500">
          Gerado pelo Liggo
        </footer>
      </article>
    </div>
  );
}
