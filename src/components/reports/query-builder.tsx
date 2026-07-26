"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { ExportButtons } from "@/components/shared/export-buttons";
import { SaveQueryDialog } from "@/components/reports/save-query-dialog";
import { SavedQueriesMenu } from "@/components/reports/saved-queries-menu";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import { applyReportFilters, EMPTY_REPORT_FILTERS, type ReportFilters } from "@/lib/report-metrics";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { SavedQueryRow } from "@/lib/queries/saved-queries";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

export function QueryBuilder({
  leads,
  leadSources,
  propertyTypes,
  agents,
  savedQueries,
}: {
  leads: LeadWithRelations[];
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
  savedQueries: SavedQueryRow[];
}) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);

  const areas = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.preferred_area).filter((a): a is string => !!a))
      ).sort(),
    [leads]
  );

  const results = useMemo(() => applyReportFilters(leads, filters), [leads, filters]);

  const exportRows = useMemo(
    () =>
      results.map((lead) => ({
        name: fullName(lead),
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        status: lead.status,
        priority: lead.priority,
        source: lead.lead_source?.name ?? "",
        area: lead.preferred_area ?? "",
        budget: formatBudgetRange(lead.budget_min, lead.budget_max),
        agent: lead.assigned_agent?.name ?? "Unassigned",
        created: formatDate(lead.created_at),
      })),
    [results]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportFiltersBar
          filters={filters}
          onChange={setFilters}
          leadSources={leadSources}
          propertyTypes={propertyTypes}
          agents={agents}
          areas={areas}
        />
        <div className="flex items-center gap-2">
          <SavedQueriesMenu savedQueries={savedQueries} onLoad={setFilters} />
          <SaveQueryDialog filters={filters} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {results.length} lead{results.length === 1 ? "" : "s"} match
        </p>
        <ExportButtons
          data={exportRows}
          columns={[
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "source", label: "Source" },
            { key: "area", label: "Area" },
            { key: "budget", label: "Budget" },
            { key: "agent", label: "Agent" },
            { key: "created", label: "Created" },
          ]}
          filename="ivy-group-query-results"
          title="Query Results"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length ? (
              results.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{fullName(lead)}</TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={lead.priority} />
                  </TableCell>
                  <TableCell>{lead.lead_source?.name ?? "—"}</TableCell>
                  <TableCell>{lead.preferred_area ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatBudgetRange(lead.budget_min, lead.budget_max)}
                  </TableCell>
                  <TableCell>{lead.assigned_agent?.name ?? "Unassigned"}</TableCell>
                  <TableCell>{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No leads match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
