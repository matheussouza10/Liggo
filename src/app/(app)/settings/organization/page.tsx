import type { Metadata } from "next";
import { SimpleForm } from "@/components/settings/simple-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { updateOrganizationAction } from "@/lib/settings/actions";

export const metadata: Metadata = {
  title: "Organização | Liggo",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function OrganizationPage() {
  const user = await requireOrganizationUser();
  const owner = user.role === "OWNER";
  return (
    <section
      aria-label="Organização"
      className="liquid-card flex flex-col gap-5 rounded-xl p-6"
    >
      <h2 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
        Organização
      </h2>
      <SimpleForm
        action={updateOrganizationAction}
        submit="Salvar organização"
        disabled={!owner}
        fields={[
          {
            name: "name",
            label: "Nome da organização",
            defaultValue: user.organization?.name ?? "",
            maxLength: 120,
          },
        ]}
      />
      {!owner ? (
        <p className="text-sm text-muted-foreground">
          Só o proprietário pode alterar os dados da organização.
        </p>
      ) : null}
    </section>
  );
}
