import { Prisma } from "@/generated/prisma/client";
import { getPaymentSettings } from "@/lib/payments/asaas";
import {
  isPaid,
  renewalAfter,
  statusFromEvent,
  subscriptionAfter,
  tokenMatches,
} from "@/lib/payments/webhook";
import { prisma } from "@/lib/prisma";

type Body = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    subscription?: string;
    value?: number;
    dueDate?: string;
    invoiceUrl?: string;
    paymentDate?: string;
    description?: string;
    billingType?: string;
  };
};

/**
 * Payment notices from Asaas (the platform account and every subaccount).
 * Authenticated by the token we registered; delivered at least once, so each
 * event is recorded and handled a single time, together with its effects.
 */
export async function POST(request: Request) {
  const settings = await getPaymentSettings();
  if (
    !tokenMatches(
      request.headers.get("asaas-access-token"),
      settings?.webhookToken,
    )
  )
    return new Response("Não autorizado.", { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response("Corpo inválido.", { status: 400 });
  }
  if (!body.id || !body.event)
    return new Response("Evento inválido.", { status: 400 });
  const status = statusFromEvent(body.event);
  const payment = body.payment;

  try {
    await prisma.$transaction(async (tx) => {
      // A second delivery of the same event hits the primary key and changes nothing.
      await tx.paymentWebhookEvent.create({
        data: { id: body.id as string, event: body.event as string },
      });
      if (!status || !payment?.id) return;

      let record = await tx.payment.findUnique({
        where: { asaasPaymentId: payment.id },
      });
      if (!record && payment.subscription) {
        // A monthly charge of a plan subscription we have not seen yet.
        const org = await tx.organization.findFirst({
          where: { asaasSubscriptionId: payment.subscription },
          select: {
            id: true,
            planId: true,
            plan: { select: { priceCents: true, name: true } },
          },
        });
        if (org) {
          record = await tx.payment.create({
            data: {
              organizationId: org.id,
              kind: "PLAN",
              status: "PENDING",
              asaasPaymentId: payment.id,
              valueCents: Math.round((payment.value ?? 0) * 100),
              dueDate: new Date(payment.dueDate ?? Date.now()),
              invoiceUrl: payment.invoiceUrl ?? null,
              description:
                payment.description ?? `Plano ${org.plan?.name ?? ""}`.trim(),
              planId: org.planId,
              billingType: payment.billingType ?? "UNDEFINED",
            },
          });
        }
      }
      if (!record) return;

      await tx.payment.update({
        where: { id: record.id },
        data: {
          status,
          ...(payment.invoiceUrl ? { invoiceUrl: payment.invoiceUrl } : {}),
          ...(payment.billingType ? { billingType: payment.billingType } : {}),
          ...(isPaid(status)
            ? {
                paidAt: payment.paymentDate
                  ? new Date(payment.paymentDate)
                  : new Date(),
              }
            : {}),
        },
      });

      if (record.kind === "PLAN") {
        const org = await tx.organization.findUnique({
          where: { id: record.organizationId },
          select: { subscriptionStatus: true, asaasSubscriptionId: true },
        });
        // Only charges of the subscription that is current count.
        if (
          org &&
          payment.subscription &&
          org.asaasSubscriptionId === payment.subscription
        ) {
          const next = subscriptionAfter(org.subscriptionStatus, status);
          await tx.organization.update({
            where: { id: record.organizationId },
            data: {
              subscriptionStatus: next,
              ...(isPaid(status)
                ? { planRenewsAt: renewalAfter(record.dueDate) }
                : {}),
            },
          });
        }
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return Response.json({ ok: true, duplicate: true });
    console.error(
      "[asaas webhook]",
      error instanceof Error ? error.message : error,
    );
    // A real failure: let Asaas try again.
    return new Response("Erro ao processar.", { status: 500 });
  }
  return Response.json({ ok: true });
}
