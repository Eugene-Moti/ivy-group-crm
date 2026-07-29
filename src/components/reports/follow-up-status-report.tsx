"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { FOLLOW_UP_ALERT_COLORS } from "@/lib/leads";
import { computeFollowUpSummary, type FollowUpBucket } from "@/lib/report-metrics";
import type { LeadWithRelations } from "@/lib/queries/leads";

const BUCKETS: FollowUpBucket[] = ["Overdue", "Due Soon", "On Track", "Not scheduled"];
const BUCKET_COLORS: Record<FollowUpBucket, string> = {
  Overdue: FOLLOW_UP_ALERT_COLORS.Overdue,
  "Due Soon": FOLLOW_UP_ALERT_COLORS["Due Soon"],
  "On Track": FOLLOW_UP_ALERT_COLORS["On Track"],
  "Not scheduled": FOLLOW_UP_ALERT_COLORS.None,
};

export function FollowUpStatusReport({ leads }: { leads: LeadWithRelations[] }) {
  const { totals, openCount, rows } = computeFollowUpSummary(leads);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Follow-up load across the {openCount} open lead{openCount === 1 ? "" : "s"}{" "}
        currently in the pipeline — closed deals are excluded.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BUCKETS.map((bucket) => (
          <div key={bucket} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{bucket}</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums"
              style={{ color: BUCKET_COLORS[bucket] }}
            >
              {totals[bucket]}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">By assigned sales manager</p>
        <ExportButtons
          data={rows}
          columns={[
            { key: "agent", label: "Sales manager" },
            { key: "Overdue", label: "Overdue" },
            { key: "Due Soon", label: "Due soon" },
            { key: "On Track", label: "On track" },
            { key: "Not scheduled", label: "Not scheduled" },
            { key: "total", label: "Total open" },
          ]}
          filename="ivy-group-follow-up-status"
          title="Follow-up Status"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sales manager</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Due soon</TableHead>
              <TableHead>On track</TableHead>
              <TableHead>Not scheduled</TableHead>
              <TableHead>Total open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.agent}>
                  <TableCell className="font-medium">{row.agent}</TableCell>
                  <TableCell style={{ color: row.Overdue > 0 ? BUCKET_COLORS.Overdue : undefined }}>
                    {row.Overdue}
                  </TableCell>
                  <TableCell>{row["Due Soon"]}</TableCell>
                  <TableCell>{row["On Track"]}</TableCell>
                  <TableCell>{row["Not scheduled"]}</TableCell>
                  <TableCell>{row.total}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
