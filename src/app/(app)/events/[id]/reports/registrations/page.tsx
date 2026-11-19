import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportPaper, formatDate } from "@/components/reports/report-paper";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getRegistrationsReport } from "@/lib/reports/queries";

export const metadata: Metadata = {
  title: "Lista de inscritos | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function RegistrationsReportPage({
  params,
}: PageProps<"/events/[id]/reports/registrations">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const report = user.organization
    ? await getRegistrationsReport(user.organization.id, id)
    : null;
  if (!report) notFound();
  return (
    <ReportPaper
      title="Lista de inscritos"
      event={report.event}
      backHref={`/events/${id}/reports`}
    >
      <p className="mb-4">
        {report.total} {report.total === 1 ? "inscrição" : "inscrições"} em{" "}
        {report.categories.length}{" "}
        {report.categories.length === 1 ? "categoria" : "categorias"}.
      </p>
      {report.categories.map((c) => (
        <section
          key={c.id}
          aria-label={c.name}
          className="mb-6 break-inside-avoid-page"
        >
          <h3 className="mb-2 border-b border-black text-base font-bold">
            {c.name}{" "}
            <span className="font-normal text-neutral-600">
              ({c.registrations.length})
            </span>
          </h3>
          {c.registrations.length === 0 ? (
            <p className="text-neutral-500">Sem inscrições.</p>
          ) : null}
          {c.registrations.map((r) => (
            <div key={r.id} className="mb-4 break-inside-avoid">
              <p className="font-semibold">{r.name}</p>
              <table className="mt-1 w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-400 text-xs text-neutral-600">
                    <th className="w-12 py-1 pr-2 font-medium">Nº</th>
                    <th className="py-1 pr-2 font-medium">Atleta</th>
                    <th className="w-24 py-1 pr-2 font-medium">Nascimento</th>
                    <th className="w-32 py-1 font-medium">Posição</th>
                  </tr>
                </thead>
                <tbody>
                  {r.members.map((m) => (
                    <tr
                      key={m.name + m.birthDate.toISOString()}
                      className="border-b border-neutral-200"
                    >
                      <td className="py-1 pr-2 tabular-nums">
                        {m.shirt ?? ""}
                      </td>
                      <td className="py-1 pr-2">
                        {m.name}
                        {m.captain ? " (C)" : ""}
                      </td>
                      <td className="py-1 pr-2 tabular-nums">
                        {formatDate(m.birthDate)}
                      </td>
                      <td className="py-1">{m.position ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.staff.length ? (
                <p className="mt-1 text-xs text-neutral-700">
                  Comissão:{" "}
                  {r.staff.map((s) => `${s.name} (${s.role})`).join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </ReportPaper>
  );
}
