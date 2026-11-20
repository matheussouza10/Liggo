import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireOrganizationUser } from "@/lib/auth/guards";

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireOrganizationUser();
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Configurações
        </h1>
        <p className="mt-3 text-muted-foreground">
          Seu perfil, sua senha, sua organização e a equipe.
        </p>
        <div className="mt-4">
          <SettingsNav />
        </div>
      </div>
      {children}
    </div>
  );
}
