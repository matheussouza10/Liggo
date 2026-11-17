import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/signup-form";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Criar conta | Liggo" };

export default function SignUpPage() {
  return (
    <AuthShell
      variant="organizer"
      wide
      title="Criar conta"
      description="Cadastre sua organização para criar e gerenciar competições."
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href="/login"
            className={buttonVariants({ variant: "link", size: "xs" })}
          >
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
