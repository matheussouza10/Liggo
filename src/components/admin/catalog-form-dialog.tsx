"use client";

import {
  startTransition,
  useActionState,
  useId,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
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
import { Textarea } from "@/components/ui/textarea";
import { saveCategoryAction, saveItemAction } from "@/lib/catalog/actions";
import {
  PARTICIPATION_LABELS,
  PARTICIPATION_TYPES,
  type CatalogConfig,
} from "@/lib/catalog/config";
import type {
  CatalogFormState,
  CategoryRow,
  ItemRow,
} from "@/lib/catalog/types";

type Shell = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

function FormShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: Shell) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-dark max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}

/* ------------------------------ item ------------------------------ */

type ItemDialogProps = {
  config: CatalogConfig;
  categories: CategoryRow[];
  item: ItemRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ItemFormDialog({
  config,
  categories,
  item,
  open,
  onOpenChange,
}: ItemDialogProps) {
  const editing = item !== null;
  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Editar ${config.singular}` : config.newLabel}
      description={
        editing
          ? "Altere os dados e salve."
          : `Cadastre ${config.singular === "modalidade" ? "uma nova" : "um novo"} ${config.singular}.`
      }
    >
      {/* keyed so each opening starts from fresh values */}
      <ItemForm
        key={item?.id ?? "new"}
        config={config}
        categories={categories}
        item={item}
        onDone={() => onOpenChange(false)}
      />
    </FormShell>
  );
}

function ItemForm({
  config,
  categories,
  item,
  onDone,
}: {
  config: CatalogConfig;
  categories: CategoryRow[];
  item: ItemRow | null;
  onDone: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: CatalogFormState, formData: FormData) => {
      const result = await saveItemAction(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {} as CatalogFormState,
  );

  // Submitting through onSubmit (instead of the form's `action` prop) keeps
  // React from resetting the form afterwards, which would wipe the selects
  // and checkboxes the user had already filled in.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  // An inactive category stays selectable while it is the item's current one.
  const options = categories.filter(
    (c) => c.active || c.id === item?.categoryId,
  );

  return (
    <form onSubmit={submit} noValidate>
      <input type="hidden" name="catalog" value={config.key} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup>
        {state.error ? <FieldError>{state.error}</FieldError> : null}

        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Nome</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={values?.name ?? item?.name ?? ""}
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            className="h-10"
          />
          <FieldError id={`${id}-name-error`}>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={errors.categoryId ? true : undefined}>
          <FieldLabel htmlFor={`${id}-category`}>Categoria</FieldLabel>
          <NativeSelect
            id={`${id}-category`}
            name="categoryId"
            defaultValue={values?.categoryId ?? item?.categoryId ?? ""}
            aria-invalid={errors.categoryId ? true : undefined}
            aria-describedby={
              errors.categoryId ? `${id}-category-error` : undefined
            }
            className="w-full"
          >
            <NativeSelectOption value="">
              Selecione a categoria
            </NativeSelectOption>
            {options.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError id={`${id}-category-error`}>
            {errors.categoryId}
          </FieldError>
        </Field>

        {config.hasDescription ? (
          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor={`${id}-description`}>
              Descrição (opcional)
            </FieldLabel>
            <Textarea
              id={`${id}-description`}
              name="description"
              rows={3}
              defaultValue={values?.description ?? item?.description ?? ""}
              aria-invalid={errors.description ? true : undefined}
            />
            <FieldError>{errors.description}</FieldError>
          </Field>
        ) : null}

        {config.isFormat ? (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">
                Participação aceita
              </legend>
              <p className="text-xs text-muted-foreground">
                Sem nenhuma marcada, o formato aceita qualquer participação.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {PARTICIPATION_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      name="participationTypes"
                      value={type}
                      defaultChecked={
                        item?.participationTypes.includes(type) ?? false
                      }
                    />
                    {PARTICIPATION_LABELS[type]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="allowsGroups"
                  defaultChecked={item?.allowsGroups ?? false}
                />
                Permite grupos
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  name="allowsRepechage"
                  defaultChecked={item?.allowsRepechage ?? false}
                />
                Permite repescagem
              </label>
            </div>
          </>
        ) : null}
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pending={pending} label="Salvar" />
      </DialogFooter>
    </form>
  );
}

/* ---------------------------- category ---------------------------- */

type CategoryDialogProps = {
  config: CatalogConfig;
  category: CategoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryFormDialog({
  config,
  category,
  open,
  onOpenChange,
}: CategoryDialogProps) {
  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Editar categoria" : "Nova categoria"}
      description={`Categorias organizam ${config.title.toLowerCase()} nas listas.`}
    >
      <CategoryForm
        key={category?.id ?? "new"}
        config={config}
        category={category}
        onDone={() => onOpenChange(false)}
      />
    </FormShell>
  );
}

function CategoryForm({
  config,
  category,
  onDone,
}: {
  config: CatalogConfig;
  category: CategoryRow | null;
  onDone: () => void;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: CatalogFormState, formData: FormData) => {
      const result = await saveCategoryAction(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    {} as CatalogFormState,
  );

  // Submitting through onSubmit (instead of the form's `action` prop) keeps
  // React from resetting the form afterwards, which would wipe the selects
  // and checkboxes the user had already filled in.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  const error = state.fieldErrors?.name;

  return (
    <form onSubmit={submit} noValidate>
      <input type="hidden" name="catalog" value={config.key} />
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <FieldGroup>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>Nome da categoria</FieldLabel>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={state.values?.name ?? category?.name ?? ""}
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-name-error` : undefined}
            className="h-10"
          />
          <FieldError id={`${id}-name-error`}>{error}</FieldError>
        </Field>
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pending={pending} label="Salvar" />
      </DialogFooter>
    </form>
  );
}
