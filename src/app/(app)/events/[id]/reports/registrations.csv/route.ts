import { getSessionUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/reports/csv";
import { getRegistrationsReport } from "@/lib/reports/queries";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(
  _request: Request,
  { params }: RouteContext<"/events/[id]/reports/registrations.csv">,
) {
  const user = await getSessionUser();
  const organizationId = user?.organization?.id;
  if (!user || !organizationId)
    return new Response("Entre para baixar.", { status: 401 });
  const { id } = await params;
  const report = await getRegistrationsReport(organizationId, id);
  if (!report) return new Response("Evento não encontrado.", { status: 404 });

  const rows = report.categories.flatMap((c) =>
    c.registrations.flatMap((r) => [
      ...r.members.map((m) => [
        c.name,
        r.name,
        "Atleta",
        m.name,
        iso(m.birthDate),
        m.shirt,
        m.position,
        m.captain ? "Sim" : "",
        "",
      ]),
      ...r.staff.map((s) => [
        c.name,
        r.name,
        s.role,
        s.name,
        "",
        "",
        "",
        "",
        s.contact,
      ]),
    ]),
  );
  const body = toCsv(
    [
      "Categoria",
      "Inscrição",
      "Função",
      "Nome",
      "Nascimento",
      "Camisa",
      "Posição",
      "Capitão",
      "Contato",
    ],
    rows,
  );
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inscritos.csv"`,
      "cache-control": "no-store",
    },
  });
}
