import {
  LayoutDashboard,
  Users,
  CalendarClock,
  BarChart3,
  Upload,
  IdCard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ASK_ORION_ENABLED } from "@/lib/features";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Shown in the menu with a SOON tag, but not yet a link. */
  soon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Follow-ups", href: "/follow-ups", icon: CalendarClock },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Ask Orion", href: "/orion", icon: Sparkles, soon: !ASK_ORION_ENABLED },
  { title: "Team & Users", href: "/team", icon: IdCard },
  { title: "Import", href: "/leads/import", icon: Upload, adminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];
