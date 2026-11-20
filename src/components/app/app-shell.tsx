"use client";

import {
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { adminNav, organizerNav, type NavItem } from "./nav-config";

type Props = {
  area: "organizer" | "admin";
  user: { name: string; detail: string };
  /** Real number of events of the organization, shown next to "Eventos". */
  eventCount?: number;
  /** Plan card of the sidebar: real plan and usage of the organization. */
  plan?: { name: string; events: number; maxEvents: number | null };
  children: ReactNode;
};

const subscribeNoop = () => () => {};

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = [
    parts[0]?.[0],
    parts.length > 1 ? parts.at(-1)?.[0] : undefined,
  ];
  return letters.filter(Boolean).join("").toUpperCase() || "?";
}

// Avatar gradient from the Figma design.
function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-linear-to-br from-[#ffbc7d] to-[#b9553e] font-bold text-white",
        className,
      )}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export function AppShell({ area, user, eventCount, plan, children }: Props) {
  const nav = area === "admin" ? adminNav : organizerNav;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, startTransition] = useTransition();
  // The date comes from the visitor's clock: empty on the server, filled on the client.
  const today = useSyncExternalStore(subscribeNoop, formatToday, () => "");

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isActive = (item: NavItem) =>
    item.href === nav.home
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const allItems = nav.sections.flatMap((section) => section.items);
  const active = allItems.find(isActive);
  const pageTitle =
    !active || active.href === nav.home ? "Painel de controle" : active.label;

  const signOut = () =>
    startTransition(async () => void (await signOutAction()));

  const renderLink = (item: NavItem, muted = false) => {
    const current = isActive(item);
    const badge =
      item.href === "/events" && eventCount ? String(eventCount) : null;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={current ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium no-underline transition-all",
          collapsed && "lg:justify-center lg:px-2",
          current
            ? "nav-active text-white"
            : muted
              ? "text-[#959bb3] hover:bg-white/[.055] hover:text-white"
              : "text-[#b5b8be] hover:bg-white/[.07] hover:text-white",
        )}
      >
        <item.icon className="size-[19px] shrink-0" />
        <span className={cn("flex-1", collapsed && "lg:hidden")}>
          {item.label}
        </span>
        {badge ? (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums",
              collapsed && "lg:hidden",
              current ? "bg-white/15" : "bg-[#292d48] text-[#b5bad0]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const sectionLabel = (text: string) => (
    <p
      className={cn(
        "mb-2 px-3 text-[10px] font-semibold tracking-[.17em] text-[#676e89] uppercase",
        collapsed && "lg:invisible",
      )}
    >
      {text}
    </p>
  );

  return (
    <div className="theme-dark relative min-h-dvh overflow-hidden bg-[#091225] text-white print:overflow-visible print:bg-white print:text-black">
      <div className="app-ambient print:hidden" aria-hidden="true">
        <div className="ambient-orb ambient-orb-blue" />
        <div className="ambient-orb ambient-orb-cyan" />
        <div className="ambient-grid" />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-[#11172d]/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "liquid-sidebar fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col px-4 py-5 text-white transition-[width,transform,padding] duration-300 lg:translate-x-0 print:hidden",
          collapsed ? "lg:w-[88px] lg:px-3" : "lg:w-[258px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "mb-8 flex h-10 items-center justify-between px-2",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Link href={nav.home} aria-label="Liggo, ir para o início">
            <Image
              className={cn("h-10 w-auto", collapsed && "lg:hidden")}
              src="/branding/liggo-logo-branca.svg"
              alt="Liggo"
              width={1260}
              height={440}
              priority
            />
            <Image
              className={cn("hidden size-9", collapsed && "lg:block")}
              src="/branding/liggo-simbolo.svg"
              alt="Liggo"
              width={512}
              height={512}
              priority
            />
          </Link>
          <button
            type="button"
            aria-label="Fechar menu"
            className="grid size-8 place-items-center rounded-lg text-[#8e94ac] hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
          }
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          onClick={() => setCollapsed((value) => !value)}
          className="sidebar-toggle absolute top-[82px] -right-3.5 hidden size-7 place-items-center rounded-full text-[#b5b8be] transition hover:text-[#1ce6d3] lg:grid"
        >
          <ChevronRightIcon
            className={cn(
              "size-3.5 transition-transform duration-300",
              !collapsed && "rotate-180",
            )}
          />
        </button>

        {nav.sections.map((section, index) => (
          <div key={section.label} className={index > 0 ? "mt-7" : undefined}>
            {sectionLabel(section.label)}
            <nav aria-label={section.label} className="flex flex-col gap-1">
              {section.items.map((item) => renderLink(item, section.muted))}
            </nav>
          </div>
        ))}

        {area === "organizer" ? (
          <div
            title={collapsed ? `Plano ${plan?.name ?? ""}`.trim() : undefined}
            className={cn(
              "mt-auto overflow-hidden rounded-2xl border border-white/[.06] bg-linear-to-br from-[#262b49] to-[#20243e] p-4",
              collapsed && "lg:p-2.5",
            )}
          >
            <div
              className={cn(
                "grid size-8 place-items-center rounded-lg bg-[#187cfa]/20 text-[#1ce6d3]",
                !collapsed && "mb-3",
              )}
            >
              <ZapIcon className="size-4" />
            </div>
            <div className={cn(collapsed && "lg:hidden")}>
              <p className="text-[13px] font-semibold">
                Plano {plan?.name ?? ""}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8f95ae]">
                {plan
                  ? plan.maxEvents === null
                    ? `${plan.events} eventos (sem limite).`
                    : `Você está usando ${plan.events} de ${plan.maxEvents} eventos.`
                  : ""}
              </p>
              <div className="my-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#187cfa] to-[#1ce6d3]"
                  style={{
                    width: `${plan && plan.maxEvents ? Math.min(100, Math.round((plan.events / plan.maxEvents) * 100)) : 0}%`,
                  }}
                />
              </div>
              <Link
                href="/settings/plan"
                className="text-[11px] font-semibold text-[#1ce6d3]"
              >
                Fazer upgrade →
              </Link>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center gap-3 border-t border-white/[.06] px-1 pt-4",
            area === "organizer" ? "mt-4" : "mt-auto",
            collapsed && "lg:justify-center",
          )}
          title={collapsed ? `${user.name}, ${user.detail}` : undefined}
        >
          <Avatar
            name={user.name}
            className="size-9 text-xs ring-2 ring-white/10"
          />
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="truncate text-xs font-semibold">{user.name}</p>
            <p className="truncate text-[10px] text-[#7d849e]">{user.detail}</p>
          </div>
          <ChevronDownIcon
            className={cn("size-4 text-[#6f758e]", collapsed && "lg:hidden")}
          />
        </div>
      </aside>

      <div
        className={cn(
          "relative z-10 transition-[padding] duration-300 print:pl-0",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[258px]",
        )}
      >
        <header className="liquid-topbar sticky top-0 z-30 flex h-[72px] items-center px-4 sm:px-6 xl:px-9 print:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            className="glass-button mr-3 grid size-9 place-items-center rounded-xl text-[#b5b8be] lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon className="size-5" />
          </button>

          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-[15px] font-bold tracking-tight">
              {pageTitle}
            </p>
            <p className="min-h-4 text-[11px] text-[#9094a7]">{today}</p>
          </div>

          <div className="relative mx-auto flex h-10 max-w-[330px] flex-1 items-center sm:mx-5 lg:mx-8">
            <SearchIcon className="pointer-events-none absolute left-3.5 size-[17px] text-[#a4a7b6]" />
            <input
              type="search"
              aria-label="Buscar"
              placeholder="Buscar campeonatos, times..."
              className="glass-input h-full w-full rounded-xl pr-4 pl-10 text-xs text-white outline-none transition placeholder:text-[#848892] focus:ring-4 focus:ring-[#1ce6d3]/10"
            />
          </div>

          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label="Notificações"
                  className="glass-button relative grid size-10 place-items-center rounded-xl text-[#b5b8be] transition hover:text-[#1ce6d3]"
                />
              }
            >
              <BellIcon className="size-[19px]" />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="theme-dark liquid-popover w-72 rounded-2xl p-3"
            >
              <PopoverHeader className="px-2 pb-2">
                <PopoverTitle className="text-xs font-bold">
                  Notificações
                </PopoverTitle>
                <PopoverDescription className="text-[11px] text-[#b5b8be]">
                  Nenhuma notificação por enquanto.
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>

          <div className="mx-4 hidden h-7 w-px bg-white/10 md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Menu do usuário"
                  className="hidden items-center gap-2.5 rounded-xl p-1 md:flex"
                />
              }
            >
              <Avatar name={user.name} className="size-9 text-[11px]" />
              <span className="hidden text-left xl:block">
                <span className="block text-xs font-semibold">
                  {user.name.split(" ")[0]}
                </span>
                <span className="block text-[10px] text-[#999dae]">
                  {nav.roleLabel}
                </span>
              </span>
              <ChevronDownIcon className="size-3.5 text-[#9b9eac]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="theme-dark liquid-popover min-w-52 rounded-2xl"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user.detail}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOutIcon />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 xl:p-9 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
