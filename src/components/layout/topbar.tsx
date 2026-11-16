"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AssistantTrigger } from "@/components/assistant/assistant-trigger";
import { ASK_ORION_ENABLED } from "@/lib/features";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function Topbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="relative z-30 flex h-[4.5rem] shrink-0 items-center gap-3 px-4 sm:px-6">
      <MobileSidebar />

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="orion-glass group flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-full px-4 text-sm text-muted-foreground transition-[border-color,box-shadow] duration-300 hover:border-gold/40 hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--gold)_12%,transparent)]"
      >
        <Search className="size-4 transition-colors group-hover:text-gold" />
        <span className="flex-1 text-left">Search leads, phones, emails…</span>
        <kbd className="hidden rounded-md border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <div className="orion-glass ml-auto flex items-center gap-0.5 rounded-full p-1">
        {ASK_ORION_ENABLED && <AssistantTrigger />}
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
