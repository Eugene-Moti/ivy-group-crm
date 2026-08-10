"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { computeLostLeadsReport, type LostBreakdownRow, type LostLeadRow } from "@/lib/lost-leads-report";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function LostLeadsReport({ leads }: { leads: LeadWithRelations[] }) {
  const report = useMemo(() => computeLostLeadsReport(leads), [leads]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {report.totalLost} closed-lost lead{report.totalLost === 1 ? "" : "s"} —{" "}
        {report.withReasonCount} with a reason captured
        {report.totalLost > report.withReasonCount
          ? ` (${report.totalLost - report.withReasonCount} lost before reason capture existed, or logged without one)`
          : ""}
        .
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownTable title="By reason" rows={report.byReason} />
        <BreakdownTable title="By source" rows={report.bySource} />
        <BreakdownTable title="By project" rows={report.byProject} />
      </div>
      <BreakdownTable title="By sales manager" rows={report.byManager} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">All lost leads</p>
          <ExportButtons
            data={report.rows}
            columns={[
              { key: "name", label: "Name" },
              { key: "reason", label: "Reason" },
              { key: "note", label: "Details" },
              { key: "source", label: "Source" },
              { key: "project", label: "Project" },
              { key: "managerName", label: "Sales manager" },
            ]}
            filename="ivy-group-lost-leads"
            title="Lost Leads"
          />
        </div>
        <LostLeadsTable rows={report.rows} />
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: LostBreakdownRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.replace("By ", "")}</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{row.percentOfTotal.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                  No data yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LostLeadsTable({ rows }: { rows: LostLeadRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Sales manager</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell className="max-w-xs text-sm text-muted-foreground">{row.note || "—"}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.project}</TableCell>
                <TableCell>{row.managerName}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No lost leads yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
