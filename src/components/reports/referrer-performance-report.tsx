"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/shared/export-buttons";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { computeReferrerPerformance } from "@/lib/referrer-metrics";
import {
  findDualActivePairs,
  REFERRED_CLIENT_ACTIVE_STATUS_KEY,
  type DualActivePair,
} from "@/lib/agent-client-dedup";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function ReferrerPerformanceReport({ leads }: { leads: LeadWithRelations[] }) {
  const rows = computeReferrerPerformance(leads).map((r) => ({
    ...r,
    phoneLabel: r.phone ?? "—",
    winRateLabel: `${r.winRate.toFixed(1)}%`,
  }));

  const dualActivePairs = useMemo(() => findDualActivePairs(leads), [leads]);

  return (
    <div className="space-y-6">
      {dualActivePairs.length > 0 && (
        <DualActiveReview pairs={dualActivePairs} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Every lead tagged &quot;Real Estate Agent&quot; — how many buyer clients
          they&apos;ve referred and how those referrals are converting. Referrals
          are only counted when a &quot;Referred by agent&quot; link is set on the
          buyer&apos;s lead, so a 0 may mean &quot;none recorded&quot; rather than
          &quot;none referred&quot;.
        </p>
        <ExportButtons
          data={rows}
          columns={[
            { key: "name", label: "Agent" },
            { key: "phoneLabel", label: "Phone" },
            { key: "referredCount", label: "Clients referred" },
            { key: "wonCount", label: "Closed won" },
            { key: "winRateLabel", label: "Win rate" },
          ]}
          filename="ivy-group-referrer-performance"
          title="Real Estate Agent Referrers"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Clients referred</TableHead>
              <TableHead>Closed won</TableHead>
              <TableHead>Win rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.phoneLabel}</TableCell>
                  <TableCell>{row.referredCount}</TableCell>
                  <TableCell>{row.wonCount}</TableCell>
                  <TableCell>{row.winRateLabel}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No Real Estate Agent leads yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DualActiveReview({ pairs }: { pairs: DualActivePair[] }) {
  const router = useRouter();
  const statusLabels = useStatusLabels();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function handleResolve(agent: LeadWithRelations) {
    setResolvingId(agent.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: REFERRED_CLIENT_ACTIVE_STATUS_KEY })
      .eq("id", agent.id);
    setResolvingId(null);

    if (error) {
      toast.error("Failed to update agent", { description: error.message });
      return;
    }

    toast.success(`${fullName(agent)} moved to "Referred — Client Active"`);
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
        <div>
          <p className="text-sm font-medium">
            {pairs.length} agent{pairs.length === 1 ? "" : "s"} with a referred client both
            still active
          </p>
          <p className="text-sm text-muted-foreground">
            New referrals resolve this automatically now — this list only catches
            pairs linked before that was turned on, or set up some other way. Nothing
            is changed until you confirm each one below.
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Agent status</TableHead>
              <TableHead>Referred client</TableHead>
              <TableHead>Client status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map(({ agent, client }) => (
              <TableRow key={`${agent.id}-${client.id}`}>
                <TableCell className="font-medium">
                  <Link href={`/leads/${agent.id}`} className="hover:text-gold hover:underline">
                    {fullName(agent)}
                  </Link>
                </TableCell>
                <TableCell>{statusLabels[agent.status] ?? agent.status}</TableCell>
                <TableCell>
                  <Link href={`/leads/${client.id}`} className="hover:text-gold hover:underline">
                    {fullName(client)}
                  </Link>
                </TableCell>
                <TableCell>{statusLabels[client.status] ?? client.status}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolvingId === agent.id}
                    onClick={() => handleResolve(agent)}
                  >
                    {resolvingId === agent.id && <Loader2 className="size-3.5 animate-spin" />}
                    Mark referral as resolved
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
