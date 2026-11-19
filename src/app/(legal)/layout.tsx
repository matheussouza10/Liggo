import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_IS_DRAFT } from "@/lib/legal/version";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-light min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" aria-label="Liggo, página inicial">
            <Image
              src="/branding/liggo-logo-horizontal.svg"
              alt="Liggo"
              width={1260}
              height={440}
              className="h-9 w-auto"
              priority
            />
          </Link>
          <nav aria-label="Documentos" className="flex gap-4 text-sm">
            <Link href="/terms">Termos de uso</Link>
            <Link href="/privacy">Privacidade</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        {LEGAL_IS_DRAFT ? (
          <p
            role="note"
            className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm"
          >
            <strong>Versão preliminar.</strong> Este texto ainda será revisado
            por assessoria jurídica antes da publicação oficial do serviço.
          </p>
        ) : null}
        <article className="flex flex-col gap-4 text-[15px] leading-relaxed [&_h1]:font-display [&_h1]:text-4xl [&_h1]:leading-none [&_h1]:font-extrabold [&_h1]:uppercase [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:leading-none [&_h2]:font-bold [&_h2]:uppercase [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </article>
      </main>
    </div>
  );
}
