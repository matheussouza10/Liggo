import type { Metadata } from "next";
import { SimpleForm } from "@/components/settings/simple-form";
import { Button } from "@/components/ui/button";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { prisma } from "@/lib/prisma";
import {
  changePasswordAction,
  signOutEverywhereAction,
} from "@/lib/settings/actions";

export const metadata: Metadata = {
  title: "Segurança | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SecurityPage() {
  const user = await requireOrganizationUser();
  const sessions = await prisma.session.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Trocar senha"
        className="liquid-card flex flex-col gap-5 rounded-xl p-6"
      >
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Trocar senha
        </h2>
        <SimpleForm
          action={changePasswordAction}
          submit="Trocar senha"
          fields={[
            {
              name: "current",
              label: "Senha atual",
              type: "password",
              autoComplete: "current-password",
            },
            {
              name: "next",
              label: "Nova senha",
              type: "password",
              autoComplete: "new-password",
              hint: `Pelo menos ${MIN_PASSWORD_LENGTH} caracteres. Os outros aparelhos serão desconectados.`,
            },
            {
              name: "confirm",
              label: "Repita a nova senha",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      </section>

      <section
        aria-label="Sessões"
        className="liquid-card flex flex-col gap-4 rounded-xl p-6"
      >
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Sessões
        </h2>
        <p
          className="text-sm text-muted-foreground"
          data-testid="session-count"
        >
          Sua conta está conectada em {sessions}{" "}
          {sessions === 1 ? "aparelho" : "aparelhos"}. Use o botão para sair de
          todos, inclusive deste.
        </p>
        <form action={signOutEverywhereAction}>
          <Button type="submit" variant="outline">
            Sair de todos os aparelhos
          </Button>
        </form>
      </section>
    </div>
  );
}
