"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileRow } from "@/lib/queries/settings";

type AllowRow = {
  user_id: string;
  is_owner: boolean;
  granted_at: string;
  profile: { display_name: string | null; full_name: string | null; email: string | null } | null;
};

function label(p: { display_name: string | null; full_name: string | null; email: string | null } | null) {
  return p?.display_name || p?.full_name || p?.email || "Unknown user";
}

export function PrivateAllowlistManager({
  allowlist,
  profiles,
}: {
  allowlist: AllowRow[];
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const on = new Set(allowlist.map((a) => a.user_id));
    return profiles.filter((p) => !on.has(p.id));
  }, [allowlist, profiles]);

  async function grant() {
    if (!addId) return;
    setBusy("add");
    const res = await fetch("/api/private/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addId }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't grant access", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success("Access granted");
    setAddId("");
    router.refresh();
  }

  async function revoke(userId: string) {
    setBusy(userId);
    const res = await fetch("/api/private/access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Couldn't revoke", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success("Access revoked");
    router.refresh();
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-semibold">Who can see private clients</h2>
          <p className="text-sm text-muted-foreground">
            Only you can change this list. Everyone here can see and work every private client;
            everyone else — admins included — cannot.
          </p>
        </div>

        <div className="space-y-2">
          {allowlist.map((a) => (
            <div
              key={a.user_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{label(a.profile)}</span>
                {a.is_owner && <Badge variant="outline">Owner</Badge>}
              </div>
              {!a.is_owner && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Revoke access"
                  onClick={() => revoke(a.user_id)}
                  disabled={busy === a.user_id}
                >
                  {busy === a.user_id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Select value={addId} onValueChange={setAddId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a team member…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Everyone already has access.
                </div>
              ) : (
                candidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name || p.full_name || p.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={grant} disabled={!addId || busy === "add"}>
            {busy === "add" ? <Loader2 className="animate-spin" /> : <ShieldPlus className="size-4" />}
            Grant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
