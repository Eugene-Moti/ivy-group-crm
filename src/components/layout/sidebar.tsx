"use client";

import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { WorkspaceBadge } from "@/components/brand/workspace-badge";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useProfile } from "@/components/providers/profile-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SidebarWorkspace() {
  const workspace = useWorkspace();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2">
      <WorkspaceBadge workspace={workspace} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{workspace.name}</p>
        <p className="text-[11px] text-sidebar-foreground/45">
          Workspace{workspace.seats ? ` · ${workspace.seats} ${workspace.seats === 1 ? "seat" : "seats"}` : ""}
        </p>
      </div>
    </div>
  );
}

function SidebarUser() {
  const profile = useProfile();
  const label = profile?.display_name || profile?.full_name || profile?.email || "Account";
  const role = profile?.job_title || (profile?.role === "admin" ? "Admin" : "Team member");
  return (
    <div className="flex items-center gap-2.5 rounded-xl p-2">
      <Avatar className="size-8 ring-1 ring-gold/40">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="bg-gold text-xs font-semibold text-ink">{label.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{label}</p>
        <p className="truncate text-[11px] text-sidebar-foreground/45">{role}</p>
      </div>
      <span className="ml-auto size-2 shrink-0 rounded-full bg-evergreen-soft shadow-[0_0_8px_var(--evergreen-soft)]" aria-label="Online" />
    </div>
  );
}

/**
 * The floating glass rail: Orion wordmark, the company being worked in,
 * navigation, and who's signed in. It floats 12px off the window edges and
 * stays brand-dark in both themes.
 */
export function Sidebar() {
  return (
    <aside className="orion-rail relative m-3 mr-0 hidden w-64 shrink-0 flex-col overflow-hidden rounded-[22px] p-3 lg:flex">
      <div className="px-2 pt-2 pb-4">
        <Logo />
      </div>
      <SidebarWorkspace />
      <p className="mt-5 mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/35 uppercase">Menu</p>
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <SidebarUser />
      </div>
    </aside>
  );
}
