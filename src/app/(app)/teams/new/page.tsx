import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TeamForm } from "@/components/people/team-form";
import { requireOrganizationUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Novo time | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function NewTeamPage() {
  await requireOrganizationUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          Times
        </Link>
        <h1 className="mt-3 font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          Novo time
        </h1>
      </div>
      <TeamForm />
    </div>
  );
}
