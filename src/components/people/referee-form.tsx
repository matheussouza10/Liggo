"use client";

import { ArrowRightIcon, CircleAlertIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  type FormEvent,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { REFEREE_ROLE_LABELS } from "@/lib/people/format";
import {
  saveRefereeAction,
  type RefereeFormState,
} from "@/lib/people/referee-actions";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type Group = { category: string; options: Option[] };
type Initial = {
  name: string;
  role: string;
  cpf: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseEntity: string;
  sportIds: string[];
};

const EMPTY: Initial = {
  name: "",
  role: "",
  cpf: "",
  email: "",
  phone: "",
  licenseNumber: "",
  licenseEntity: "",
  sportIds: [],
};

export function RefereeForm({
  refereeId,
  initial,
  sports,
}: {
  refereeId?: string;
  initial?: Initial;
  sports: Group[];
}) {
  const id = useId();
  const editing = Boolean(refereeId);
  const [state, formAction, pending] = useActionState(
    async (prev: RefereeFormState, formData: FormData) =>
      saveRefereeAction(refereeId ?? null, prev, formData),
    {} as RefereeFormState,
  );
  const stateValues = state.values as Partial<Initial> | undefined;
  const values: Initial = { ...(initial ?? EMPTY), ...(stateValues ?? {}) };
  const errors = state.fieldErrors ?? {};

  const [selected, setSelected] = useState<string[]>(values.sportIds);
  const [choice, setChoice] = useState("");
  const names = new Map(
    sports.flatMap((g) => g.options.map((o) => [o.id, o.name] as const)),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  const field = (key: string) => ({
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
  });
  const err = (key: string) => (
    <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>
  );
  const invalid = (key: string) => (errors[key] ? true : undefined);

  const add = () => {
    if (choice && !selected.includes(choice))
      setSelected([...selected, choice]);
    setChoice("");
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl">
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível salvar</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor={`${id}-name`}>Nome completo</FieldLabel>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={values.name}
              maxLength={120}
              autoComplete="off"
              className="h-10"
              {...field("name")}
            />
            {err("name")}
          </Field>
          <Field data-invalid={invalid("role")}>
            <FieldLabel htmlFor={`${id}-role`}>Função</FieldLabel>
            <NativeSelect
              id={`${id}-role`}
              name="role"
              defaultValue={values.role}
              className="w-full"
              {...field("role")}
            >
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {(
                Object.keys(
                  REFEREE_ROLE_LABELS,
                ) as (keyof typeof REFEREE_ROLE_LABELS)[]
              ).map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {REFEREE_ROLE_LABELS[r]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {err("role")}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field data-invalid={invalid("cpf")}>
            <FieldLabel htmlFor={`${id}-cpf`}>CPF (opcional)</FieldLabel>
            <Input
              id={`${id}-cpf`}
              name="cpf"
              inputMode="numeric"
              defaultValue={values.cpf}
              placeholder="000.000.000-00"
              autoComplete="off"
              className="h-10 tabular-nums"
              {...field("cpf")}
            />
            {err("cpf")}
          </Field>
          <Field data-invalid={invalid("email")}>
            <FieldLabel htmlFor={`${id}-email`}>E-mail (opcional)</FieldLabel>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              defaultValue={values.email}
              autoComplete="off"
              className="h-10"
              {...field("email")}
            />
            {err("email")}
          </Field>
          <Field data-invalid={invalid("phone")}>
            <FieldLabel htmlFor={`${id}-phone`}>Telefone (opcional)</FieldLabel>
            <Input
              id={`${id}-phone`}
              name="phone"
              inputMode="tel"
              defaultValue={values.phone}
              placeholder="(31) 99999-9999"
              autoComplete="off"
              className="h-10"
              {...field("phone")}
            />
            {err("phone")}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("licenseNumber")}>
            <FieldLabel htmlFor={`${id}-lic`}>
              Número da licença (opcional)
            </FieldLabel>
            <Input
              id={`${id}-lic`}
              name="licenseNumber"
              defaultValue={values.licenseNumber}
              maxLength={40}
              autoComplete="off"
              className="h-10"
              {...field("licenseNumber")}
            />
            {err("licenseNumber")}
          </Field>
          <Field data-invalid={invalid("licenseEntity")}>
            <FieldLabel htmlFor={`${id}-ent`}>
              Entidade emissora (opcional)
            </FieldLabel>
            <Input
              id={`${id}-ent`}
              name="licenseEntity"
              defaultValue={values.licenseEntity}
              maxLength={80}
              placeholder="Federação, confederação"
              autoComplete="off"
              className="h-10"
              {...field("licenseEntity")}
            />
            {err("licenseEntity")}
          </Field>
        </div>

        <Field data-invalid={invalid("sportIds")}>
          <FieldLabel htmlFor={`${id}-sport`}>
            Modalidades em que atua
          </FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            <NativeSelect
              id={`${id}-sport`}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full sm:w-80"
            >
              <NativeSelectOption value="">
                Escolha uma modalidade
              </NativeSelectOption>
              {sports.map((g) => (
                <NativeSelectOptGroup key={g.category} label={g.category}>
                  {g.options
                    .filter((o) => !selected.includes(o.id))
                    .map((o) => (
                      <NativeSelectOption key={o.id} value={o.id}>
                        {o.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelectOptGroup>
              ))}
            </NativeSelect>
            <Button
              type="button"
              variant="outline"
              onClick={add}
              disabled={!choice}
            >
              <PlusIcon data-icon="inline-start" />
              Adicionar
            </Button>
          </div>
          {selected.length > 0 ? (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Modalidades escolhidas"
            >
              {selected.map((sid) => (
                <li key={sid}>
                  <Badge variant="secondary" className="gap-1.5 pr-1">
                    {names.get(sid) ?? sid}
                    <button
                      type="button"
                      aria-label={`Remover ${names.get(sid) ?? sid}`}
                      onClick={() =>
                        setSelected(selected.filter((x) => x !== sid))
                      }
                      className="grid size-4 place-items-center rounded-full hover:bg-white/15"
                    >
                      <XIcon className="size-3" />
                    </button>
                    <input type="hidden" name="sportIds" value={sid} />
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <FieldDescription>
              Opcional. Ajuda a escolher árbitros por modalidade nas partidas.
            </FieldDescription>
          )}
          {err("sportIds")}
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="h-11 px-5 text-base"
          >
            {pending ? "Salvando" : editing ? "Salvar alterações" : "Cadastrar"}
            {pending ? (
              <Spinner data-icon="inline-end" />
            ) : (
              <ArrowRightIcon data-icon="inline-end" />
            )}
          </Button>
          <Link
            href="/referees"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 px-5 text-base",
            )}
          >
            Cancelar
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
