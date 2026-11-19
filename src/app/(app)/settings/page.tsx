import type { Metadata } from "next";
import { SimpleForm } from "@/components/settings/simple-form";
import { Badge } from "@/components/ui/badge";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { updateProfileAction } from "@/lib/settings/actions";

export const metadata: Metadata = {
  title: "Perfil | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

const day = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function ProfilePage() {
  const user = await requireOrganizationUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { createdAt: true, termsAcceptedAt: true, termsVersion: true },
  });

  return (
    <section
      aria-label="Perfil"
      className="liquid-card flex flex-col gap-6 rounded-xl p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
          Perfil
        </h2>
        <Badge variant="secondary">
          {user.role === "OWNER" ? "Proprietário" : "Membro"}
        </Badge>
      </div>
      <SimpleForm
        action={updateProfileAction}
        submit="Salvar perfil"
        fields={[
          {
            name: "name",
            label: "Nome",
            defaultValue: user.name,
            autoComplete: "name",
            maxLength: 120,
          },
          {
            name: "email",
            label: "E-mail",
            defaultValue: user.email,
            disabled: true,
            hint: "Para trocar o e-mail da conta, fale com o suporte.",
          },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Organização:{" "}
        <strong className="text-foreground">{user.organization?.name}</strong>
        {row ? ` · Conta criada em ${day.format(row.createdAt)}` : ""}
        {row?.termsAcceptedAt
          ? ` · Termos aceitos em ${day.format(row.termsAcceptedAt)} (versão ${row.termsVersion})`
          : ""}
      </p>
    </section>
  );
}
