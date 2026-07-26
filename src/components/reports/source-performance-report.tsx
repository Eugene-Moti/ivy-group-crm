"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { computeSourcePerformance } from "@/lib/report-metrics";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function SourcePerformanceReport({ leads }: { leads: LeadWithRelations[] }) {
  const rows = computeSourcePerformance(leads).map((r) => ({
    ...r,
    winRateLabel: `${r.winRate.toFixed(1)}%`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Leads and win rate per lead source.
        </p>
        <ExportButtons
          data={rows}
          columns={[
            { key: "source", label: "Source" },
            { key: "total", label: "Total leads" },
            { key: "won", label: "Deals won" },
            { key: "winRateLabel", label: "Win rate" },
          ]}
          filename="ivy-group-source-performance"
          title="Source Performance"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Total leads</TableHead>
              <TableHead>Deals won</TableHead>
              <TableHead>Win rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.source}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.won}</TableCell>
                  <TableCell>{row.winRateLabel}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No leads yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
