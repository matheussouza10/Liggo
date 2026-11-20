"use client";

import { SparklesIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/competition/use-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  cancelSubscriptionAction,
  subscribeToPlanAction,
} from "@/lib/payments/actions";
import { useRouter } from "next/navigation";

/** Starts a paid subscription: asks who pays (CPF or CNPJ) and creates it in Asaas. */
export function SubscribeButton({
  planId,
  planName,
  price,
  disabled,
}: {
  planId: string;
  planName: string;
  price: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState("");
  const { pending, error, run } = useAction();
  return (
    <>
      <Button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`Assinar o plano ${planName}`}
      >
        <SparklesIcon data-icon="inline-start" />
        Assinar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="theme-dark sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinar o plano {planName}</DialogTitle>
            <DialogDescription>
              {price} por mês, cobrado pelo Asaas (Pix, boleto ou cartão). O
              plano vale depois do primeiro pagamento.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor="sub-doc">CPF ou CNPJ de quem paga</FieldLabel>
            <Input
              id="sub-doc"
              inputMode="numeric"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              className="h-10"
              autoComplete="off"
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => subscribeToPlanAction(planId, document),
                  () => {
                    setOpen(false);
                    router.refresh();
                  },
                )
              }
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Criar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        <XCircleIcon data-icon="inline-start" />
        Cancelar assinatura
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A organização volta ao plano padrão agora. Eventos acima do limite
              do plano padrão continuam existindo, mas não dá para criar novos
              até caber.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run(
                  () => cancelSubscriptionAction(),
                  () => {
                    setOpen(false);
                    router.refresh();
                  },
                );
              }}
              disabled={pending}
            >
              Cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
