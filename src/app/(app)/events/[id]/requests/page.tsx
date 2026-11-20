import { ArrowLeftIcon, InboxIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getEvent } from "@/lib/events/queries";
import { listRequests } from "@/lib/requests/queries";

export const metadata: Metadata = {
  title: "Pedidos de inscrição | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const STATUS_LABEL = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  WITHDRAWN: "Cancelado",
} as const;

export default async function RequestsPage({
  params,
}: PageProps<"/events/[id]/requests">) {
  const user = await requireOrganizationUser();
  const { id } = await params;
  const event = user.organization
    ? await getEvent(user.organization.id, id)
    : null;
  if (!event) notFound();
  const requests = await listRequests(event.id);
  const pending = requests.filter((r) => r.status === "PENDING");
  const answered = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          {event.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Pedidos de inscrição
        </h1>
        <p className="mt-3 text-muted-foreground">
          Confira os dados, ajuste o que for preciso e aprove ou recuse. Ao
          aprovar, o time e os atletas entram no seu cadastro e na inscrição do
          evento.
        </p>
      </div>

      {requests.length === 0 ? (
        <Empty className="liquid-card rounded-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum pedido ainda</EmptyTitle>
            <EmptyDescription>
              {event.registrationOpen
                ? "Divulgue o link do evento. Os pedidos aparecem aqui."
                : "As inscrições públicas estão fechadas. Abra na página do evento para receber pedidos."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Group title="Pendentes" items={pending} eventId={event.id} />
          <Group title="Respondidos" items={answered} eventId={event.id} />
        </>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  eventId,
}: {
  title: string;
  items: Awaited<ReturnType<typeof listRequests>>;
  eventId: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
        {title}{" "}
        <span className="text-base font-normal text-muted-foreground normal-case">
          ({items.length})
        </span>
      </h2>
      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              href={`/events/${eventId}/requests/${r.id}`}
              className="liquid-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 no-underline"
              aria-label={`Pedido de ${r.teamName ?? r.members[0]?.name ?? r.contactName}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {r.teamName ?? r.members[0]?.name ?? r.contactName}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {r.category.name} · {r._count.members}{" "}
                  {r._count.members === 1 ? "atleta" : "atletas"} ·{" "}
                  {r.contactName}
                </span>
              </span>
              <Badge variant={r.status === "PENDING" ? "default" : "outline"}>
                {STATUS_LABEL[r.status]}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
