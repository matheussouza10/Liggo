import Image from "next/image";
import type { ReactNode } from "react";
import { BracketArt } from "./bracket-art";

type Props = {
  variant: "organizer" | "admin";
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthShell({
  variant,
  title,
  description,
  footer,
  children,
}: Props) {
  const isAdmin = variant === "admin";

  return (
    <main
      className={`${isAdmin ? "theme-admin" : "theme-light"} grid flex-1 bg-surface text-foreground ${isAdmin ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-[1.2fr_1fr]"}`}
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

      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
        <Image
          className="block h-14 w-auto self-start"
          src={
            isAdmin
              ? "/branding/liggo-logo-branca.svg"
              : "/branding/liggo-logo-horizontal.svg"
          }
          alt="Liggo"
          width={1260}
          height={440}
          priority
        />

        <div className="my-auto w-full max-w-sm py-10">
          <h1 className="font-display text-[clamp(2.5rem,4vw,3.5rem)] leading-[0.9] font-extrabold tracking-tight text-balance uppercase">
            {title}
          </h1>
          <p className="mt-3 mb-7 text-base leading-6 text-muted-foreground">
            {description}
          </p>
          {children}
          {footer ? (
            <p className="mt-7 text-sm text-muted-foreground">{footer}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
