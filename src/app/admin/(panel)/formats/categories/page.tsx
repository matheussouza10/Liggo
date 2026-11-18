import type { Metadata } from "next";
import { CatalogPage } from "@/components/admin/catalog-page";
import { CATALOGS } from "@/lib/catalog/config";
import { requireSystemAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: `${CATALOGS["formats"].title} | Administração | Liggo`,
  robots: { index: false, follow: false },
};

// Reads the session on every request (see the note in the parent layout).
export const instant = false;

export default async function Page() {
  await requireSystemAdmin();
  return <CatalogPage catalog="formats" view="categories" />;
}
