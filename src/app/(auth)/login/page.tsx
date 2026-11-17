import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
          <Link
            href="/signup"
            className={buttonVariants({ variant: "link", size: "xs" })}
          >
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm variant="organizer" />
    </AuthShell>
  );
}
