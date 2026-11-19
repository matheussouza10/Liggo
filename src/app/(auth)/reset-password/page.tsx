import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { isResetTokenUsable } from "@/lib/auth/reset";

export const metadata: Metadata = {
  title: "Nova senha | Liggo",
  robots: { index: false, follow: false },
};
// Whether the link is still valid depends on the clock: read per request.
export const instant = false;

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const usable = await isResetTokenUsable(value);

  return (
    <AuthShell
      variant="organizer"
      title={usable ? "Crie uma nova senha" : "Link expirado"}
      description={
        usable
          ? "Escolha uma senha nova para a sua conta. Você sairá dos outros aparelhos."
          : "Este link de recuperação não vale mais. Ele pode ter expirado ou já ter sido usado."
      }
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
      {usable ? (
        <ResetPasswordForm token={value} />
      ) : (
        <Link
          href="/forgot-password"
          className={buttonVariants({ size: "lg" }) + " h-11 w-full text-base"}
        >
          Pedir um novo link
        </Link>
      )}
    </AuthShell>
  );
}
