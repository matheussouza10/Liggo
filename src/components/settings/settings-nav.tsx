"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings", label: "Perfil" },
  { href: "/settings/security", label: "Segurança" },
  { href: "/settings/organization", label: "Organização" },
  { href: "/settings/team", label: "Equipe" },
  { href: "/settings/plan", label: "Plano" },
  { href: "/settings/payments", label: "Pagamentos" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções das configurações" className="flex flex-wrap gap-2">
      {ITEMS.map((i) => {
        const active =
          i.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: active ? "default" : "outline",
                size: "sm",
              }),
              "h-9",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
