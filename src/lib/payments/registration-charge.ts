import "server-only";

import { prisma } from "@/lib/prisma";
import { getOrganizationClient } from "./asaas";

/** Days the participant has to pay. */
const DUE_DAYS = 5;

export type ChargeOutcome =
  | { status: "created"; url: string | null }
  | { status: "skipped"; reason: "free" | "no-account" | "exists" }
  | { status: "failed"; error: string };

/**
 * Charges the registration fee in the organization's own Asaas subaccount, so
 * the money goes to the organizer. Best effort: the registration stands even
 * when the charge cannot be created (the organizer can retry).
 */
export async function chargeRegistration(
  registrationId: string,
  payer: { name: string; email: string },
): Promise<ChargeOutcome> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      event: { select: { name: true, organizationId: true } },
      category: { select: { name: true, feeCents: true } },
      payments: {
        where: { kind: "REGISTRATION", status: { notIn: ["CANCELED"] } },
        select: { id: true },
      },
    },
  });
  if (!registration)
    return { status: "failed", error: "Inscrição não encontrada." };
  const fee = registration.category.feeCents;
  if (fee <= 0) return { status: "skipped", reason: "free" };
  if (registration.payments.length > 0)
    return { status: "skipped", reason: "exists" };
  const client = await getOrganizationClient(registration.event.organizationId);
  if (!client) return { status: "skipped", reason: "no-account" };

  try {
    const customer = await client.createCustomer({
      name: payer.name,
      email: payer.email,
      externalReference: registration.id,
    });
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + DUE_DAYS);
    const dueDate = due.toISOString().slice(0, 10);
    const description = `Inscrição ${registration.event.name} - ${registration.category.name}`;
    const created = await client.createPayment({
      customer: customer.id,
      value: fee / 100,
      dueDate,
      description,
      externalReference: `registration:${registration.id}`,
    });
    await prisma.payment.create({
      data: {
        organizationId: registration.event.organizationId,
        kind: "REGISTRATION",
        status: "PENDING",
        asaasPaymentId: created.id,
        valueCents: fee,
        dueDate: new Date(dueDate),
        invoiceUrl: created.invoiceUrl ?? null,
        description,
        registrationId: registration.id,
      },
    });
    return { status: "created", url: created.invoiceUrl ?? null };
  } catch (error) {
    return {
      status: "failed",
      error:
        error instanceof Error ? error.message : "Falha ao criar a cobrança.",
    };
  }
}
