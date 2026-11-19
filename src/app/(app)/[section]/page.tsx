import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/app/section-placeholder";
import { requireOrganizationUser } from "@/lib/auth/guards";

const SECTIONS: Record<string, string> = {
  reports: "Relatórios",
  settings: "Configurações",
  help: "Central de ajuda",
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Reads the session on every request, so it cannot be part of the static shell
// (see the note in the parent layout). Streaming still applies.
export const instant = false;

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const title = SECTIONS[section];
  if (!title) notFound();

  await requireOrganizationUser();
  return <SectionPlaceholder title={title} />;
}
