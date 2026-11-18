import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AthleteForm } from "@/components/people/athlete-form";
import { requireOrganizationUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Novo atleta | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function NewAthletePage() {
  await requireOrganizationUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/athletes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Atletas
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Novo atleta
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          O elenco de cada evento é escolhido na inscrição, não aqui.
        </p>
      </div>
      <AthleteForm mode="create" />
    </div>
  );
}
