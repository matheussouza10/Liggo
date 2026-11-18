import type { Metadata } from "next";
import { requireOrganizationUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Painel | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request, so it cannot be part of the static shell
// (see the note in the parent layout). Streaming still applies.
export const instant = false;

export default async function DashboardPage() {
  const user = await requireOrganizationUser();
  const organization = user.organization?.name ?? "Sem organização";

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
        Olá, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Você está conectado em {organization}. Os campeonatos da sua organização
        vão aparecer aqui.
      </p>
    </div>
  );
}
