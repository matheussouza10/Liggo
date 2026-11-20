import { ArrowLeftIcon, DownloadIcon, PrinterIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getResultsReport } from "@/lib/reports/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Relatórios do evento | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function EventReportsPage({
  params,
}: PageProps<"/events/[id]/reports">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const report = user.organization
    ? await getResultsReport(user.organization.id, id)
    : null;
  if (!report) notFound();
  const games = report.categories.flatMap((c) =>
    c.stages.flatMap((s) =>
      s.matches
        .filter((m) => m.homeId && m.awayId)
        .map((m) => ({ ...m, category: c.name, stage: s.name })),
    ),
  );

  const cards = [
    {
      title: "Lista de inscritos",
      text: "Times, atletas, camisas e comissão por categoria.",
      view: `/events/${id}/reports/registrations`,
      csv: `/events/${id}/reports/registrations.csv`,
    },
    {
      title: "Resultados e classificação",
      text: "Tabelas, jogos com placar, pódio e provas por categoria e fase.",
      view: `/events/${id}/reports/results`,
      csv: `/events/${id}/reports/results.csv`,
    },
  ];
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {report.event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Relatórios
        </h1>
        <p className="mt-3 text-muted-foreground">
          Abra o relatório e use &quot;Imprimir ou salvar em PDF&quot;. As
          planilhas abrem no Excel.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cards.map((c) => (
          <li
            key={c.title}
            className="liquid-card flex flex-col gap-3 rounded-xl p-5"
          >
            <h2 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
              {c.title}
            </h2>
            <p className="text-sm text-muted-foreground">{c.text}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={c.view} className={cn(buttonVariants(), "h-9")}>
                <PrinterIcon data-icon="inline-start" />
                Ver e imprimir
              </Link>
              <a
                href={c.csv}
                download
                className={cn(buttonVariants({ variant: "outline" }), "h-9")}
              >
                <DownloadIcon data-icon="inline-start" />
                Planilha (CSV)
              </a>
            </div>
          </li>
        ))}
      </ul>
      <section aria-label="Súmulas" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Súmulas dos jogos
        </h2>
        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Quando houver jogos com os dois participantes, a súmula de cada um
            aparece aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {games.slice(0, 120).map((m) => (
              <li
                key={m.id}
                className="liquid-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {m.homeName} x {m.awayName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.category} · {m.stage} · {m.label}
                  </span>
                </span>
                <Link
                  href={`/events/${id}/reports/matches/${m.id}`}
                  className="shrink-0"
                  aria-label={`Súmula de ${m.homeName} x ${m.awayName}`}
                >
                  Súmula
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
