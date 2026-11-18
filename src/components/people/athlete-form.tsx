"use client";

import {
  ArrowRightIcon,
  CircleAlertIcon,
  InfoIcon,
  UserCheckIcon,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { parseDateInput } from "@/lib/events/constants";
import {
  createAthleteAction,
  linkAthleteByCpfAction,
  updateAthleteAction,
  type AthleteFormState,
} from "@/lib/people/athlete-actions";
import { GENDER_LABELS, ageOn } from "@/lib/people/format";
import { cn } from "@/lib/utils";

type Initial = {
  name: string;
  birthDate: string;
  gender: string;
  cpf: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianCpf: string;
};

type Props = {
  mode: "create" | "edit";
  athleteId?: string;
  initial?: Initial;
  /** Edit mode: false when the athlete was registered by another organization. */
  canEdit?: boolean;
};

const EMPTY: Initial = {
  name: "",
  birthDate: "",
  gender: "",
  cpf: "",
  email: "",
  phone: "",
  guardianName: "",
  guardianCpf: "",
};

function minorFrom(value: string): boolean {
  const date = parseDateInput(value);
  return date ? ageOn(date, new Date()) < 18 : false;
}

export function AthleteForm({
  mode,
  athleteId,
  initial = EMPTY,
  canEdit = true,
}: Props) {
  const id = useId();
  const editing = mode === "edit";
  const [state, formAction, pending] = useActionState(
    async (prev: AthleteFormState, formData: FormData) =>
      editing
        ? updateAthleteAction(athleteId!, prev, formData)
        : createAthleteAction(prev, formData),
    {} as AthleteFormState,
  );
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};

  const [gender, setGender] = useState(values.gender ?? "");
  const [minor, setMinor] = useState(minorFrom(values.birthDate ?? ""));
  const [dismissedMatch, setDismissedMatch] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const readOnly = editing && !canEdit;
  const match =
    state.match && dismissedMatch !== state.match.cpf ? state.match : null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  const useExisting = () => {
    if (!match) return;
    setLinking(true);
    setLinkError(null);
    startTransition(async () => {
      const result = await linkAthleteByCpfAction(match.cpf);
      // A successful link redirects; reaching here means it failed.
      setLinking(false);
      if (result?.error) setLinkError(result.error);
    });
  };

  const field = (key: string) => ({
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
  });
  const err = (key: string) => (
    <FieldError id={`${id}-${key}-error`}>{errors[key]}</FieldError>
  );
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl">
      <fieldset disabled={readOnly} className="min-w-0">
        <FieldGroup>
          {readOnly ? (
            <Alert>
              <InfoIcon />
              <AlertTitle>Somente leitura</AlertTitle>
              <AlertDescription>
                Este atleta foi cadastrado por outra organização. Você pode
                usá-lo nas inscrições, mas só quem o cadastrou altera os dados.
              </AlertDescription>
            </Alert>
          ) : null}

          {state.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {match ? (
            <Alert>
              <UserCheckIcon />
              <AlertTitle>Este CPF já tem cadastro</AlertTitle>
              <AlertDescription>
                <p>
                  Encontramos <strong>{match.displayName}</strong>. Para
                  proteger os dados, só mostramos o nome abreviado. Você pode
                  usar esse cadastro na sua organização, sem copiar nem alterar
                  nada.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={useExisting}
                    disabled={linking}
                  >
                    {linking ? <Spinner data-icon="inline-start" /> : null}
                    Usar este cadastro
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDismissedMatch(match.cpf)}
                  >
                    Corrigir o CPF
                  </Button>
                </div>
                {linkError ? (
                  <p className="mt-2 text-destructive">{linkError}</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor={`${id}-name`}>Nome completo</FieldLabel>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={values.name ?? ""}
              maxLength={120}
              autoComplete="off"
              className="h-10"
              {...field("name")}
            />
            {err("name")}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={invalid("birthDate")}>
              <FieldLabel htmlFor={`${id}-birth`}>
                Data de nascimento
              </FieldLabel>
              <Input
                id={`${id}-birth`}
                name="birthDate"
                type="date"
                defaultValue={values.birthDate ?? ""}
                onChange={(event) => setMinor(minorFrom(event.target.value))}
                className="h-10"
                {...field("birthDate")}
              />
              {err("birthDate")}
            </Field>
            <Field data-invalid={invalid("gender")}>
              <FieldLabel id={`${id}-gender-label`}>Sexo</FieldLabel>
              <RadioGroup
                name="gender"
                value={gender}
                onValueChange={setGender}
                aria-labelledby={`${id}-gender-label`}
                className="flex h-10 flex-wrap items-center gap-x-5"
              >
                {(
                  Object.keys(GENDER_LABELS) as (keyof typeof GENDER_LABELS)[]
                ).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={key} />
                    {GENDER_LABELS[key]}
                  </label>
                ))}
              </RadioGroup>
              {err("gender")}
            </Field>
          </div>

          <Field data-invalid={invalid("cpf")}>
            <FieldLabel htmlFor={`${id}-cpf`}>
              CPF{minor ? " (opcional para menores)" : ""}
            </FieldLabel>
            {/* The CPF is the athlete's identity, so it is fixed after registration. */}
            <Input
              id={`${id}-cpf`}
              name="cpf"
              inputMode="numeric"
              defaultValue={values.cpf ?? ""}
              placeholder="000.000.000-00"
              disabled={editing}
              autoComplete="off"
              className="h-10 tabular-nums"
              {...field("cpf")}
            />
            {editing ? (
              <FieldDescription>
                O CPF identifica o atleta em todas as organizações e não pode
                ser alterado.
              </FieldDescription>
            ) : null}
            {err("cpf")}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={invalid("email")}>
              <FieldLabel htmlFor={`${id}-email`}>E-mail (opcional)</FieldLabel>
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                defaultValue={values.email ?? ""}
                autoComplete="off"
                className="h-10"
                {...field("email")}
              />
              {err("email")}
            </Field>
            <Field data-invalid={invalid("phone")}>
              <FieldLabel htmlFor={`${id}-phone`}>
                Telefone (opcional)
              </FieldLabel>
              <Input
                id={`${id}-phone`}
                name="phone"
                inputMode="tel"
                defaultValue={values.phone ?? ""}
                placeholder="(31) 99999-9999"
                autoComplete="off"
                className="h-10"
                {...field("phone")}
              />
              {err("phone")}
            </Field>
          </div>

          <div
            className={cn(
              "grid gap-5 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2",
              !minor && "hidden",
            )}
          >
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Atleta menor de 18 anos: informe o responsável.
            </p>
            <Field data-invalid={invalid("guardianName")}>
              <FieldLabel htmlFor={`${id}-gname`}>
                Nome do responsável
              </FieldLabel>
              <Input
                id={`${id}-gname`}
                name="guardianName"
                defaultValue={values.guardianName ?? ""}
                autoComplete="off"
                className="h-10"
                {...field("guardianName")}
              />
              {err("guardianName")}
            </Field>
            <Field data-invalid={invalid("guardianCpf")}>
              <FieldLabel htmlFor={`${id}-gcpf`}>CPF do responsável</FieldLabel>
              <Input
                id={`${id}-gcpf`}
                name="guardianCpf"
                inputMode="numeric"
                defaultValue={values.guardianCpf ?? ""}
                placeholder="000.000.000-00"
                autoComplete="off"
                className="h-10 tabular-nums"
                {...field("guardianCpf")}
              />
              {err("guardianCpf")}
            </Field>
          </div>

          {!readOnly ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="h-11 px-5 text-base"
              >
                {pending
                  ? editing
                    ? "Salvando"
                    : "Cadastrando"
                  : editing
                    ? "Salvar alterações"
                    : "Cadastrar atleta"}
                {pending ? (
                  <Spinner data-icon="inline-end" />
                ) : (
                  <ArrowRightIcon data-icon="inline-end" />
                )}
              </Button>
              <Link
                href="/athletes"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-5 text-base",
                )}
              >
                Cancelar
              </Link>
            </div>
          ) : (
            <Link
              href="/athletes"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 w-fit px-5 text-base",
              )}
            >
              Voltar
            </Link>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
