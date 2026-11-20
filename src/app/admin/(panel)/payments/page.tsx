import { CreditCardIcon } from "lucide-react";
import type { Metadata } from "next";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";
import { requireSystemAdmin } from "@/lib/auth/guards";
import { appUrl } from "@/lib/mail";
import { decryptSecret, maskSecret } from "@/lib/payments/crypto";
import { getPaymentSettings } from "@/lib/payments/asaas";

export const metadata: Metadata = {
  title: "Pagamentos | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminPaymentsPage() {
  await requireSystemAdmin();
  const settings = await getPaymentSettings();
  let keyMask: string | null = null;
  if (settings?.apiKeyEnc) {
    try {
      keyMask = maskSecret(decryptSecret(settings.apiKeyEnc));
    } catch {
      keyMask = "ilegível (a chave de criptografia mudou: salve de novo)";
    }
  }
  const webhookUrl = `${appUrl()}/api/webhooks/asaas`;
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Pagamentos
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Conta do Asaas da plataforma. Ela recebe os planos das organizações;
          as inscrições dos eventos são recebidas na subconta de cada
          organização.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <section
          aria-label="Configuração do Asaas"
          className="liquid-card rounded-xl p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl leading-none font-bold tracking-wide uppercase">
            <CreditCardIcon className="size-5" aria-hidden />
            Asaas
          </h2>
          <PaymentSettingsForm
            initial={{
              environment: settings?.environment ?? "SANDBOX",
              keyMask,
              webhookToken: settings?.webhookToken ?? "",
              baseUrl: settings?.baseUrl ?? "",
            }}
          />
        </section>
        <aside
          aria-label="Como configurar"
          className="liquid-card flex flex-col gap-3 rounded-xl p-5 text-sm"
        >
          <h2 className="font-display text-xl leading-none font-bold tracking-wide uppercase">
            Como configurar
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
            <li>
              No Asaas, gere uma chave de API da conta da plataforma (comece
              pelo sandbox).
            </li>
            <li>Cole a chave aqui, gere o token do webhook e salve.</li>
            <li>Use &quot;Testar conexão&quot; para confirmar.</li>
            <li>Cadastre os planos em Planos.</li>
          </ol>
          <p className="text-muted-foreground">
            Endereço que o Asaas chama:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 break-all">
              {webhookUrl}
            </code>
          </p>
          <p className="text-muted-foreground">
            O Liggo registra esse webhook sozinho na conta da plataforma e em
            cada subconta. As subcontas por API exigem que o modelo BaaS esteja
            habilitado na sua conta Asaas (peça ao gerente de contas).
          </p>
        </aside>
      </div>
    </div>
  );
}
