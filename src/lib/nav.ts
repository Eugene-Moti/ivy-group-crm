import {
  LayoutDashboard,
  Users,
  CalendarClock,
  BarChart3,
  Upload,
  IdCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Team & Users", href: "/team", icon: IdCard },
  { title: "Import", href: "/leads/import", icon: Upload, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];
