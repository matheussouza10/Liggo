import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Recuperar senha | Liggo" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      variant="organizer"
      title="Esqueceu a senha?"
      description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <>
          Lembrou a senha?{" "}
          <Link
            href="/login"
            className={buttonVariants({ variant: "link", size: "xs" })}
          >
            Entrar
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
