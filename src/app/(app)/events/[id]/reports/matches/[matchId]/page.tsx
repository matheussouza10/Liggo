import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportPaper } from "@/components/reports/report-paper";
import { describeEvent } from "@/lib/competition/live";
import { formatKickoff } from "@/lib/competition/format";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getOrganizerMatch, getReportEvent } from "@/lib/reports/queries";

export const metadata: Metadata = {
  title: "Súmula | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function MatchSheetPage({
  params,
}: PageProps<"/events/[id]/reports/matches/[matchId]">) {
  const user = await requireOrganizationUser();
  const { id, matchId } = await params;
  const orgId = user.organization?.id;
  const [data, event] = orgId
    ? await Promise.all([
        getOrganizerMatch(orgId, id, matchId),
        getReportEvent(orgId, id),
      ])
    : [null, null];
  if (!data || !event) notFound();
  const s = data.snapshot;
  const names = { home: s.home, away: s.away };
  const state =
    s.state === "FINISHED"
      ? "Encerrado"
      : s.state === "WALKOVER"
        ? "W.O."
        : s.state === "LIVE"
          ? "Em andamento"
          : "Agendado";
  return (
    <ReportPaper
      title="Súmula do jogo"
      event={event}
      backHref={`/events/${id}/reports`}
    >
      <section className="mb-5" aria-label="Jogo">
        <p className="text-neutral-700">
          {s.categoryName} · {s.stageName} · {s.label}
        </p>
        <p className="text-neutral-700">
          {s.scheduledAt ? formatKickoff(s.scheduledAt) : "Sem horário"}
          {s.venue ? ` · ${s.venue}` : ""}
          {s.referee ? ` · Árbitro: ${s.referee}` : ""}
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <p className="text-lg font-bold">{s.home ?? "A definir"}</p>
          <p
            data-testid="sheet-score"
            className="rounded border-2 border-black px-5 py-1 text-3xl font-bold tabular-nums"
          >
            {s.scoreHome ?? ""} x {s.scoreAway ?? ""}
          </p>
          <p className="text-lg font-bold">{s.away ?? "A definir"}</p>
        </div>
        <p className="mt-2 text-center text-sm text-neutral-700">
          {state}
          {s.penaltiesHome != null
            ? ` · Pênaltis ${s.penaltiesHome} x ${s.penaltiesAway}`
            : ""}
          {s.sets.length
            ? ` · Sets: ${s.sets.map((x) => `${x.home}-${x.away}`).join(" · ")}`
            : ""}
          {s.games.length
            ? ` · Jogos da série: ${s.games.map((x) => `${x.home}-${x.away}`).join(" · ")}`
            : ""}
        </p>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-6" aria-label="Elencos">
        {(
          [
            [s.home, data.homeRoster],
            [s.away, data.awayRoster],
          ] as const
        ).map(([team, roster], i) => (
          <div key={i}>
            <h3 className="mb-1 border-b border-black font-bold">
              {team ?? "A definir"}
            </h3>
            <table className="w-full border-collapse text-left">
              <tbody>
                {roster.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-200">
                    <td className="w-10 py-1 pr-2 tabular-nums">
                      {p.shirt ?? ""}
                    </td>
                    <td className="py-1">{p.name}</td>
                  </tr>
                ))}
                {roster.length === 0 ? (
                  <tr>
                    <td className="py-1 text-neutral-500">Sem elenco.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section className="mb-8" aria-label="Lances">
        <h3 className="mb-1 border-b border-black font-bold">Lances</h3>
        {s.events.length === 0 ? (
          <p className="py-2 text-neutral-500">Nenhum lance registrado.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <tbody>
              {s.events.map((e) => {
                const d = describeEvent(e, names);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-neutral-200 align-top"
                  >
                    <td className="w-14 py-1 pr-2 tabular-nums">
                      {e.minute != null ? `${e.minute}'` : ""}
                    </td>
                    <td className="py-1 pr-2 font-medium">{d.title}</td>
                    <td className="py-1 text-neutral-700">{d.detail ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section
        className="mt-10 grid grid-cols-3 gap-6 text-center text-xs"
        aria-label="Assinaturas"
      >
        {[
          "Árbitro",
          `Capitão ${s.home ?? ""}`.trim(),
          `Capitão ${s.away ?? ""}`.trim(),
        ].map((who) => (
          <div key={who}>
            <div className="mb-1 h-10 border-b border-black" />
            {who}
          </div>
        ))}
      </section>
    </ReportPaper>
  );
}
