"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { fullName, formatDate } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";
import { CreatePrivateClientDialog } from "@/components/private/create-private-client-dialog";

type Project = { id: string; name: string; location: string | null };

export function PrivateClientsList({
  leads,
  projects,
  isAdmin,
}: {
  leads: LeadWithRelations[];
  projects: Project[];
  isAdmin: boolean;
}) {
  const statusLabels = useStatusLabels();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((l) =>
      [l.codename, fullName(l), l.property_type?.name, l.phone, l.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [leads, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Lock className="size-5 text-gold" />
            Private clients
          </h1>
          <p className="text-sm text-muted-foreground">
            Handled in-house only — never assigned to a sales manager, never shown in the
            shared pipeline, reports, search, or the daily digest.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New private client
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search codename, name, project…"
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {leads.length === 0
              ? "No private clients yet."
              : "No private clients match that search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <Link key={l.id} href={`/private/${l.id}`}>
              <Card className="h-full rounded-2xl transition-colors hover:border-gold/50">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{l.codename || fullName(l)}</p>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {l.priority}
                    </Badge>
                  </div>
                  {l.codename && (
                    <p className="truncate text-xs text-muted-foreground">{fullName(l)}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">{statusLabels[l.status] ?? l.status}</Badge>
                    {l.property_type?.name && <span>· {l.property_type.name}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">Added {formatDate(l.created_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreatePrivateClientDialog open={createOpen} onOpenChange={setCreateOpen} projects={projects} />
    </div>
  );
}
