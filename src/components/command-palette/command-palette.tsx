"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { usePrivateAccess } from "@/components/providers/private-access-provider";
import { NAV_ITEMS } from "@/lib/nav";
import { fullName } from "@/lib/format";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type LeadHit = { id: string; first_name: string; last_name: string };

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { hasAccess: hasPrivateAccess } = usePrivateAccess();
  const [query, setQuery] = useState("");
  const [leadHits, setLeadHits] = useState<LeadHit[]>([]);

  const term = query.trim().replace(/[,()%]/g, "");
  const canSearchLeads = term.length >= 2;

  useEffect(() => {
    if (!canSearchLeads) return;

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select("id, first_name, last_name")
        .eq("is_private", false)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .limit(8);
      setLeadHits(data ?? []);
    }, 250);

    return () => clearTimeout(timeout);
  }, [term, canSearchLeads]);

  // Hidden entry to the Private area — an exact phrase, checked server-side,
  // never rendered as a result. Only even attempted for someone already on
  // the allowlist, so it's a silent no-op for everyone else. Auto-navigates
  // the instant it matches, rather than showing a selectable item — nothing
  // ever flashes on screen for a phrase mid-typo.
  useEffect(() => {
    const phrase = query.trim();
    if (!hasPrivateAccess || phrase.length < 3) return;

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/private/entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phrase }),
        });
        const data = await res.json().catch(() => null);
        if (data?.match) go("/private");
      } catch {
        // Silent — this is an obscurity layer, not a feature anyone should see fail.
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go() is stable for this component's lifetime
  }, [query, hasPrivateAccess]);

  function handleOpenChange(next: boolean) {
    if (!next) setQuery("");
    onOpenChange(next);
  }

  function go(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const visibleLeadHits = canSearchLeads ? leadHits : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command palette"
      description="Jump to a page, search leads, or create a new one."
    >
      <CommandInput
        placeholder="Search leads, or jump to a page…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {isAdmin && (
          <>
            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/leads?new=1")}>
                <Plus />
                Create new lead
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {visibleLeadHits.length > 0 && (
          <>
            <CommandGroup heading="Leads">
              {visibleLeadHits.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${fullName(lead)}-${lead.id}`}
                  onSelect={() => go(`/leads/${lead.id}`)}
                >
                  <User />
                  {fullName(lead)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`nav-${item.title}`}
              onSelect={() => go(item.href)}
            >
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
