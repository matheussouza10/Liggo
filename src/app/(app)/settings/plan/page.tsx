import {
  BadgeDollarSignIcon,
  CalendarClockIcon,
  LayersIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { KpiStrip } from "@/components/app/kpi-strip";
import {
  CancelSubscriptionButton,
  SubscribeButton,
} from "@/components/settings/plan-actions";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getPaymentSettings } from "@/lib/payments/asaas";
import { usageText } from "@/lib/payments/limits";
import { formatMoney } from "@/lib/payments/money";
import { ensureDefaultPlan, planOf, usageOf } from "@/lib/payments/plans";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plano | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const day = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const STATUS = {
  NONE: "Sem assinatura",
  PENDING: "Aguardando o primeiro pagamento",
  ACTIVE: "Ativa",
  OVERDUE: "Em atraso",
  CANCELED: "Cancelada",
} as const;
const PAYMENT = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  RECEIVED: "Pago",
  OVERDUE: "Em atraso",
  REFUNDED: "Estornado",
  CANCELED: "Cancelado",
} as const;

function Meter({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | null;
}) {
  const u = usageText(current, max);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{u.text}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={label}
        aria-valuenow={u.percent ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full",
            (u.percent ?? 0) >= 90 ? "bg-amber-400" : "bg-primary",
          )}
          style={{ width: `${u.percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default async function PlanPage() {
  const user = await requireOrganizationUser();
  const organizationId = user.organization!.id;
  const owner = user.role === "OWNER";
  await ensureDefaultPlan();
  const [current, usage, plans, org, settings, payments] = await Promise.all([
    planOf(organizationId),
    usageOf(organizationId),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ priceCents: "asc" }],
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        subscriptionStatus: true,
        planRenewsAt: true,
        plan: { select: { id: true, name: true } },
      },
    }),
    getPaymentSettings(),
    prisma.payment.findMany({
      where: { organizationId, kind: "PLAN" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const configured = !!settings?.apiKeyEnc;
  const subscribed =
    org.subscriptionStatus === "ACTIVE" ||
    org.subscriptionStatus === "PENDING" ||
    org.subscriptionStatus === "OVERDUE";

  return (
    <div className="flex w-full flex-col gap-6">
      <KpiStrip
        label="Indicadores do plano"
        items={[
          {
            label: "Plano atual",
            value: current.name,
            hint:
              current.priceCents === 0
                ? "Gratuito"
                : `${formatMoney(current.priceCents)} por mês`,
            icon: LayersIcon,
          },
          {
            label: "Eventos",
            value: usageText(usage.events, current.maxEvents).text,
            hint: current.maxEvents === null ? "Sem limite" : "Usados do plano",
            icon: TrophyIcon,
            tone:
              current.maxEvents !== null && usage.events >= current.maxEvents
                ? "warn"
                : "default",
          },
          {
            label: "Atletas",
            value: usageText(usage.athletes, current.maxAthletes).text,
            hint:
              current.maxAthletes === null ? "Sem limite" : "Usados do plano",
            icon: UsersIcon,
            tone:
              current.maxAthletes !== null &&
              usage.athletes >= current.maxAthletes
                ? "warn"
                : "default",
          },
          {
            label: "Assinatura",
            value: STATUS[org.subscriptionStatus],
            hint: org.planRenewsAt
              ? `Vale até ${day.format(org.planRenewsAt)}`
              : "Sem renovação agendada",
            icon: CalendarClockIcon,
            tone:
              org.subscriptionStatus === "OVERDUE"
                ? "warn"
                : org.subscriptionStatus === "ACTIVE"
                  ? "good"
                  : "default",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section aria-label="Planos" className="flex flex-col gap-4">
          <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
            Planos disponíveis
          </h2>
          {!configured ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
              O pagamento ainda não foi configurado pela plataforma. Assinar
              fica disponível depois disso.
            </p>
          ) : null}
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = current.id === p.id;
              return (
                <li
                  key={p.id}
                  aria-label={`Plano ${p.name}`}
                  className={cn(
                    "liquid-card flex flex-col gap-3 rounded-xl p-5",
                    isCurrent && "border-primary/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
                      {p.name}
                    </h3>
                    {isCurrent ? <Badge>Atual</Badge> : null}
                  </div>
                  <p className="font-display text-3xl leading-none font-bold tabular-nums">
                    {p.priceCents === 0 ? "Grátis" : formatMoney(p.priceCents)}
                    {p.priceCents > 0 ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        /mês
                      </span>
                    ) : null}
                  </p>
                  {p.description ? (
                    <p className="text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-1 text-sm">
                    <li>
                      {p.maxEvents === null
                        ? "Eventos sem limite"
                        : `Até ${p.maxEvents} eventos`}
                    </li>
                    <li>
                      {p.maxAthletes === null
                        ? "Atletas sem limite"
                        : `Até ${p.maxAthletes} atletas`}
                    </li>
                    <li>
                      {p.maxRegistrationsPerEvent === null
                        ? "Inscrições sem limite"
                        : `Até ${p.maxRegistrationsPerEvent} inscrições por evento`}
                    </li>
                  </ul>
                  <div className="mt-auto pt-2">
                    {owner && !isCurrent && p.priceCents > 0 && !subscribed ? (
                      <SubscribeButton
                        planId={p.id}
                        planName={p.name}
                        price={formatMoney(p.priceCents)}
                        disabled={!configured}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {owner && subscribed ? (
            <div>
              <CancelSubscriptionButton />
            </div>
          ) : null}
          {!owner ? (
            <p className="text-sm text-muted-foreground">
              Só o proprietário muda de plano.
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-6">
          <section
            aria-label="Uso"
            className="liquid-card flex flex-col gap-4 rounded-xl p-5"
          >
            <h2 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
              Uso do plano
            </h2>
            <Meter
              label="Eventos"
              current={usage.events}
              max={current.maxEvents}
            />
            <Meter
              label="Atletas"
              current={usage.athletes}
              max={current.maxAthletes}
            />
            <p className="text-xs text-muted-foreground">
              {current.maxRegistrationsPerEvent === null
                ? "Inscrições por evento sem limite."
                : `Até ${current.maxRegistrationsPerEvent} inscrições por evento.`}
            </p>
          </section>
          <section
            aria-label="Cobranças"
            className="liquid-card flex flex-col gap-3 rounded-xl p-5"
          >
            <h2 className="flex items-center gap-2 font-display text-xl leading-none font-bold tracking-wide uppercase">
              <BadgeDollarSignIcon className="size-5" aria-hidden />
              Cobranças do plano
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma cobrança ainda.
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
                        {formatMoney(p.valueCents)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Vence em {day.format(p.dueDate)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.status === "OVERDUE" ? "destructive" : "outline"
                        }
                      >
                        {PAYMENT[p.status]}
                      </Badge>
                      {p.invoiceUrl &&
                      (p.status === "PENDING" || p.status === "OVERDUE") ? (
                        <a
                          href={p.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium"
                        >
                          Pagar
                        </a>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
