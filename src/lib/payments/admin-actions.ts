"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { appUrl } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import {
  AsaasClient,
  AsaasError,
  baseUrlOf,
  getPaymentSettings,
} from "./asaas";
import { decryptSecret, encryptSecret } from "./crypto";
import { parseMoney } from "./money";

export type Result =
  { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export async function savePaymentSettingsAction(input: {
  environment: string;
  apiKey: string;
  webhookToken: string;
  baseUrl: string;
}): Promise<Result> {
  await requireSystemAdmin();
  if (input.environment !== "SANDBOX" && input.environment !== "PRODUCTION")
    return fail("Escolha o ambiente.");
  const apiKey = String(input.apiKey ?? "").trim();
  const token = String(input.webhookToken ?? "").trim();
  const baseUrl = String(input.baseUrl ?? "").trim();
  if (token && (token.length < 32 || token.length > 255 || /\s/.test(token)))
    return fail(
      "O token do webhook precisa ter de 32 a 255 caracteres, sem espaços.",
    );
  if (apiKey && apiKey === token)
    return fail("O token do webhook não pode ser igual à chave da API.");
  if (baseUrl && !/^https?:\/\/[^\s]+$/.test(baseUrl))
    return fail("Endereço inválido.");
  if (apiKey.length > 500) return fail("Chave muito longa.");

  const data = {
    environment: input.environment as "SANDBOX" | "PRODUCTION",
    // An empty field keeps what is stored: the key is never shown again.
    ...(apiKey ? { apiKeyEnc: encryptSecret(apiKey) } : {}),
    ...(token ? { webhookToken: token } : {}),
    baseUrl: baseUrl || null,
  };
  await prisma.paymentSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
  revalidatePath("/admin/payments");
  return { ok: true, message: "Configuração salva." };
}

/** A random token that meets the Asaas rules. */
export async function generateWebhookTokenAction(): Promise<{ token: string }> {
  await requireSystemAdmin();
  return { token: randomBytes(32).toString("base64url") };
}

export async function testPaymentConnectionAction(): Promise<Result> {
  await requireSystemAdmin();
  const settings = await getPaymentSettings();
  if (!settings?.apiKeyEnc)
    return fail("Salve a chave da API antes de testar.");
  try {
    const client = new AsaasClient(
      decryptSecret(settings.apiKeyEnc),
      baseUrlOf(settings),
    );
    const { balance } = await client.balance();
    return {
      ok: true,
      message: `Conexão ativa (${settings.environment === "SANDBOX" ? "sandbox" : "produção"}). Saldo da conta: R$ ${Number(balance).toFixed(2).replace(".", ",")}.`,
    };
  } catch (error) {
    if (error instanceof AsaasError)
      return fail(
        error.status === 401
          ? "O Asaas recusou a chave (não autorizada). Confira a chave e o ambiente."
          : error.message,
      );
    return fail(
      "Não foi possível falar com o Asaas. Confira o ambiente e a rede.",
    );
  }
}

/** Tells the platform's Asaas account where to send the payment notices. */
export async function registerPlatformWebhookAction(): Promise<Result> {
  const admin = await requireSystemAdmin();
  const settings = await getPaymentSettings();
  if (!settings?.apiKeyEnc || !settings.webhookToken)
    return fail("Salve a chave da API e o token do webhook primeiro.");
  try {
    const client = new AsaasClient(
      decryptSecret(settings.apiKeyEnc),
      baseUrlOf(settings),
    );
    await client.registerWebhook({
      url: `${appUrl()}/api/webhooks/asaas`,
      email: admin.email,
      authToken: settings.webhookToken,
    });
    return { ok: true, message: "Webhook registrado na conta da plataforma." };
  } catch (error) {
    return fail(
      error instanceof AsaasError
        ? error.message
        : "Não foi possível registrar o webhook.",
    );
  }
}

// ---------------------------------------------------------------- plans

export type PlanInput = {
  name: string;
  description: string;
  price: string;
  maxEvents: string;
  maxAthletes: string;
  maxRegistrationsPerEvent: string;
  active: boolean;
  isDefault: boolean;
};

const limit = (
  text: string,
  label: string,
): { value: number | null } | { error: string } => {
  const t = String(text ?? "").trim();
  if (t === "") return { value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1 || n > 1_000_000)
    return {
      error: `${label}: use um número inteiro de 1 a 1.000.000, ou deixe em branco para sem limite.`,
    };
  return { value: n };
};

export async function savePlanAction(
  id: string | null,
  input: PlanInput,
): Promise<Result> {
  await requireSystemAdmin();
  const name = String(input.name ?? "").trim();
  if (name.length < 2 || name.length > 40)
    return fail("Dê um nome ao plano (2 a 40 caracteres).");
  const description = String(input.description ?? "").trim();
  if (description.length > 200)
    return fail("A descrição pode ter no máximo 200 caracteres.");
  const priceCents = parseMoney(String(input.price ?? ""));
  if (priceCents === null)
    return fail(
      "Informe o valor mensal (ex.: 49,90). Use 0 para plano gratuito.",
    );
  const events = limit(input.maxEvents, "Eventos");
  const athletes = limit(input.maxAthletes, "Atletas");
  const regs = limit(input.maxRegistrationsPerEvent, "Inscrições por evento");
  for (const l of [events, athletes, regs])
    if ("error" in l) return fail(l.error);
  if (input.isDefault && priceCents > 0)
    return fail(
      "O plano padrão é o das organizações sem assinatura: deixe-o gratuito (valor 0).",
    );
  if (input.isDefault && !input.active)
    return fail("O plano padrão precisa estar ativo.");

  const clash = await prisma.plan.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (clash) return fail("Já existe um plano com esse nome.");

  const data = {
    name,
    description: description || null,
    priceCents,
    maxEvents: (events as { value: number | null }).value,
    maxAthletes: (athletes as { value: number | null }).value,
    maxRegistrationsPerEvent: (regs as { value: number | null }).value,
    active: input.active,
    isDefault: input.isDefault,
  };
  if (id) {
    const current = await prisma.plan.findUnique({
      where: { id },
      select: { isDefault: true },
    });
    if (!current) return fail("Plano não encontrado.");
    if (current.isDefault && !data.isDefault)
      return fail(
        "Sempre precisa existir um plano padrão. Defina outro como padrão e este deixa de ser.",
      );
  }
  await prisma.$transaction(async (tx) => {
    // Only one plan is the default.
    if (data.isDefault)
      await tx.plan.updateMany({
        where: id ? { NOT: { id } } : {},
        data: { isDefault: false },
      });
    if (id) await tx.plan.update({ where: { id }, data });
    else await tx.plan.create({ data });
  });
  revalidatePath("/admin/plans");
  return { ok: true, message: id ? "Plano salvo." : "Plano criado." };
}

export async function deletePlanAction(id: string): Promise<Result> {
  await requireSystemAdmin();
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { isDefault: true, _count: { select: { organizations: true } } },
  });
  if (!plan) return fail("Plano não encontrado.");
  if (plan.isDefault)
    return fail(
      "O plano padrão não pode ser excluído. Defina outro como padrão primeiro.",
    );
  if (plan._count.organizations > 0)
    return fail(
      `${plan._count.organizations} organização(ões) usam este plano. Desative-o em vez de excluir.`,
    );
  await prisma.plan.delete({ where: { id } });
  revalidatePath("/admin/plans");
  return { ok: true };
}
