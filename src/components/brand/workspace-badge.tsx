/* eslint-disable @next/next/no-img-element -- workspace logos come from Supabase storage at arbitrary sizes; a plain <img> avoids configuring remote image domains for one small badge */
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/workspace";

/** The workspace's logo, or its initials on the accent colour if no logo is set. */
export function WorkspaceBadge({ workspace, className }: { workspace: Workspace; className?: string }) {
  if (workspace.logoUrl) {
    return (
      <span className={cn("flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white", className)}>
        <img src={workspace.logoUrl} alt="" className="size-full object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand,var(--evergreen))] text-[10px] font-semibold tracking-wide text-white",
        className
      )}
    >
      {workspace.shortName}
    </span>
  );
}
