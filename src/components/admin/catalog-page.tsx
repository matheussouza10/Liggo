import Link from "next/link";
import { CATALOGS } from "@/lib/catalog/config";
import { getCatalogAdminData } from "@/lib/catalog/queries";
import type { CatalogKey } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { CategoryManager, ItemManager } from "./catalog-manager";

export async function CatalogPage({
  catalog,
  view,
}: {
  catalog: CatalogKey;
  view: "items" | "categories";
}) {
  const config = CATALOGS[catalog];
  const { categories, items } = await getCatalogAdminData(catalog);

  const tabs = [
    { label: config.title, href: config.path, active: view === "items" },
    {
      label: "Categorias",
      href: `${config.path}/categories`,
      active: view === "categories",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
          {config.title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {config.description}
        </p>
      </div>

      <nav aria-label="Seções do cadastro" className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium no-underline transition-colors",
              tab.active
                ? "border-liggo-accent text-white"
                : "border-transparent text-muted-foreground hover:text-white",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === "items" ? (
        <ItemManager config={config} categories={categories} items={items} />
      ) : (
        <CategoryManager config={config} categories={categories} />
      )}
    </div>
  );
}
