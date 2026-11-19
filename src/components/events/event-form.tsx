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
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  PARTICIPATION_LABELS,
  PARTICIPATION_TYPES,
} from "@/lib/catalog/config";
import type {
  FormatOption,
  OptionGroup,
  SimpleOption,
} from "@/lib/catalog/queries";
import {
  createEventAction,
  updateEventAction,
  type EventFormState,
} from "@/lib/events/actions";
import { BR_STATES, EVENT_LIMITS } from "@/lib/events/constants";

type Props = {
  /** "edit" saves changes to an existing event instead of creating one. */
  mode?: "create" | "edit";
  eventId?: string;
  /** Values the form starts with (edit). */
  initial?: Record<string, string>;
  /** The modality and the way people take part cannot change anymore (registrations or phases exist). */
  locked?: boolean;
  options: {
    types: OptionGroup<SimpleOption>[];
    formats: OptionGroup<FormatOption>[];
    sports: OptionGroup<SimpleOption>[];
  };
};

function GroupedOptions<T extends SimpleOption>({
  groups,
}: {
  groups: OptionGroup<T>[];
}) {
  return (
    <>
      {groups.map((group) => (
        <NativeSelectOptGroup key={group.category} label={group.category}>
          {group.options.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.name}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
      ))}
    </>
  );
}

export function EventForm({
  options,
  mode = "create",
  eventId,
  initial,
  locked = false,
}: Props) {
  const id = useId();
  const editing = mode === "edit" && !!eventId;
  const [state, formAction, pending] = useActionState(
    editing ? updateEventAction.bind(null, eventId) : createEventAction,
    {} as EventFormState,
  );

  // Submitting through onSubmit (instead of the form's `action` prop) keeps
  // React from resetting the form afterwards, which would wipe the selects
  // and checkboxes the user had already filled in.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  const values = state.values ?? initial ?? {};
  const errors = state.fieldErrors ?? {};

  // Controlled so the format hint follows the selection and survives the
  // form reset React runs after each submission.
  const [formatId, setFormatId] = useState(values.formatId ?? "");
  const [participation, setParticipation] = useState(
    values.participationType ?? "",
  );
  const selectedFormat = options.formats
    .flatMap((g) => g.options)
    .find((f) => f.id === formatId);
  const restricted =
    selectedFormat && selectedFormat.participationTypes.length > 0
      ? selectedFormat.participationTypes
          .map((t) => PARTICIPATION_LABELS[t])
          .join(" ou ")
      : null;

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
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              {editing
                ? "Não foi possível salvar"
                : "Não foi possível criar o evento"}
            </AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor={`${id}-name`}>Nome do evento</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={values.name ?? ""}
            maxLength={EVENT_LIMITS.nameMax}
            placeholder="Copa Arena 2026"
            className="h-10"
            {...field("name")}
          />
          {err("name")}
        </Field>

        <Field data-invalid={invalid("description")}>
          <FieldLabel htmlFor={`${id}-description`}>
            Descrição (opcional)
          </FieldLabel>
          <Textarea
            id={`${id}-description`}
            name="description"
            rows={4}
            defaultValue={values.description ?? ""}
            {...field("description")}
          />
          {err("description")}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("startDate")}>
            <FieldLabel htmlFor={`${id}-start`}>Início</FieldLabel>
            <Input
              id={`${id}-start`}
              name="startDate"
              type="date"
              defaultValue={values.startDate ?? ""}
              className="h-10"
              {...field("startDate")}
            />
            {err("startDate")}
          </Field>
          <Field data-invalid={invalid("endDate")}>
            <FieldLabel htmlFor={`${id}-end`}>Fim</FieldLabel>
            <Input
              id={`${id}-end`}
              name="endDate"
              type="date"
              defaultValue={values.endDate ?? ""}
              className="h-10"
              {...field("endDate")}
            />
            {err("endDate")}
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("eventTypeId")}>
            <FieldLabel htmlFor={`${id}-type`}>Tipo</FieldLabel>
            <NativeSelect
              id={`${id}-type`}
              name="eventTypeId"
              defaultValue={values.eventTypeId ?? ""}
              className="w-full"
              {...field("eventTypeId")}
            >
              <NativeSelectOption value="">Selecione o tipo</NativeSelectOption>
              <GroupedOptions groups={options.types} />
            </NativeSelect>
            {err("eventTypeId")}
          </Field>
          <Field data-invalid={invalid("sportId")}>
            <FieldLabel htmlFor={`${id}-sport`}>Modalidade</FieldLabel>
            <NativeSelect
              id={`${id}-sport`}
              name="sportId"
              defaultValue={values.sportId ?? ""}
              disabled={locked}
              className="w-full"
              {...field("sportId")}
            >
              <NativeSelectOption value="">
                Selecione a modalidade
              </NativeSelectOption>
              <GroupedOptions groups={options.sports} />
            </NativeSelect>
            {locked ? (
              <FieldDescription>
                Não dá para mudar a modalidade depois das inscrições ou do
                sorteio.
              </FieldDescription>
            ) : null}
            {err("sportId")}
          </Field>
        </div>

        <Field data-invalid={invalid("formatId")}>
          <FieldLabel htmlFor={`${id}-format`}>Formato</FieldLabel>
          <NativeSelect
            id={`${id}-format`}
            name="formatId"
            value={formatId}
            onChange={(event) => setFormatId(event.target.value)}
            className="w-full"
            {...field("formatId")}
          >
            <NativeSelectOption value="">
              Selecione o formato
            </NativeSelectOption>
            <GroupedOptions groups={options.formats} />
          </NativeSelect>
          {restricted ? (
            <FieldDescription>
              Este formato aceita apenas: {restricted}.
            </FieldDescription>
          ) : null}
          {err("formatId")}
        </Field>

        <Field data-invalid={invalid("participationType")}>
          <FieldLabel id={`${id}-participation-label`}>
            Formato de participação
          </FieldLabel>
          <RadioGroup
            name="participationType"
            value={participation}
            onValueChange={setParticipation}
            disabled={locked}
            aria-labelledby={`${id}-participation-label`}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {PARTICIPATION_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={type} />
                {PARTICIPATION_LABELS[type]}
              </label>
            ))}
          </RadioGroup>
          {locked ? (
            <FieldDescription>
              Não dá para mudar o formato de participação depois das inscrições
              ou do sorteio.
            </FieldDescription>
          ) : null}
          {err("participationType")}
        </Field>

        <Field data-invalid={invalid("locationName")}>
          <FieldLabel htmlFor={`${id}-location`}>Local</FieldLabel>
          <Input
            id={`${id}-location`}
            name="locationName"
            defaultValue={values.locationName ?? ""}
            maxLength={EVENT_LIMITS.locationMax}
            placeholder="Ginásio Municipal"
            className="h-10"
            {...field("locationName")}
          />
          {err("locationName")}
        </Field>

        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <Field data-invalid={invalid("city")}>
            <FieldLabel htmlFor={`${id}-city`}>Cidade (opcional)</FieldLabel>
            <Input
              id={`${id}-city`}
              name="city"
              defaultValue={values.city ?? ""}
              maxLength={EVENT_LIMITS.cityMax}
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
                : "Criando evento"
              : editing
                ? "Salvar alterações"
                : "Criar evento"}
            {pending ? (
              <Spinner data-icon="inline-end" />
            ) : (
              <ArrowRightIcon data-icon="inline-end" />
            )}
          </Button>
          <Link
            href={editing ? `/events/${eventId}` : "/events"}
            className={
              buttonVariants({ variant: "outline", size: "lg" }) +
              " h-11 px-5 text-base"
            }
          >
            Cancelar
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
