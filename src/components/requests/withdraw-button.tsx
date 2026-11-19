"use client";

import { Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";
import { withdrawRequestAction } from "@/lib/requests/public-actions";

/** Lets the requester cancel while the request is still waiting. */
export function WithdrawButton({ token }: { token: string }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Undo2Icon data-icon="inline-start" />
        )}
        Cancelar pedido
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="theme-dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Os documentos e contatos informados são apagados. Para participar
              depois, será preciso enviar um novo pedido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter pedido</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run(
                  () =>
                    withdrawRequestAction(token).then((r) =>
                      r.ok
                        ? { ok: true as const }
                        : {
                            ok: false as const,
                            error: r.error ?? "Não foi possível cancelar.",
                          },
                    ),
                  () => {
                    setOpen(false);
                    router.refresh();
                  },
                )
              }
            >
              Cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
