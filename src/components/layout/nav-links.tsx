"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useIsAdmin } from "@/components/providers/profile-provider";

/**
 * Sidebar navigation. The active highlight is one shared element that
 * glides between items as you navigate (framer layoutId), with a gold edge
 * and a gold icon. The longest matching href wins, so /leads/import lights
 * up Import, not Leads as well.
 */
export function NavLinks({ onNavigate, layoutGroup = "rail" }: { onNavigate?: () => void; layoutGroup?: string }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const activeHref = items
    .filter((item) => !item.soon)
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        if (item.soon) {
          // Planned, not built yet: visible so people know it's coming, but not a link.
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title={`${item.title} is coming soon`}
              className="relative flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/40"
            >
              <item.icon className="size-[18px] shrink-0 text-gold/70" />
              <span>{item.title}</span>
              <span className="ml-auto rounded-full bg-gold/15 px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-gold-soft">SOON</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors duration-200 hover:text-sidebar-foreground",
              isActive && "text-sidebar-foreground"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`nav-active-${layoutGroup}`}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-xl border border-white/[0.07] bg-gradient-to-r from-gold/[0.18] via-white/[0.05] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-gold before:shadow-[0_0_12px_var(--gold)]"
              />
            )}
            <span className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <item.icon
              className={cn(
                "relative size-[18px] shrink-0 transition-transform duration-300 ease-[var(--ease-orion-spring)] group-hover:scale-110",
                isActive && "text-gold"
              )}
            />
            <span className="relative">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
