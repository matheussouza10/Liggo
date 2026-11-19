import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportPaper } from "@/components/reports/report-paper";
import { formatKickoff } from "@/lib/competition/format";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getResultsReport, scoreText } from "@/lib/reports/queries";

export const metadata: Metadata = {
  title: "Resultados | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const STATUS = {
  DRAWN: "Sorteada",
  LIVE: "Em andamento",
  DONE: "Concluída",
} as const;
const th = "py-1 pr-2 font-medium";

export default async function ResultsReportPage({
  params,
}: PageProps<"/events/[id]/reports/results">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const report = user.organization
    ? await getResultsReport(user.organization.id, id)
    : null;
  if (!report) notFound();
  return (
    <ReportPaper
      title="Resultados e classificação"
      event={report.event}
      backHref={`/events/${id}/reports`}
    >
      {report.categories.length === 0 ? (
        <p className="text-neutral-600">Ainda não há fases sorteadas.</p>
      ) : null}
      {report.categories.map((c) => (
        <section key={c.id} aria-label={c.name} className="mb-8">
          <h3 className="mb-3 border-b-2 border-black text-lg font-bold">
            {c.name}
          </h3>
          {c.stages.map((s) => (
            <div key={s.name} className="mb-6">
              <h4 className="mb-1 font-semibold">
                {s.name}{" "}
                <span className="font-normal text-neutral-600">
                  · {STATUS[s.status]}
                </span>
              </h4>
              {s.podium.length > 1 ? (
                <p className="mb-2 font-medium">
                  {s.podium
                    .map(
                      (p) =>
                        `${p.place}º ${p.name}${p.note ? ` (${p.note})` : ""}`,
                    )
                    .join(" · ")}
                </p>
              ) : s.champion ? (
                <p className="mb-2 font-medium">Líder: {s.champion}</p>
              ) : null}

              {s.tables.map((t) => (
                <table
                  key={t.name}
                  className="mb-3 w-full border-collapse text-left"
                >
                  <caption className="mb-1 text-left text-xs font-semibold text-neutral-700">
                    {t.name}
                  </caption>
                  <thead>
                    <tr className="border-b border-neutral-400 text-xs text-neutral-600">
                      <th className={`w-8 ${th}`}>#</th>
                      <th className={th}>Participante</th>
                      <th className={`w-10 text-right ${th}`}>Pts</th>
                      <th className={`w-8 text-right ${th}`}>J</th>
                      <th className={`w-8 text-right ${th}`}>V</th>
                      {s.bySets ? null : (
                        <th className={`w-8 text-right ${th}`}>E</th>
                      )}
                      <th className={`w-8 text-right ${th}`}>D</th>
                      {s.bySets ? (
                        <>
                          <th className={`w-14 text-right ${th}`}>Sets</th>
                          <th className={`w-16 text-right ${th}`}>Pontos</th>
                        </>
                      ) : (
                        <th className={`w-14 text-right ${th}`}>Saldo</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr
                        key={r.name + r.position}
                        className="border-b border-neutral-200 tabular-nums"
                      >
                        <td className="py-1 pr-2">{r.position}</td>
                        <td className="py-1 pr-2 font-medium">{r.name}</td>
                        <td className="py-1 pr-2 text-right font-semibold">
                          {r.points}
                        </td>
                        <td className="py-1 pr-2 text-right">{r.played}</td>
                        <td className="py-1 pr-2 text-right">{r.wins}</td>
                        {s.bySets ? null : (
                          <td className="py-1 pr-2 text-right">{r.draws}</td>
                        )}
                        <td className="py-1 pr-2 text-right">{r.losses}</td>
                        {s.bySets ? (
                          <>
                            <td className="py-1 pr-2 text-right">
                              {r.scoreFor}:{r.scoreAgainst}
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {r.pointsFor}:{r.pointsAgainst}
                            </td>
                          </>
                        ) : (
                          <td className="py-1 pr-2 text-right">
                            {r.scoreFor - r.scoreAgainst > 0
                              ? `+${r.scoreFor - r.scoreAgainst}`
                              : r.scoreFor - r.scoreAgainst}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

              {s.performance ? (
                <table className="mb-3 w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-400 text-xs text-neutral-600">
                      <th className={`w-8 ${th}`}>#</th>
                      <th className={th}>Participante</th>
                      <th className={th}>Tentativas</th>
                      <th className={`w-28 text-right ${th}`}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.performance.rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-neutral-200 tabular-nums"
                      >
                        <td className="py-1 pr-2">
                          {r.status === "OK" ? r.position : "–"}
                        </td>
                        <td className="py-1 pr-2 font-medium">{r.name}</td>
                        <td className="py-1 pr-2 text-neutral-700">
                          {r.attempts.map((a) => a.text).join(" · ")}
                        </td>
                        <td className="py-1 text-right font-semibold">
                          {r.status === "OK"
                            ? r.value
                            : r.status === "PENDING"
                              ? "Aguardando"
                              : r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {s.matches.length ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-400 text-xs text-neutral-600">
                      <th className={`w-36 ${th}`}>Rodada</th>
                      <th className={th}>Jogo</th>
                      <th className={th}>Resultado</th>
                      <th className={`w-40 ${th}`}>Data e local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.matches.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-neutral-200 align-top"
                      >
                        <td className="py-1 pr-2 text-neutral-700">
                          {m.label}
                        </td>
                        <td className="py-1 pr-2">
                          {m.homeName ?? "A definir"} x{" "}
                          {m.awayName ?? "A definir"}
                        </td>
                        <td className="py-1 pr-2 tabular-nums">
                          {scoreText(m)}
                        </td>
                        <td className="py-1 text-xs text-neutral-700">
                          {m.scheduledAt ? formatKickoff(m.scheduledAt) : ""}
                          {m.venue ? ` · ${m.venue}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </ReportPaper>
  );
}
