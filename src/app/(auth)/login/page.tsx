import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar | Liggo" };

// The notice comes from the address (?reset=1), so this page is read per request.
export const instant = false;

export default async function EntrarPage({
  searchParams,
}: PageProps<"/login">) {
  const { reset } = await searchParams;
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
      <LoginForm
        variant="organizer"
        notice={
          reset === "1" ? "Senha alterada. Entre com a nova senha." : undefined
        }
      />
    </AuthShell>
  );
}
