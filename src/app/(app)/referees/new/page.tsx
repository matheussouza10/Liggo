import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RefereeForm } from "@/components/people/referee-form";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { getSportOptions } from "@/lib/people/queries";

export const metadata: Metadata = {
  title: "Novo árbitro | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function NewRefereePage() {
  await requireOrganizationUser();
  const sports = await getSportOptions();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/referees"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Árbitros
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Novo árbitro
        </h1>
      </div>
      <RefereeForm sports={sports} />
    </div>
  );
}
