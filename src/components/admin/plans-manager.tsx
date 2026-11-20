"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deletePlanAction,
  savePlanAction,
  type PlanInput,
} from "@/lib/payments/admin-actions";
import { centsToInput, formatMoney } from "@/lib/payments/money";

export type PlanRow = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  maxEvents: number | null;
  maxAthletes: number | null;
  maxRegistrationsPerEvent: number | null;
  active: boolean;
  isDefault: boolean;
  organizations: number;
};

const limit = (n: number | null) => (n === null ? "Sem limite" : String(n));
const blank: PlanInput = {
  name: "",
  description: "",
  price: "",
  maxEvents: "",
  maxAthletes: "",
  maxRegistrationsPerEvent: "",
  active: true,
  isDefault: false,
};
const toInput = (p: PlanRow): PlanInput => ({
  name: p.name,
  description: p.description,
  price: centsToInput(p.priceCents),
  maxEvents: p.maxEvents?.toString() ?? "",
  maxAthletes: p.maxAthletes?.toString() ?? "",
  maxRegistrationsPerEvent: p.maxRegistrationsPerEvent?.toString() ?? "",
  active: p.active,
  isDefault: p.isDefault,
});

export function PlansManager({ plans }: { plans: PlanRow[] }) {
  const [editing, setEditing] = useState<{
    id: string | null;
    input: PlanInput;
  } | null>(null);
  const del = useAction();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setEditing({ id: null, input: blank })}
        >
          <PlusIcon data-icon="inline-start" />
          Novo plano
        </Button>
      </div>
      {del.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{del.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="liquid-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead className="text-right">Valor mensal</TableHead>
              <TableHead className="text-right">Eventos</TableHead>
              <TableHead className="text-right">Atletas</TableHead>
              <TableHead className="text-right">
                Inscrições por evento
              </TableHead>
              <TableHead className="text-right">Organizações</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {p.name}
                    {p.isDefault ? <Badge>Padrão</Badge> : null}
                    {!p.active ? (
                      <Badge variant="outline">Inativo</Badge>
                    ) : null}
                  </span>
                  {p.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {p.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {p.priceCents === 0 ? "Grátis" : formatMoney(p.priceCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {limit(p.maxEvents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {limit(p.maxAthletes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {limit(p.maxRegistrationsPerEvent)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.organizations}
                </TableCell>
                <TableCell className="text-right">
                  <span className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Editar ${p.name}`}
                      onClick={() =>
                        setEditing({ id: p.id, input: toInput(p) })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir ${p.name}`}
                      disabled={del.pending}
                      onClick={() => del.run(() => deletePlanAction(p.id))}
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing ? (
        <PlanDialog
          key={editing.id ?? "new"}
          editing={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function PlanDialog({
  editing,
  onClose,
}: {
  editing: { id: string | null; input: PlanInput };
  onClose: () => void;
}) {
  const [v, setV] = useState<PlanInput>(editing.input);
  const { pending, error, run } = useAction();
  const set = <K extends keyof PlanInput>(k: K, value: PlanInput[K]) =>
    setV((x) => ({ ...x, [k]: value }));
  const num = (
    k: "maxEvents" | "maxAthletes" | "maxRegistrationsPerEvent",
    label: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`plan-${k}`}>{label}</FieldLabel>
      <Input
        id={`plan-${k}`}
        inputMode="numeric"
        value={v[k]}
        onChange={(e) => set(k, e.target.value)}
        placeholder="Sem limite"
        className="h-10"
      />
    </Field>
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="theme-dark sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing.id ? "Editar plano" : "Novo plano"}
          </DialogTitle>
          <DialogDescription>
            Valor mensal e o que a organização pode usar. Deixe um limite em
            branco para ilimitado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field>
              <FieldLabel htmlFor="plan-name">Nome</FieldLabel>
              <Input
                id="plan-name"
                value={v.name}
                maxLength={40}
                onChange={(e) => set("name", e.target.value)}
                className="h-10"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="plan-price">Valor mensal (R$)</FieldLabel>
              <Input
                id="plan-price"
                inputMode="decimal"
                value={v.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0,00"
                className="h-10"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="plan-description">
              Descrição (opcional)
            </FieldLabel>
            <Input
              id="plan-description"
              value={v.description}
              maxLength={200}
              onChange={(e) => set("description", e.target.value)}
              className="h-10"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            {num("maxEvents", "Eventos")}
            {num("maxAthletes", "Atletas")}
            {num("maxRegistrationsPerEvent", "Inscrições por evento")}
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              checked={v.active}
              onCheckedChange={(c) => set("active", c)}
              aria-label="Plano ativo"
            />
            Ativo (aparece para as organizações assinarem)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              checked={v.isDefault}
              onCheckedChange={(c) => set("isDefault", c)}
              aria-label="Plano padrão"
            />
            Plano padrão (organizações sem assinatura)
          </label>
          <FieldDescription>
            O plano padrão precisa ser gratuito.
          </FieldDescription>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => savePlanAction(editing.id, v), onClose)}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Salvar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
