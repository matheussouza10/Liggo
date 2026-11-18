"use client";

import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useId,
  useState,
  type FormEvent,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { BR_STATES } from "@/lib/events/constants";
import { saveTeamAction, type TeamFormState } from "@/lib/people/team-actions";
import { cn } from "@/lib/utils";

type Initial = {
  name: string;
  shortName: string;
  city: string;
  state: string;
  color: string;
};

export function TeamForm({
  teamId,
  initial,
}: {
  teamId?: string;
  initial?: Initial;
}) {
  const id = useId();
  const editing = Boolean(teamId);
  const [state, formAction, pending] = useActionState(
    async (prev: TeamFormState, formData: FormData) =>
      saveTeamAction(teamId ?? null, prev, formData),
    {} as TeamFormState,
  );
  const values = state.values ??
    initial ?? { name: "", shortName: "", city: "", state: "", color: "" };
  const errors = state.fieldErrors ?? {};
  const [color, setColor] = useState(values.color ?? "");

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
  const swatch = /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl">
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Não foi possível salvar</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor={`${id}-name`}>Nome do time</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={values.name ?? ""}
            maxLength={60}
            autoComplete="off"
            className="h-10"
            {...field("name")}
          />
          {err("name")}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("shortName")}>
            <FieldLabel htmlFor={`${id}-short`}>Sigla (opcional)</FieldLabel>
            <Input
              id={`${id}-short`}
              name="shortName"
              defaultValue={values.shortName ?? ""}
              maxLength={8}
              placeholder="AGU"
              autoComplete="off"
              className="h-10 uppercase"
              {...field("shortName")}
            />
            {err("shortName")}
          </Field>
          <Field data-invalid={invalid("color")}>
            <FieldLabel htmlFor={`${id}-color`}>Cor (opcional)</FieldLabel>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "size-10 shrink-0 rounded-lg border",
                  !swatch && "bg-muted/40",
                )}
                style={swatch ? { backgroundColor: swatch } : undefined}
              />
              <Input
                id={`${id}-color`}
                name="color"
                defaultValue={values.color ?? ""}
                onChange={(e) => setColor(e.target.value.trim())}
                placeholder="#187CFA"
                autoComplete="off"
                className="h-10 tabular-nums"
                {...field("color")}
              />
            </div>
            {err("color")}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field data-invalid={invalid("city")}>
            <FieldLabel htmlFor={`${id}-city`}>Cidade (opcional)</FieldLabel>
            <Input
              id={`${id}-city`}
              name="city"
              defaultValue={values.city ?? ""}
              maxLength={80}
              autoComplete="off"
              className="h-10"
              {...field("city")}
            />
            {err("city")}
          </Field>
          <Field data-invalid={invalid("state")}>
            <FieldLabel htmlFor={`${id}-state`}>UF</FieldLabel>
            <NativeSelect
              id={`${id}-state`}
              name="state"
              defaultValue={values.state ?? ""}
              className="w-full"
              {...field("state")}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {BR_STATES.map((uf) => (
                <NativeSelectOption key={uf} value={uf}>
                  {uf}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {err("state")}
          </Field>
        </div>

        <FieldDescription>
          O elenco não fica no time: você escolhe os atletas de cada evento na
          inscrição.
        </FieldDescription>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="h-11 px-5 text-base"
          >
            {pending
              ? "Salvando"
              : editing
                ? "Salvar alterações"
                : "Cadastrar time"}
            {pending ? (
              <Spinner data-icon="inline-end" />
            ) : (
              <ArrowRightIcon data-icon="inline-end" />
            )}
          </Button>
          <Link
            href="/teams"
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
