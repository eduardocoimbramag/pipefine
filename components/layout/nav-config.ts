import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Wallet,
  HandCoins,
  Contact,
  UserX,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Mostrar no menu inferior do mobile (espaço limitado). */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, mobile: true },
  { label: "Leads", href: "/leads", icon: Users, mobile: true },
  { label: "Follow-ups", href: "/followups", icon: CalendarCheck, mobile: true },
  { label: "Eventos", href: "/eventos", icon: CalendarDays, mobile: true },
  { label: "Financeiro", href: "/financeiro", icon: Wallet, mobile: true },
  {
    label: "Acompanhamento de recebimentos",
    href: "/recebimentos",
    icon: HandCoins,
  },
  { label: "Banco de Clientes", href: "/clientes", icon: Contact },
  { label: "Leads perdidos", href: "/leads-perdidos", icon: UserX },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
