"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/competition/use-action";
import {
  changeRoleAction,
  resendInviteAction,
  revokeInviteAction,
  setMemberDisabledAction,
} from "@/lib/team/actions";

export function MemberActions({
  id,
  name,
  role,
  disabled,
  isSelf,
}: {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  disabled: boolean;
  isSelf: boolean;
}) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              changeRoleAction(id, role === "OWNER" ? "MEMBER" : "OWNER"),
            )
          }
        >
          {role === "OWNER" ? "Tornar membro" : "Tornar proprietário"}
        </Button>
        {isSelf ? null : (
          <Button
            type="button"
            variant={disabled ? "default" : "ghost"}
            size="sm"
            disabled={pending}
            aria-label={`${disabled ? "Reativar" : "Desativar"} ${name}`}
            onClick={() => run(() => setMemberDisabledAction(id, !disabled))}
          >
            {disabled ? "Reativar" : "Desativar"}
          </Button>
        )}
      </div>
      {error ? (
        <Alert variant="destructive" className="max-w-xs py-1">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function InvitationActions({
  id,
  email,
}: {
  id: string;
  email: string;
}) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={`Reenviar convite para ${email}`}
          onClick={() => run(() => resendInviteAction(id))}
        >
          Reenviar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={`Cancelar convite de ${email}`}
          onClick={() => run(() => revokeInviteAction(id))}
        >
          Cancelar
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive" className="max-w-xs py-1">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
