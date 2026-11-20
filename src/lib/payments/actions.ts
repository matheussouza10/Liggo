"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { appUrl } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import {
  AsaasClient,
  AsaasError,
  PaymentsNotConfiguredError,
  baseUrlOf,
  getPaymentSettings,
  getPlatformClient,
} from "./asaas";
import { decryptSecret, encryptSecret } from "./crypto";
import { documentKind, maskDocument, normalizeDocument } from "./documents";

export type Result =
  { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

async function ownerOrganization() {
  const user = await requireOrganizationUser();
  if (!user.organization) return null;
  if (user.role !== "OWNER") return null;
  return { user, organization: user.organization };
}
const notOwner = fail("Só o proprietário da organização gerencia pagamentos.");

const message = (error: unknown) => {
  if (error instanceof PaymentsNotConfiguredError) return error.message;
  if (error instanceof AsaasError) return error.message;
  return "Não foi possível falar com o Asaas. Tente de novo em instantes.";
};

// ---------------------------------------------------------------- subaccount

export type AccountInput = {
  name: string;
  document: string;
  email: string;
  birthDate: string;
  companyType: string;
  mobilePhone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  province: string;
  incomeValue: string;
};

const COMPANY_TYPES = ["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"];

/** Creates the Asaas subaccount that receives the registration fees of the organization. */
export async function createPaymentAccountAction(
  input: AccountInput,
): Promise<Result> {
  const ctx = await ownerOrganization();
  if (!ctx) return notOwner;
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  const document = normalizeDocument(input.document);
  const kind = documentKind(document);
  const phone = String(input.mobilePhone ?? "").replace(/\D/g, "");
  const postalCode = String(input.postalCode ?? "").replace(/\D/g, "");
  const income = Number(
    String(input.incomeValue ?? "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  if (name.length < 3) return fail("Informe o nome (ou razão social).");
  if (!kind) return fail("CPF ou CNPJ inválido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail("E-mail inválido.");
  if (kind === "CPF" && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate))
    return fail("Informe a data de nascimento do titular.");
  if (kind === "CNPJ" && !COMPANY_TYPES.includes(input.companyType))
    return fail("Escolha o tipo de empresa.");
  if (phone.length < 10 || phone.length > 11)
    return fail("Celular com DDD, 10 ou 11 números.");
  if (postalCode.length !== 8) return fail("CEP com 8 números.");
  if (
    String(input.address ?? "").trim().length < 3 ||
    String(input.addressNumber ?? "").trim() === "" ||
    String(input.province ?? "").trim().length < 2
  )
    return fail("Informe rua, número e bairro.");
  if (!Number.isFinite(income) || income <= 0)
    return fail("Informe o faturamento ou a renda mensal estimada.");

  const existing = await prisma.organizationPaymentAccount.findUnique({
    where: { organizationId: ctx.organization.id },
  });
  if (existing) return fail("A organização já tem uma conta de recebimento.");

  try {
    const platform = await getPlatformClient();
    const created = await platform.createSubAccount({
      name,
      email,
      cpfCnpj: document,
      ...(kind === "CPF"
        ? { birthDate: input.birthDate }
        : { companyType: input.companyType }),
      mobilePhone: phone,
      address: input.address.trim(),
      addressNumber: input.addressNumber.trim(),
      province: input.province.trim(),
      postalCode,
      incomeValue: income,
    });
    const settings = await getPaymentSettings();
    await prisma.organizationPaymentAccount.create({
      data: {
        organizationId: ctx.organization.id,
        asaasAccountId: created.id,
        walletId: created.walletId ?? null,
        apiKeyEnc: encryptSecret(created.apiKey),
        holderName: name,
        holderDocument: maskDocument(document),
      },
    });
    // The key is shown only now: from here on it lives encrypted. Payment notices go to us.
    let note = "";
    if (settings?.webhookToken) {
      try {
        await new AsaasClient(
          created.apiKey,
          baseUrlOf(settings),
        ).registerWebhook({
          url: `${appUrl()}/api/webhooks/asaas`,
          email,
          authToken: settings.webhookToken,
        });
      } catch {
        note =
          " O aviso automático de pagamentos não pôde ser registrado agora; use Atualizar situação mais tarde.";
      }
    }
    revalidatePath("/settings/payments");
    return {
      ok: true,
      message: `Conta criada. O Asaas analisa os dados antes de liberar as cobranças.${note}`,
    };
  } catch (error) {
    return fail(message(error));
  }
}

/** Asks Asaas whether the subaccount was approved. */
export async function refreshPaymentAccountAction(): Promise<Result> {
  const ctx = await ownerOrganization();
  if (!ctx) return notOwner;
  const account = await prisma.organizationPaymentAccount.findUnique({
    where: { organizationId: ctx.organization.id },
  });
  if (!account)
    return fail("A organização ainda não tem conta de recebimento.");
  try {
    const settings = await getPaymentSettings();
    const status = await new AsaasClient(
      decryptSecret(account.apiKeyEnc),
      baseUrlOf(settings),
    ).accountStatus();
    const next =
      status.general === "APPROVED"
        ? "APPROVED"
        : status.general === "REJECTED"
          ? "REJECTED"
          : "PENDING";
    await prisma.organizationPaymentAccount.update({
      where: { id: account.id },
      data: { status: next },
    });
    revalidatePath("/settings/payments");
    return {
      ok: true,
      message:
        next === "APPROVED"
          ? "Conta aprovada. Já dá para cobrar inscrições."
          : next === "REJECTED"
            ? "O Asaas recusou o cadastro."
            : "Ainda em análise no Asaas.",
    };
  } catch (error) {
    return fail(message(error));
  }
}

/** Forgets the stored account (to register again after a rejection). */
export async function removePaymentAccountAction(): Promise<Result> {
  const ctx = await ownerOrganization();
  if (!ctx) return notOwner;
  const account = await prisma.organizationPaymentAccount.findUnique({
    where: { organizationId: ctx.organization.id },
  });
  if (!account) return { ok: true };
  if (account.status === "APPROVED")
    return fail(
      "Uma conta aprovada não pode ser removida por aqui. Fale com o suporte.",
    );
  await prisma.organizationPaymentAccount.delete({ where: { id: account.id } });
  revalidatePath("/settings/payments");
  return { ok: true };
}

// ---------------------------------------------------------------- plan

/** Subscribes the organization to a paid plan: customer + monthly subscription in the platform account. */
export async function subscribeToPlanAction(
  planId: string,
  documentInput: string,
): Promise<Result> {
  const ctx = await ownerOrganization();
  if (!ctx) return notOwner;
  const plan = await prisma.plan.findFirst({
    where: { id: String(planId), active: true },
  });
  if (!plan) return fail("Plano não encontrado.");
  if (plan.priceCents === 0)
    return fail("Este plano é gratuito: ele vale sem assinatura.");
  const document = normalizeDocument(documentInput);
  if (!documentKind(document))
    return fail("Informe o CPF ou CNPJ de quem paga o plano.");

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.organization.id },
    select: {
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      subscriptionStatus: true,
    },
  });
  if (
    org.asaasSubscriptionId &&
    (org.subscriptionStatus === "ACTIVE" ||
      org.subscriptionStatus === "PENDING" ||
      org.subscriptionStatus === "OVERDUE")
  )
    return fail(
      "Já existe uma assinatura. Cancele-a antes de escolher outro plano.",
    );

  try {
    const platform = await getPlatformClient();
    let customerId = org.asaasCustomerId;
    if (!customerId) {
      const customer = await platform.createCustomer({
        name: ctx.organization.name,
        cpfCnpj: document,
        email: ctx.user.email,
        externalReference: ctx.organization.id,
      });
      customerId = customer.id;
    }
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 1);
    const subscription = await platform.createSubscription({
      customer: customerId,
      value: plan.priceCents / 100,
      nextDueDate: due.toISOString().slice(0, 10),
      description: `Plano ${plan.name} - Liggo`,
      externalReference: `plan:${ctx.organization.id}:${plan.id}`,
    });
    await prisma.organization.update({
      where: { id: ctx.organization.id },
      data: {
        planId: plan.id,
        asaasCustomerId: customerId,
        asaasSubscriptionId: subscription.id,
        subscriptionStatus: "PENDING",
      },
    });
    // The first charge, with its payment link.
    const first = (await platform.listSubscriptionPayments(subscription.id))
      .data[0];
    if (first) {
      await prisma.payment.upsert({
        where: { asaasPaymentId: first.id },
        create: {
          organizationId: ctx.organization.id,
          kind: "PLAN",
          status: "PENDING",
          asaasPaymentId: first.id,
          valueCents: plan.priceCents,
          dueDate: new Date(first.dueDate),
          invoiceUrl: first.invoiceUrl ?? null,
          description: `Plano ${plan.name}`,
          planId: plan.id,
        },
        update: {},
      });
    }
    revalidatePath("/settings/plan");
    return {
      ok: true,
      message:
        "Assinatura criada. Pague a primeira cobrança para ativar o plano.",
    };
  } catch (error) {
    return fail(message(error));
  }
}

export async function cancelSubscriptionAction(): Promise<Result> {
  const ctx = await ownerOrganization();
  if (!ctx) return notOwner;
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.organization.id },
    select: { asaasSubscriptionId: true },
  });
  if (!org.asaasSubscriptionId) return fail("Não há assinatura para cancelar.");
  try {
    const platform = await getPlatformClient();
    await platform.cancelSubscription(org.asaasSubscriptionId);
  } catch (error) {
    // Already gone in Asaas is fine; anything else the owner should know.
    if (!(error instanceof AsaasError && error.status === 404))
      return fail(message(error));
  }
  await prisma.organization.update({
    where: { id: ctx.organization.id },
    data: {
      subscriptionStatus: "CANCELED",
      asaasSubscriptionId: null,
      planRenewsAt: null,
    },
  });
  revalidatePath("/settings/plan");
  return {
    ok: true,
    message: "Assinatura cancelada. A organização volta ao plano padrão.",
  };
}
