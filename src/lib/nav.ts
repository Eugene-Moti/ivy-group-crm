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

// Deliberately no "Private" entry here — that area never appears in any
// menu, sidebar, or search result for anyone, allowlisted or not. It's
// reached only by the hidden phrase in the command palette (or typing
// /private directly), never listed. See command-palette.tsx.
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Team & Users", href: "/team", icon: IdCard },
  { title: "Import", href: "/leads/import", icon: Upload, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];
