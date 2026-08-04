"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { computeReferrerPerformance } from "@/lib/referrer-metrics";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function ReferrerPerformanceReport({ leads }: { leads: LeadWithRelations[] }) {
  const rows = computeReferrerPerformance(leads).map((r) => ({
    ...r,
    phoneLabel: r.phone ?? "—",
    winRateLabel: `${r.winRate.toFixed(1)}%`,
  }));

  return (
    <div className="space-y-4">
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
