import { BadgeCheckIcon, ClockIcon, XCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import {
  PaymentAccountControls,
  PaymentAccountForm,
} from "@/components/settings/payment-account";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getPaymentSettings } from "@/lib/payments/asaas";
import { formatMoney } from "@/lib/payments/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pagamentos | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const day = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const STATUS = {
  PENDING: { label: "Em análise no Asaas", icon: ClockIcon },
  APPROVED: { label: "Aprovada", icon: BadgeCheckIcon },
  REJECTED: { label: "Recusada", icon: XCircleIcon },
} as const;
const PAYMENT = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Pago",
  OVERDUE: "Em atraso",
  REFUNDED: "Estornado",
  CANCELED: "Cancelado",
} as const;

export default async function PaymentsPage() {
  const user = await requireOrganizationUser();
  const organizationId = user.organization!.id;
  const owner = user.role === "OWNER";
  const [account, settings, payments] = await Promise.all([
    prisma.organizationPaymentAccount.findUnique({ where: { organizationId } }),
    getPaymentSettings(),
    prisma.payment.findMany({
      where: { organizationId, kind: "REGISTRATION" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        registration: {
          select: {
            team: { select: { name: true } },
            event: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const configured = !!settings?.apiKeyEnc;
  const received = payments
    .filter((p) => p.status === "RECEIVED" || p.status === "CONFIRMED")
    .reduce((t, p) => t + p.valueCents, 0);

  return (
    <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <section
        aria-label="Conta de recebimento"
        className="liquid-card flex flex-col gap-5 rounded-xl p-6"
      >
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Conta de recebimento
        </h2>
        <p className="text-sm text-muted-foreground">
          As taxas de inscrição são pagas direto na subconta Asaas da
          organização: o dinheiro cai na conta de vocês, não na da plataforma.
        </p>
        {!configured ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
            O pagamento ainda não foi configurado pela plataforma. A conta de
            recebimento fica disponível depois disso.
          </p>
        ) : null}
        {account ? (
          <div className="flex flex-col gap-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Titular</dt>
                <dd className="font-medium">{account.holderName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Documento</dt>
                <dd className="font-medium">{account.holderDocument}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Situação</dt>
                <dd>
                  <Badge
                    variant={
                      account.status === "REJECTED"
                        ? "destructive"
                        : account.status === "APPROVED"
                          ? "default"
                          : "outline"
                    }
                  >
                    {STATUS[account.status].label}
                  </Badge>
                </dd>
              </div>
            </dl>
            {owner ? (
              <PaymentAccountControls
                approved={account.status === "APPROVED"}
              />
            ) : null}
          </div>
        ) : owner ? (
          configured ? (
            <PaymentAccountForm
              defaultName={user.organization!.name}
              defaultEmail={user.email}
            />
          ) : null
        ) : (
          <p className="text-sm text-muted-foreground">
            Só o proprietário configura a conta de recebimento.
          </p>
        )}
      </section>

      <aside
        aria-label="Inscrições pagas"
        className="liquid-card flex flex-col gap-3 rounded-xl p-5"
      >
        <h2 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
          Inscrições cobradas
        </h2>
        <p className="text-sm text-muted-foreground">
          Recebido:{" "}
          <strong className="text-foreground">{formatMoney(received)}</strong>
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma cobrança de inscrição ainda. Defina o valor nas categorias
            do evento.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm"
              >
                <span>
                  <span className="block font-medium">
                    {p.registration?.team?.name ?? p.description}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {p.registration?.event.name ?? ""} · vence{" "}
                    {day.format(p.dueDate)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {formatMoney(p.valueCents)}
                  </span>
                  <Badge
                    variant={p.status === "OVERDUE" ? "destructive" : "outline"}
                  >
                    {PAYMENT[p.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
