import { FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatDay } from "@/lib/events/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Relatórios | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function ReportsPage() {
  const user = await requireOrganizationUser();
  const events = user.organization
    ? await prisma.event.findMany({
        where: { organizationId: user.organization.id },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          sport: { select: { name: true } },
          _count: { select: { registrations: true } },
        },
      })
    : [];
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Relatórios
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Escolha um evento para imprimir ou salvar em PDF a lista de inscritos,
          os resultados e a súmula dos jogos, ou baixar planilhas.
        </p>
      </div>
      {events.length === 0 ? (
        <Empty className="liquid-card rounded-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum evento ainda</EmptyTitle>
            <EmptyDescription>
              Crie um evento para gerar relatórios.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}/reports`}
                className="liquid-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 no-underline"
                aria-label={`Relatórios de ${e.name}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {e.sport.name} · {formatDay(e.startDate)} a{" "}
                    {formatDay(e.endDate)} · {e._count.registrations}{" "}
                    {e._count.registrations === 1 ? "inscrição" : "inscrições"}
                  </span>
                </span>
                <span className="text-sm text-primary">Abrir relatórios</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
