import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <Image
        className="block h-16 w-auto dark:hidden"
        src="/branding/liggo-logo-horizontal.svg"
        alt="Liggo"
        width={1260}
        height={440}
        priority
      />
      <Image
        className="hidden h-16 w-auto dark:block"
        src="/branding/liggo-logo-branca.svg"
        alt="Liggo"
        width={1260}
        height={440}
        priority
      />
      <p className="text-xl font-medium text-balance">
        Toda competição começa aqui.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/watch" className={buttonVariants({ size: "lg" })}>
          Acompanhar jogos ao vivo
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Sou organizador
        </Link>
      </div>
    </main>
  );
}
