"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { computeVelocity, type VelocityGroupRow } from "@/lib/velocity-metrics";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";
import type { LeadStatus } from "@/lib/constants";

export function PipelineVelocityReport({
  leads,
  activitySummaries,
}: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
}) {
  const statusLabels = useStatusLabels();
  const analysis = useMemo(() => computeVelocity(leads, activitySummaries), [leads, activitySummaries]);

  const byStatusRows = analysis.byStatus.map((r) => ({
    ...r,
    displayName: statusLabels[r.name as LeadStatus] ?? r.name,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        How long open leads have sat in their current pipeline stage, and how
        long closed deals took to get there — built from logged status
        changes. A lead with no logged status change falls back to its
        inquiry date, so older leads whose stage changed before this tracking
        existed may overstate their current-stage age.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CloseTimeCard title="Avg. days to close — Won" stats={analysis.closeTime.won} />
        <CloseTimeCard title="Avg. days to close — Lost" stats={analysis.closeTime.lost} />
      </div>

      <VelocityTable
        title="Time in current stage — by status"
        rows={byStatusRows.map((r) => ({ ...r, name: r.displayName }))}
        filename="ivy-group-velocity-by-status"
      />
      <VelocityTable
        title="Time in current stage — by sales manager"
        rows={analysis.byManager}
        filename="ivy-group-velocity-by-manager"
      />
      <VelocityTable
        title="Time in current stage — by project"
        rows={analysis.byProject}
        filename="ivy-group-velocity-by-project"
      />
    </div>
  );
}

function CloseTimeCard({
  title,
  stats,
}: {
  title: string;
  stats: { avgDays: number; medianDays: number; coveredCount: number; totalCount: number };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {stats.coveredCount > 0 ? `${stats.avgDays.toFixed(0)} days` : "—"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Median {stats.medianDays.toFixed(0)}d · based on {stats.coveredCount} of {stats.totalCount}{" "}
        deal{stats.totalCount === 1 ? "" : "s"} with a logged status history
      </p>
    </div>
  );
}

function VelocityTable({
  title,
  rows,
  filename,
}: {
  title: string;
  rows: VelocityGroupRow[];
  filename: string;
}) {
  const exportRows = rows.map((r) => ({
    name: r.name,
    avgDaysLabel: r.avgDays.toFixed(1),
    medianDaysLabel: r.medianDays.toFixed(1),
    count: r.count,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <ExportButtons
          data={exportRows}
          columns={[
            { key: "name", label: "Group" },
            { key: "avgDaysLabel", label: "Avg days" },
            { key: "medianDaysLabel", label: "Median days" },
            { key: "count", label: "Open leads" },
          ]}
          filename={filename}
          title={title}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Avg days in stage</TableHead>
              <TableHead>Median days</TableHead>
              <TableHead>Open leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.avgDays.toFixed(1)}</TableCell>
                  <TableCell>{row.medianDays.toFixed(1)}</TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  No open leads.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
