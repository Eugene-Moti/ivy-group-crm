"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent } from "@/components/ui/card";
import { TileHead } from "@/components/dashboard/tile-parts";
import { cn } from "@/lib/utils";

const MAX_ITEMS = 4;

/**
 * "Needs attention": the same items as the notification bell, shown as a
 * short stack tagged URGENT or HEADS UP (words, not just colour). Team
 * members who don't get the admin checks see their overdue follow-ups.
 */
export function AttentionTile({ overdueFollowUps }: { overdueFollowUps: number }) {
  const isAdmin = useIsAdmin();
  const { notifications, isLoading } = useNotifications(isAdmin);

  const items = isAdmin
    ? notifications
    : overdueFollowUps > 0
      ? [
          {
            id: "overdue",
            severity: "critical" as const,
            title: `${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}`,
            detail: "Past their follow-up date.",
            href: "/follow-ups",
          },
        ]
      : [];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-2.5">
        <TileHead title="Needs attention">
          {items.length > MAX_ITEMS && <span className="text-[11px] text-muted-foreground">{items.length} items</span>}
        </TileHead>
        {isAdmin && isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="orion-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="flex flex-1 items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" /> All caught up.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.slice(0, MAX_ITEMS).map((item, i) => {
              const urgent = item.severity === "critical";
              const Icon = urgent ? OctagonAlert : AlertTriangle;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={item.href}
                    className="group flex gap-2.5 rounded-xl border border-border/70 bg-background/40 p-2.5 transition-[transform,border-color] duration-200 hover:translate-x-0.5 hover:border-gold/40"
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", urgent ? "text-destructive" : "text-[#8a6418] dark:text-gold")} />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block font-mono text-[10px] font-semibold tracking-[0.12em]",
                          urgent ? "text-destructive" : "text-[#8a6418] dark:text-gold"
                        )}
                      >
                        {urgent ? "URGENT" : "HEADS UP"}
                      </span>
                      <span className="block text-[13px] leading-snug font-medium">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] text-muted-foreground">{item.detail}</span>
                    </span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
