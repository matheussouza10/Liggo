import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/app/section-placeholder";
import { requireSystemAdmin } from "@/lib/auth/guards";

const SECTIONS: Record<string, string> = {
  organizations: "Organizações",
  users: "Usuários",
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

export default async function AdminSectionPage({
  params,
}: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const title = SECTIONS[section];
  if (!title) notFound();

  await requireSystemAdmin();
  return <SectionPlaceholder title={title} />;
}
