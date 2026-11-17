import Image from "next/image";

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
    </main>
  );
}
