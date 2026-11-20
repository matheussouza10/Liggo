"use client";

import { RefreshCwIcon, Trash2Icon, WalletIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  createPaymentAccountAction,
  refreshPaymentAccountAction,
  removePaymentAccountAction,
  type AccountInput,
} from "@/lib/payments/actions";

const blank: AccountInput = {
  name: "",
  document: "",
  email: "",
  birthDate: "",
  companyType: "MEI",
  mobilePhone: "",
  postalCode: "",
  address: "",
  addressNumber: "",
  province: "",
  incomeValue: "",
};

export function PaymentAccountForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<AccountInput>({
    ...blank,
    name: defaultName,
    email: defaultEmail,
  });
  const [info, setInfo] = useState<string | null>(null);
  const { pending, error, run } = useAction();
  const set = (k: keyof AccountInput) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  const cnpj = v.document.replace(/\D/g, "").length > 11;
  const field = (
    k: keyof AccountInput,
    label: string,
    extra: Record<string, string> = {},
  ) => (
    <Field>
      <FieldLabel htmlFor={`acc-${k}`}>{label}</FieldLabel>
      <Input
        id={`acc-${k}`}
        value={v[k]}
        onChange={set(k)}
        className="h-10"
        {...extra}
      />
    </Field>
  );
  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {info ? (
        <Alert role="status">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {field("name", "Nome ou razão social")}
        {field("document", "CPF ou CNPJ", {
          inputMode: "numeric",
          autoComplete: "off",
        })}
        {field("email", "E-mail", { type: "email" })}
        {field("mobilePhone", "Celular com DDD", { inputMode: "tel" })}
        {cnpj ? (
          <Field>
            <FieldLabel htmlFor="acc-companyType">Tipo de empresa</FieldLabel>
            <NativeSelect
              id="acc-companyType"
              className="w-full"
              value={v.companyType}
              onChange={set("companyType")}
            >
              <NativeSelectOption value="MEI">MEI</NativeSelectOption>
              <NativeSelectOption value="LIMITED">Limitada</NativeSelectOption>
              <NativeSelectOption value="INDIVIDUAL">
                Individual
              </NativeSelectOption>
              <NativeSelectOption value="ASSOCIATION">
                Associação
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        ) : (
          field("birthDate", "Data de nascimento do titular", { type: "date" })
        )}
        {field("incomeValue", "Faturamento ou renda mensal (R$)", {
          inputMode: "decimal",
        })}
        {field("postalCode", "CEP", { inputMode: "numeric" })}
        {field("address", "Rua")}
        {field("addressNumber", "Número")}
        {field("province", "Bairro")}
      </div>
      <div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setInfo(null);
            run(
              async () => {
                const r = await createPaymentAccountAction(v);
                if (r.ok) setInfo(r.message ?? "Conta criada.");
                return r;
              },
              () => router.refresh(),
            );
          }}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <WalletIcon data-icon="inline-start" />
          )}
          Criar conta de recebimento
        </Button>
      </div>
    </div>
  );
}

export function PaymentAccountControls({ approved }: { approved: boolean }) {
  const router = useRouter();
  const [info, setInfo] = useState<string | null>(null);
  const refresh = useAction();
  const remove = useAction();
  const error = refresh.error ?? remove.error;
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
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
          variant="outline"
          disabled={refresh.pending}
          onClick={() =>
            refresh.run(
              async () => {
                const r = await refreshPaymentAccountAction();
                if (r.ok) setInfo(r.message ?? "Atualizado.");
                return r;
              },
              () => router.refresh(),
            )
          }
        >
          {refresh.pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          Atualizar situação
        </Button>
        {!approved ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={remove.pending}
            onClick={() =>
              remove.run(
                () => removePaymentAccountAction(),
                () => router.refresh(),
              )
            }
          >
            <Trash2Icon data-icon="inline-start" />
            Remover e cadastrar de novo
          </Button>
        ) : null}
      </div>
    </div>
  );
}
