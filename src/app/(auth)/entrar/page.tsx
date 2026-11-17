import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar | Liggo" };

export default function EntrarPage() {
  return (
    <AuthShell
      variant="organizer"
      title="Entrar"
      description="Gerencie suas competições."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm variant="organizer" />
    </AuthShell>
  );
}
