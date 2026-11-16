"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Project = { id: string; name: string };

/**
 * "Which project am I looking at?" — a glass segmented control above the
 * dashboard. Picking one reloads the figures scoped to that project's leads
 * and unit sales (?project=<id>); every tile counts up to its new value.
 * Active pill glides between options.
 */
export function ProjectScope({ projects, activeId }: { projects: Project[]; activeId: string | null }) {
  if (projects.length === 0) return null;
  const options = [{ id: null as string | null, name: "All projects" }, ...projects];

  return (
    <div className="orion-glass flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1" role="group" aria-label="Project">
      <Building2 className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {options.map((p) => {
        const active = p.id === activeId;
        return (
          <Link
            key={p.id ?? "all"}
            href={p.id ? `/dashboard?project=${encodeURIComponent(p.id)}` : "/dashboard"}
            scroll={false}
            aria-pressed={active}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "text-primary-foreground hover:text-primary-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="project-scope-active"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_6px_16px_-8px_var(--primary)]"
              />
            )}
            <span className="relative">{p.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
