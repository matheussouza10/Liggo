import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Administração | Liggo",
  robots: { index: false, follow: false },
};

export default function AdminEntrarPage() {
  return (
    <AuthShell
      variant="admin"
      title="Acesso administrativo"
      description="Área restrita à administração do sistema."
      footer={
        <>
          Organiza competições?{" "}
          <Link
            href="/login"
            className={buttonVariants({ variant: "link", size: "xs" })}
          >
            Entrar como organizador
          </Link>
        </>
      }
    >
      <LoginForm variant="admin" />
    </AuthShell>
  );
}
