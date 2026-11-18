import {
  Building2Icon,
  CalendarDaysIcon,
  ChartColumnIcon,
  CircleHelpIcon,
  LayoutGridIcon,
  SettingsIcon,
  TrophyIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavConfig = {
  home: string;
  main: NavItem[];
  workspace: NavItem[];
  roleLabel: string;
};

export const organizerNav: NavConfig = {
  home: "/dashboard",
  roleLabel: "Organizador",
  main: [
    { label: "Visão geral", href: "/dashboard", icon: LayoutGridIcon },
    { label: "Campeonatos", href: "/championships", icon: TrophyIcon },
    { label: "Participantes", href: "/participants", icon: UsersIcon },
    { label: "Calendário", href: "/calendar", icon: CalendarDaysIcon },
    { label: "Relatórios", href: "/reports", icon: ChartColumnIcon },
  ],
  workspace: [
    { label: "Configurações", href: "/settings", icon: SettingsIcon },
    { label: "Central de ajuda", href: "/help", icon: CircleHelpIcon },
  ],
};

export const adminNav: NavConfig = {
  home: "/admin",
  roleLabel: "Administrador",
  main: [
    { label: "Visão geral", href: "/admin", icon: LayoutGridIcon },
    {
      label: "Organizações",
      href: "/admin/organizations",
      icon: Building2Icon,
    },
    { label: "Usuários", href: "/admin/users", icon: UserRoundIcon },
  ],
  workspace: [],
};
