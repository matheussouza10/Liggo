import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "./crypto";

export const ASAAS_URLS = {
  SANDBOX: "https://api-sandbox.asaas.com/v3",
  PRODUCTION: "https://api.asaas.com/v3",
} as const;

export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super(
      "O pagamento ainda não foi configurado pelo administrador (chave do Asaas).",
    );
  }
}

type Json = Record<string, unknown>;

/** Thin client of the Asaas API v3. The key of the account decides who receives the money. */
export class AsaasClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  private async call<T = Json>(
    method: string,
    path: string,
    body?: Json,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        access_token: this.apiKey,
        "content-type": "application/json",
        "user-agent": "Liggo",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    if (!res.ok) {
      const errors = (data as { errors?: { description?: string }[] } | null)
        ?.errors;
      throw new AsaasError(
        errors?.[0]?.description ?? `Asaas respondeu ${res.status}.`,
        res.status,
      );
    }
    return data as T;
  }

  /** Cheap authenticated call, used to test a key. */
  balance() {
    return this.call<{ balance: number }>("GET", "/finance/balance");
  }

  createCustomer(input: {
    name: string;
    cpfCnpj?: string;
    email?: string;
    externalReference?: string;
  }) {
    return this.call<{ id: string }>("POST", "/customers", {
      ...input,
      notificationDisabled: false,
    });
  }

  /** `value` is in reais (Asaas takes decimals). */
  createPayment(input: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
    billingType?: "UNDEFINED" | "PIX" | "BOLETO" | "CREDIT_CARD";
  }) {
    return this.call<{
      id: string;
      status: string;
      invoiceUrl?: string;
      dueDate: string;
      value: number;
    }>("POST", "/payments", { billingType: "UNDEFINED", ...input });
  }

  getPayment(id: string) {
    return this.call<{
      id: string;
      status: string;
      invoiceUrl?: string;
      value: number;
      dueDate: string;
    }>("GET", `/payments/${encodeURIComponent(id)}`);
  }

  deletePayment(id: string) {
    return this.call("DELETE", `/payments/${encodeURIComponent(id)}`);
  }

  createSubscription(input: {
    customer: string;
    value: number;
    nextDueDate: string;
    description: string;
    externalReference: string;
  }) {
    return this.call<{ id: string; status: string }>("POST", "/subscriptions", {
      billingType: "UNDEFINED",
      cycle: "MONTHLY",
      ...input,
    });
  }

  listSubscriptionPayments(subscriptionId: string) {
    return this.call<{
      data: {
        id: string;
        status: string;
        invoiceUrl?: string;
        value: number;
        dueDate: string;
      }[];
    }>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`);
  }

  cancelSubscription(id: string) {
    return this.call("DELETE", `/subscriptions/${encodeURIComponent(id)}`);
  }

  /** A subaccount that receives money on its own. The response carries the key, shown only once. */
  createSubAccount(input: Json) {
    return this.call<{
      id: string;
      apiKey: string;
      walletId?: string;
      accountNumber?: Json;
    }>("POST", "/accounts", input);
  }

  /** Approval of the account: the general status is APPROVED, PENDING, AWAITING_ACTION_AUTHORIZATION or REJECTED. */
  accountStatus() {
    return this.call<{ general?: string; commercialInfo?: string }>(
      "GET",
      "/myAccount/status",
    );
  }

  /** Where Asaas must notify us about the payments of this account. */
  registerWebhook(input: { url: string; email: string; authToken: string }) {
    return this.call("POST", "/webhooks", {
      name: "Liggo",
      url: input.url,
      email: input.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: input.authToken,
      sendType: "SEQUENTIALLY",
      events: [
        "PAYMENT_CREATED",
        "PAYMENT_CONFIRMED",
        "PAYMENT_RECEIVED",
        "PAYMENT_OVERDUE",
        "PAYMENT_REFUNDED",
        "PAYMENT_DELETED",
        "PAYMENT_UPDATED",
      ],
    });
  }
}

export async function getPaymentSettings() {
  return prisma.paymentSettings.findUnique({ where: { id: "singleton" } });
}

export function baseUrlOf(
  settings: {
    environment: "SANDBOX" | "PRODUCTION";
    baseUrl: string | null;
  } | null,
): string {
  return (
    settings?.baseUrl?.trim().replace(/\/$/, "") ||
    ASAAS_URLS[settings?.environment ?? "SANDBOX"]
  );
}

/** The client of the platform's own account (plans are paid here). */
export async function getPlatformClient(): Promise<AsaasClient> {
  const settings = await getPaymentSettings();
  if (!settings?.apiKeyEnc) throw new PaymentsNotConfiguredError();
  return new AsaasClient(
    decryptSecret(settings.apiKeyEnc),
    baseUrlOf(settings),
  );
}

/** The client of an organization's subaccount (registration fees are paid here). */
export async function getOrganizationClient(
  organizationId: string,
): Promise<AsaasClient | null> {
  const [settings, account] = await Promise.all([
    getPaymentSettings(),
    prisma.organizationPaymentAccount.findUnique({ where: { organizationId } }),
  ]);
  if (!account || account.status !== "APPROVED") return null;
  return new AsaasClient(decryptSecret(account.apiKeyEnc), baseUrlOf(settings));
}
