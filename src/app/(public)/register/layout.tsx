import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Public area: no login, same look as the app.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-dark relative min-h-dvh overflow-hidden bg-[#091225] text-white">
      <div className="app-ambient" aria-hidden="true">
        <div className="ambient-orb ambient-orb-blue" />
        <div className="ambient-orb ambient-orb-cyan" />
        <div className="ambient-grid" />
      </div>
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/watch" aria-label="Liggo, página inicial dos jogos">
            <Image
              src="/branding/liggo-logo-branca.svg"
              alt="Liggo"
              width={1260}
              height={440}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-2">
            <Link
              href="/watch"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-9",
              )}
            >
              Jogos e eventos
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9",
              )}
            >
              Sou organizador
            </Link>
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-sm text-muted-foreground">
        Liggo · Toda competição começa aqui.{" "}
        <Link href="/terms" className="underline">
          Termos
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
