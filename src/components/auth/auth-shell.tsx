import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { BracketArt } from "./bracket-art";

type Props = {
  variant: "organizer" | "admin";
  title: string;
  description: string;
  footer?: ReactNode;
  /** Wider form column, for screens with two-column field rows. */
  wide?: boolean;
  children: ReactNode;
};

export function AuthShell({
  variant,
  title,
  description,
  footer,
  wide = false,
  children,
}: Props) {
  const isAdmin = variant === "admin";

  return (
    <main
      className={`theme-light grid flex-1 bg-background text-foreground ${
        isAdmin ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-[1.2fr_1fr]"
      }`}
    >
      <section
        className={`relative h-40 overflow-hidden sm:h-56 lg:h-auto ${
          isAdmin ? "bg-liggo-navy lg:order-last" : "bg-liggo-primary"
        }`}
      >
        <div className="absolute inset-0 lg:bottom-52">
          <BracketArt tone={isAdmin ? "mono" : "brand"} />
        </div>
        {!isAdmin ? (
          <p className="absolute right-10 bottom-10 left-10 hidden font-display text-[clamp(3.5rem,6vw,6rem)] leading-[0.88] font-extrabold tracking-tight text-liggo-ink uppercase lg:block">
            Toda competição
            <br />
            começa aqui.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16 lg:py-8">
        <Image
          className="block h-14 w-auto self-start"
          src="/branding/liggo-logo-horizontal.svg"
          alt="Liggo"
          width={1260}
          height={440}
          priority
        />

        <div
          className={`my-auto w-full py-6 ${wide ? "max-w-xl" : "max-w-sm"}`}
        >
          <h1 className="font-display text-[clamp(2.5rem,4vw,3.5rem)] leading-[0.9] font-extrabold tracking-tight text-balance uppercase">
            {title}
          </h1>
          <p className="mt-3 mb-6 text-base text-muted-foreground">
            {description}
          </p>
          {children}
          {footer ? (
            <>
              <Separator className="my-5" />
              <p className="text-center text-sm text-muted-foreground">
                {footer}
              </p>
            </>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          © Liggo. Todos os direitos reservados.{" "}
          <Link href="/terms" className="underline">
            Termos
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline">
            Privacidade
          </Link>
        </p>
      </section>
    </main>
  );
}
