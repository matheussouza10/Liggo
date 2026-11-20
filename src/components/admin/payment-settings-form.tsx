"use client";

import { PlugZapIcon, RefreshCwIcon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  generateWebhookTokenAction,
  savePaymentSettingsAction,
  registerPlatformWebhookAction,
  testPaymentConnectionAction,
} from "@/lib/payments/admin-actions";

type Props = {
  initial: {
    environment: "SANDBOX" | "PRODUCTION";
    keyMask: string | null;
    webhookToken: string;
    baseUrl: string;
  };
};

export function PaymentSettingsForm({ initial }: Props) {
  const [environment, setEnvironment] = useState(initial.environment);
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState(initial.webhookToken);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [info, setInfo] = useState<string | null>(null);
  const save = useAction();
  const test = useAction();
  const hook = useAction();

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor="pay-env">Ambiente</FieldLabel>
        <NativeSelect
          id="pay-env"
          className="w-full"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value as typeof environment)}
        >
          <NativeSelectOption value="SANDBOX">
            Sandbox (testes, sem dinheiro de verdade)
          </NativeSelectOption>
          <NativeSelectOption value="PRODUCTION">
            Produção (cobranças reais)
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="pay-key">
          Chave da API do Asaas (conta da plataforma)
        </FieldLabel>
        <Input
          id="pay-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            initial.keyMask
              ? `Chave salva (${initial.keyMask}). Deixe em branco para manter.`
              : "$aact_..."
          }
          className="h-10 font-mono"
        />
        <FieldDescription>
          Fica criptografada no banco e nunca aparece de novo. É a conta que
          recebe os planos.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="pay-token">Token do webhook</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="pay-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="h-10 font-mono"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            onClick={async () =>
              setToken((await generateWebhookTokenAction()).token)
            }
          >
            <RefreshCwIcon data-icon="inline-start" />
            Gerar
          </Button>
        </div>
        <FieldDescription>
          De 32 a 255 caracteres. O Liggo o envia ao Asaas ao registrar o
          webhook e confere o cabeçalho asaas-access-token em cada aviso.
        </FieldDescription>
      </Field>
      <details className="rounded-lg border border-white/10 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Avançado: endereço da API
        </summary>
        <Field className="mt-3">
          <FieldLabel htmlFor="pay-url">Endereço (opcional)</FieldLabel>
          <Input
            id="pay-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Em branco usa o endereço oficial do ambiente"
            className="h-10 font-mono"
          />
        </Field>
      </details>

      {save.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{save.error}</AlertDescription>
        </Alert>
      ) : null}
      {hook.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{hook.error}</AlertDescription>
        </Alert>
      ) : null}
      {test.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{test.error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert role="status">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={save.pending}
          onClick={() => {
            setInfo(null);
            save.run(
              async () => {
                const r = await savePaymentSettingsAction({
                  environment,
                  apiKey,
                  webhookToken: token,
                  baseUrl,
                });
                if (r.ok) {
                  setApiKey("");
                  setInfo(r.message ?? "Salvo.");
                }
                return r;
              },
              () => undefined,
            );
          }}
        >
          {save.pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Salvar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={test.pending}
          onClick={() => {
            setInfo(null);
            test.run(async () => {
              const r = await testPaymentConnectionAction();
              if (r.ok) setInfo(r.message ?? "Conexão ativa.");
              return r;
            });
          }}
        >
          {test.pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PlugZapIcon data-icon="inline-start" />
          )}
          Testar conexão
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={hook.pending}
          onClick={() => {
            setInfo(null);
            hook.run(async () => {
              const r = await registerPlatformWebhookAction();
              if (r.ok) setInfo(r.message ?? "Webhook registrado.");
              return r;
            });
          }}
        >
          {hook.pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          Registrar webhook
        </Button>
      </div>
    </div>
  );
}
