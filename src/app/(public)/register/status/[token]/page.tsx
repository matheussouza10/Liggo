import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { WithdrawButton } from "@/components/requests/withdraw-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getRequestByToken } from "@/lib/requests/queries";
import { cn } from "@/lib/utils";

export const instant = false;
export const metadata: Metadata = {
  title: "Acompanhar pedido | Liggo",
  robots: { index: false, follow: false },
};

const STATUS = {
  PENDING: {
    label: "Aguardando a organização",
    Icon: ClockIcon,
    text: "A organização vai conferir os dados. Você recebe a resposta por e-mail.",
  },
  APPROVED: {
    label: "Aprovado",
    Icon: CheckCircle2Icon,
    text: "A sua inscrição foi aprovada. Nos vemos no evento!",
  },
  REJECTED: {
    label: "Não aprovado",
    Icon: XCircleIcon,
    text: "A organização não aprovou este pedido.",
  },
  WITHDRAWN: {
    label: "Cancelado",
    Icon: XCircleIcon,
    text: "Você cancelou este pedido.",
  },
} as const;

export default async function RequestStatusPage({
  params,
}: PageProps<"/register/status/[token]">) {
  await connection();
  const { token } = await params;
  const request = await getRequestByToken(token);
  if (!request) notFound();
  const s = STATUS[request.status];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {request.event.organization.name}
        </p>
        <h1 className="mt-1 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {request.event.name}
        </h1>
      </div>

      <section
        className="liquid-card flex flex-col gap-3 rounded-xl p-5"
        aria-label="Situação do pedido"
      >
        <div className="flex flex-wrap items-center gap-3">
          <s.Icon className="size-6" aria-hidden />
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            {s.label}
          </h2>
          <Badge variant="outline">{request.category.name}</Badge>
        </div>
        <p className="text-muted-foreground">{s.text}</p>
        {request.status === "REJECTED" && request.rejectionReason ? (
          <p className="rounded-lg border border-white/15 p-3 text-sm">
            <b>Motivo:</b> {request.rejectionReason}
          </p>
        ) : null}
      </section>

      <section
        className="liquid-card flex flex-col gap-2 rounded-xl p-5"
        aria-label="Dados do pedido"
      >
        <h2 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
          {request.event.participationType === "TEAM"
            ? (request.teamName ?? "Time")
            : "Participantes"}
        </h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {request.members.map((m) => (
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Por motivo de privacidade, documentos e contatos não são exibidos
          aqui.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {request.status === "PENDING" ? <WithdrawButton token={token} /> : null}
        <Link
          href={`/register/${request.event.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Ver o evento
        </Link>
      </div>
    </div>
  );
}
