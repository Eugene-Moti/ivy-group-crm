"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { WON_STATUS_KEY } from "@/lib/constants";
import { fullName, formatDate } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

/**
 * An agent's own card should never end up Closed-Won (see the
 * leads_agent_not_closed_won DB constraint) — this report is the backstop
 * for leads that reached that state before the constraint existed, or any
 * that a data import slips through. Each one means a real client deal has
 * no client record at all: no name, phone, email, or evidence, just the
 * agent's own info standing in for it.
 */
export function AgentWonAuditReport({ leads }: { leads: LeadWithRelations[] }) {
  const flagged = useMemo(
    () => leads.filter((l) => l.lead_type === "Real Estate Agent" && l.status === WON_STATUS_KEY),
    [leads]
  );

  const rows = useMemo(
    () =>
      flagged.map((lead) => ({
        id: lead.id,
        name: fullName(lead),
        manager: lead.assigned_agent?.name ?? "Unassigned",
        source: lead.lead_source?.name ?? "Unknown",
        markedAt: lead.updated_at,
      })),
    [flagged]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Real Estate Agent leads currently marked Won — this should never
          happen (an agent isn&apos;t the client), so each one here almost
          certainly means a completed deal with no client record at all. Open
          each lead, click &quot;Add client details&quot; to create the real
          client lead and mark that one Won instead, then correct this
          agent&apos;s own status.
        </p>
        <ExportButtons
          data={rows}
          columns={[
            { key: "name", label: "Agent" },
            { key: "manager", label: "Sales manager" },
            { key: "source", label: "Source" },
            { key: "markedAt", label: "Marked Won at" },
          ]}
          filename="ivy-group-agent-won-audit"
          title="Agent Leads Marked Won"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Sales manager</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Marked Won at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/leads/${row.id}`} className="hover:text-gold hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.manager}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{formatDate(row.markedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  None found — every agent lead is correctly separate from its client deals.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
