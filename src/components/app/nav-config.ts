import {
  Building2Icon,
  CalendarDaysIcon,
  ChartColumnIcon,
  CircleHelpIcon,
  LayoutGridIcon,
  MedalIcon,
  SettingsIcon,
  TagsIcon,
  TrophyIcon,
  UserRoundIcon,
  UsersIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavSection = { label: string; items: NavItem[]; muted?: boolean };
export type NavConfig = {
  home: string;
  roleLabel: string;
  sections: NavSection[];
};

export const organizerNav: NavConfig = {
  home: "/dashboard",
  roleLabel: "Organizador",
  sections: [
    {
      label: "Menu principal",
      items: [
        { label: "Visão geral", href: "/dashboard", icon: LayoutGridIcon },
        { label: "Eventos", href: "/events", icon: TrophyIcon },
        { label: "Participantes", href: "/participants", icon: UsersIcon },
        { label: "Calendário", href: "/calendar", icon: CalendarDaysIcon },
        { label: "Relatórios", href: "/reports", icon: ChartColumnIcon },
      ],
    },
    {
      label: "Workspace",
      muted: true,
      items: [
        { label: "Configurações", href: "/settings", icon: SettingsIcon },
        { label: "Central de ajuda", href: "/help", icon: CircleHelpIcon },
      ],
    },
  ],
};

export const adminNav: NavConfig = {
  home: "/admin",
  roleLabel: "Administrador",
  sections: [
    {
      label: "Menu principal",
      items: [
        { label: "Visão geral", href: "/admin", icon: LayoutGridIcon },
        {
          label: "Organizações",
          href: "/admin/organizations",
          icon: Building2Icon,
        },
        { label: "Usuários", href: "/admin/users", icon: UserRoundIcon },
      ],
    },
    {
      label: "Cadastros",
      items: [
        { label: "Modalidades", href: "/admin/sports", icon: MedalIcon },
        {
          label: "Tipos de evento",
          href: "/admin/event-types",
          icon: TagsIcon,
        },
        { label: "Formatos", href: "/admin/formats", icon: WorkflowIcon },
      ],
    },
  ],
};
