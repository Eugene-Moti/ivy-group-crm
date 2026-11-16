"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useIsAdmin } from "@/components/providers/profile-provider";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/65 transition-[background-color,color,transform] duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
              isActive &&
                "bg-gradient-to-r from-gold/15 to-sidebar-accent/60 text-sidebar-foreground before:absolute before:-left-4 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-gold [&>svg]:text-gold"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
