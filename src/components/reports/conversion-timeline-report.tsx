"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButtons } from "@/components/shared/export-buttons";
import { computeConversionTimelines } from "@/lib/conversion-timeline";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";

type Outcome = "All" | "Won" | "Lost";

export function ConversionTimelineReport({
  leads,
  activitySummaries,
}: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
}) {
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome>("All");
  const allRows = useMemo(
    () => computeConversionTimelines(leads, activitySummaries),
    [leads, activitySummaries]
  );
  const rows = useMemo(
    () => (outcomeFilter === "All" ? allRows : allRows.filter((r) => r.outcome === outcomeFilter)),
    [allRows, outcomeFilter]
  );

  const withHistory = rows.filter((r) => r.hasHistory);
  const title =
    outcomeFilter === "All"
      ? "Conversion Timeline"
      : outcomeFilter === "Won"
        ? "Converted Leads Timeline"
        : "Lost Leads Timeline";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every closed deal, how long it took, and the pipeline stages it passed
          through. {withHistory.length} of {rows.length} have a logged status
          history to calculate this from — the rest show &quot;No history
          recorded&quot; because their status was set directly (e.g. import) or
          changed before this tracking existed.
        </p>
        <div className="flex items-center gap-2">
          <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as Outcome)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All outcomes</SelectItem>
              <SelectItem value="Won">Won only</SelectItem>
              <SelectItem value="Lost">Lost only</SelectItem>
            </SelectContent>
          </Select>
          <ExportButtons
            data={rows}
            columns={[
              { key: "name", label: "Client" },
              { key: "managerName", label: "Sales manager" },
              { key: "projectName", label: "Project" },
              { key: "outcome", label: "Outcome" },
              { key: "inquiryDate", label: "Date of inquiry" },
              { key: "closedDate", label: "Closed date" },
              { key: "daysToClose", label: "Days to close" },
              { key: "statusPath", label: "Status path" },
            ]}
            filename="ivy-group-conversion-timeline"
            title={title}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Sales manager</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Days to close</TableHead>
              <TableHead>Status path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.managerName}</TableCell>
                  <TableCell>{row.projectName}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        row.outcome === "Won"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }
                    >
                      {row.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.daysToClose != null ? `${row.daysToClose}d` : "—"}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {row.statusPath}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No closed deals yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
