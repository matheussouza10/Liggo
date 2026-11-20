import {
  BadgeDollarSignIcon,
  Building2Icon,
  LayersIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { PlansManager, type PlanRow } from "@/components/admin/plans-manager";
import { KpiStrip } from "@/components/app/kpi-strip";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/payments/money";
import { ensureDefaultPlan } from "@/lib/payments/plans";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Planos | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminPlansPage() {
  await requireSystemAdmin();
  await ensureDefaultPlan();
  const [plans, paying, total] = await Promise.all([
    prisma.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
      include: { _count: { select: { organizations: true } } },
    }),
    prisma.organization.findMany({
      where: { subscriptionStatus: "ACTIVE", plan: { isNot: null } },
      select: { plan: { select: { priceCents: true } } },
    }),
    prisma.organization.count(),
  ]);
  const mrr = paying.reduce((t, o) => t + (o.plan?.priceCents ?? 0), 0);
  const rows: PlanRow[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    priceCents: p.priceCents,
    maxEvents: p.maxEvents,
    maxAthletes: p.maxAthletes,
    maxRegistrationsPerEvent: p.maxRegistrationsPerEvent,
    active: p.active,
    isDefault: p.isDefault,
    organizations: p._count.organizations,
  }));
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Planos
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          O que a plataforma vende: valor mensal e o que cada organização pode
          usar. A cobrança dos planos é feita na conta do Asaas da plataforma.
        </p>
      </div>
      <KpiStrip
        label="Indicadores dos planos"
        items={[
          {
            label: "Planos ativos",
            value: plans.filter((p) => p.active).length,
            hint: `${plans.length} no total`,
            icon: LayersIcon,
          },
          {
            label: "Organizações",
            value: total,
            hint: `${total - paying.length} no plano padrão`,
            icon: Building2Icon,
          },
          {
            label: "Assinaturas ativas",
            value: paying.length,
            hint: "Pagando um plano",
            icon: BadgeDollarSignIcon,
            tone: paying.length > 0 ? "good" : "default",
          },
          {
            label: "Receita mensal prevista",
            value: formatMoney(mrr),
            hint: "Soma das assinaturas ativas",
            icon: WalletIcon,
          },
        ]}
      />
      <PlansManager plans={rows} />
    </div>
  );
}
