import { getSessionUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/reports/csv";
import { getResultsReport, scoreText } from "@/lib/reports/queries";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/events/[id]/reports/results.csv">,
) {
  const user = await getSessionUser();
  const organizationId = user?.organization?.id;
  if (!user || !organizationId)
    return new Response("Entre para baixar.", { status: 401 });
  const { id } = await params;
  const report = await getResultsReport(organizationId, id);
  if (!report) return new Response("Evento não encontrado.", { status: 404 });

  const rows: (string | number | null)[][] = [];
  for (const c of report.categories) {
    for (const s of c.stages) {
      for (const t of s.tables)
        for (const r of t.rows)
          rows.push([
            c.name,
            s.name,
            "Classificação",
            t.name,
            r.position,
            r.name,
            r.points,
            "",
            "",
            "",
          ]);
      if (s.performance)
        for (const r of s.performance.rows)
          rows.push([
            c.name,
            s.name,
            "Prova",
            "",
            r.status === "OK" ? r.position : "",
            r.name,
            r.status === "OK" ? r.value : r.status,
            r.attempts.map((a) => a.text).join(" · "),
            "",
            "",
          ]);
      for (const m of s.matches)
        rows.push([
          c.name,
          s.name,
          "Jogo",
          m.label,
          "",
          `${m.homeName ?? "A definir"} x ${m.awayName ?? "A definir"}`,
          scoreText(m),
          "",
          m.scheduledAt ?? "",
          m.venue,
        ]);
    }
  }
  const body = toCsv(
    [
      "Categoria",
      "Fase",
      "Tipo",
      "Rodada ou grupo",
      "Posição",
      "Participante ou jogo",
      "Resultado ou pontos",
      "Tentativas",
      "Data",
      "Local",
    ],
    rows,
  );
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="resultados.csv"`,
      "cache-control": "no-store",
    },
  });
}
