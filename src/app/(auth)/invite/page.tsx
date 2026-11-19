import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { InviteForm } from "@/components/auth/invite-form";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { findUsableInvitation } from "@/lib/team/invitations";

export const metadata: Metadata = {
  title: "Convite | Liggo",
  robots: { index: false, follow: false },
};
// Whether the invitation is still valid depends on the clock: read per request.
export const instant = false;

export default async function InvitePage({
  searchParams,
}: PageProps<"/invite">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const invitation = await findUsableInvitation(value);
  const hasAccount = invitation
    ? !!(await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      }))
    : false;

  const footer = (
    <>
      Já tem conta?{" "}
      <Link
        href="/login"
        className={buttonVariants({ variant: "link", size: "xs" })}
      >
        Entrar
      </Link>
    </>
  );

  if (!invitation) {
    return (
      <AuthShell
        variant="organizer"
        title="Convite expirado"
        description="Este convite não vale mais. Ele pode ter expirado, sido cancelado ou já ter sido usado. Peça um novo a quem convidou você."
        footer={footer}
      >
        <Link
          href="/login"
          className={buttonVariants({ size: "lg" }) + " h-11 w-full text-base"}
        >
          Ir para o login
        </Link>
      </AuthShell>
    );
  }
  if (hasAccount) {
    return (
      <AuthShell
        variant="organizer"
        title="Você já tem conta"
        description={`O e-mail ${invitation.email} já tem uma conta no Liggo. Cada pessoa participa de uma organização; entre com a conta que você já tem.`}
        footer={footer}
      >
        <Link
          href="/login"
          className={buttonVariants({ size: "lg" }) + " h-11 w-full text-base"}
        >
          Entrar
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell
      variant="organizer"
      title="Você foi convidado"
      description={`Crie a sua conta para participar de ${invitation.organization.name} como ${invitation.role === "OWNER" ? "proprietário" : "membro"}. E-mail: ${invitation.email}.`}
      footer={footer}
    >
      <InviteForm token={value} />
    </AuthShell>
  );
}
