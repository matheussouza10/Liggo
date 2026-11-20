import { ArrowLeftIcon, CircleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestReview } from "@/components/requests/request-review";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { formatDay } from "@/lib/events/constants";
import { formatCpf } from "@/lib/people/cpf";
import { GENDER_LABELS } from "@/lib/people/format";
import { prisma } from "@/lib/prisma";
import { requestInclude, reviewRequest } from "@/lib/requests/review";
import { STAFF_ROLE_LABELS } from "@/lib/registrations/constants";

export const metadata: Metadata = {
  title: "Pedido de inscrição | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function RequestDetailPage({
  params,
}: PageProps<"/events/[id]/requests/[requestId]">) {
  const user = await requireOrganizationUser();
  const { id, requestId } = await params;
  const request = user.organization
    ? await prisma.registrationRequest.findFirst({
        where: {
          id: requestId,
          eventId: id,
          event: { organizationId: user.organization.id },
        },
        include: requestInclude,
      })
    : null;
  if (!request) notFound();

  const pending = request.status === "PENDING";
  const [review, categories] = await Promise.all([
    pending ? reviewRequest(request) : null,
    prisma.eventCategory.findMany({
      where: { eventId: id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const team = request.event.participationType === "TEAM";

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Link
          href={`/events/${id}/requests`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Pedidos de inscrição
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {team
            ? (request.teamName ?? "Pedido")
            : (request.members[0]?.name ?? "Pedido")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {request.event.name} · enviado em {formatDay(request.createdAt)} por{" "}
          {request.contactName}
        </p>
      </div>

      {request.status === "APPROVED" ? (
        <Alert>
          <AlertDescription>
            Aprovado. A inscrição foi criada no evento.{" "}
            {request.registrationId ? (
              <Link
                href={`/events/${id}/registrations/${request.registrationId}`}
                className="underline"
              >
                Abrir inscrição
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {request.status === "REJECTED" ? (
        <Alert>
          <AlertDescription>
            Recusado. Motivo informado: {request.rejectionReason}
          </AlertDescription>
        </Alert>
      ) : null}
      {request.status === "WITHDRAWN" ? (
        <Alert>
          <AlertDescription>
            O solicitante cancelou este pedido. Os documentos e contatos foram
            apagados.
          </AlertDescription>
        </Alert>
      ) : null}

      {review &&
      (review.general.length > 0 ||
        Object.values(review.members).some((m) => m.problems.length > 0)) ? (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertTitle>Resolva antes de aprovar</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-5">
              {review.general.map((p) => (
                <li key={p}>{p}</li>
              ))}
              {request.members.flatMap((m) =>
                (review.members[m.id]?.problems ?? []).map((p) => (
                  <li key={`${m.id}-${p}`}>{`${m.name}: ${p}`}</li>
                )),
              )}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        aria-label="Dados do pedido"
        className="liquid-card grid gap-x-8 gap-y-3 rounded-xl p-5 sm:grid-cols-[10rem_1fr]"
      >
        {(
          [
            ["Categoria", request.category.name],
            ...(team
              ? [
                  [
                    "Time",
                    `${request.teamName ?? ""}${review?.teamId ? " (já existe no seu cadastro)" : pending ? " (será criado)" : ""}`,
                  ],
                ]
              : []),
            [
              "Contato",
              `${request.contactName} · ${request.contactEmail}${request.contactPhone ? ` · ${request.contactPhone}` : ""}`,
            ],
            ...(request.notes ? [["Observações", request.notes]] : []),
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="font-medium whitespace-pre-line">{v}</dd>
          </div>
        ))}
      </section>

      <section aria-label="Atletas" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Atletas ({request.members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {request.members.map((m) => {
            const r = review?.members[m.id];
            return (
              <li
                key={m.id}
                className="liquid-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
                aria-label={`Atleta ${m.name}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.name}
                    {m.isCaptain ? (
                      <Badge variant="secondary" className="ml-2">
                        Capitão
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDay(m.birthDate)} · {GENDER_LABELS[m.gender]}
                    {m.cpf ? ` · ${formatCpf(m.cpf)}` : ""}
                    {m.shirtNumber != null ? ` · camisa ${m.shirtNumber}` : ""}
                    {m.position ? ` · ${m.position.name}` : ""}
                  </p>
                  {m.guardianName ? (
                    <p className="text-sm text-muted-foreground">
                      Responsável: {m.guardianName}
                      {m.guardianCpf ? ` · ${formatCpf(m.guardianCpf)}` : ""}
                    </p>
                  ) : null}
                </div>
                {r ? (
                  <Badge variant="outline">
                    {r.athleteId
                      ? r.isNew
                        ? "Já existe no sistema"
                        : "Já está no seu cadastro"
                      : "Novo cadastro"}
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
        {request.staff.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Comissão:{" "}
            {request.staff
              .map((s) => `${s.name} (${STAFF_ROLE_LABELS[s.role]})`)
              .join(", ")}
          </p>
        ) : null}
      </section>

      {pending ? (
        <RequestReview
          requestId={request.id}
          eventId={id}
          categoryId={request.categoryId}
          categories={categories}
          members={request.members.map((m) => ({ id: m.id, name: m.name }))}
          canApprove={review?.canApprove ?? false}
        />
      ) : null}
    </div>
  );
}
