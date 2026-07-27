"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { StatusBadge } from "@/components/badges/status-badge";
import { STATUS_COLORS } from "@/lib/constants";
import { computeConversionByStage } from "@/lib/report-metrics";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function ConversionByStageReport({ leads }: { leads: LeadWithRelations[] }) {
  const statusLabels = useStatusLabels();
  const rows = computeConversionByStage(leads).map((r) => ({
    ...r,
    percentLabel: `${r.percentOfTotal.toFixed(1)}%`,
  }));
  const exportRows = rows.map((r) => ({ ...r, status: statusLabels[r.status] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Where every lead currently sits in the pipeline.
        </p>
        <ExportButtons
          data={exportRows}
          columns={[
            { key: "status", label: "Stage" },
            { key: "count", label: "Leads" },
            { key: "percentLabel", label: "% of total" },
          ]}
          filename="ivy-group-conversion-by-stage"
          title="Conversion by Stage"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead className="w-1/2">% of total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.status}>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.percentOfTotal}%`,
                          backgroundColor: STATUS_COLORS[row.status],
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {row.percentLabel}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
