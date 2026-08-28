"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QueryBuilder } from "@/components/reports/query-builder";
import { SourcePerformanceReport } from "@/components/reports/source-performance-report";
import { ConversionByStageReport } from "@/components/reports/conversion-by-stage-report";
import { AgentPerformanceReport } from "@/components/reports/agent-performance-report";
import { FollowUpStatusReport } from "@/components/reports/follow-up-status-report";
import { ReferrerPerformanceReport } from "@/components/reports/referrer-performance-report";
import { PipelineVelocityReport } from "@/components/reports/pipeline-velocity-report";
import { ConversionTimelineReport } from "@/components/reports/conversion-timeline-report";
import { DuplicateLeadsReport } from "@/components/reports/duplicate-leads-report";
import { AgentWonAuditReport } from "@/components/reports/agent-won-audit-report";
import { MarketingReportView } from "@/components/reports/marketing-report";
import { LostLeadsReport } from "@/components/reports/lost-leads-report";
import { FullAnalysisReport } from "@/components/reports/full-analysis-report";
import { REPORT_GROUPS, VALID_TABS, findReport } from "@/components/reports/report-nav-config";
import { cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { SavedQueryRow } from "@/lib/queries/saved-queries";
import type { ActivitySummary, EvidenceLeadId } from "@/lib/full-analysis";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

export function ReportsView({
  leads,
  leadSources,
  propertyTypes,
  agents,
  savedQueries,
  activitySummaries,
  evidenceLeadIds,
}: {
  leads: LeadWithRelations[];
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  agents: AgentOption[];
  savedQueries: SavedQueryRow[];
  activitySummaries: ActivitySummary[];
  evidenceLeadIds: EvidenceLeadId[];
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    VALID_TABS.includes(requestedTab ?? "") ? requestedTab! : "builder"
  );
  const activeReport = findReport(activeTab) ?? findReport("builder")!;

  /**
   * Real Estate Agent leads are a referral channel, not client deals — they
   * shouldn't inflate "total leads," conversion rate, or any other deal
   * performance number. Excluded here for every report that's about deal
   * performance; still fully visible on the Kanban/Leads table, and still
   * counted in their own right on the Referrers report.
   */
  const clientLeads = useMemo(
    () => leads.filter((l) => l.lead_type !== "Real Estate Agent"),
    [leads]
  );

  function renderActiveReport() {
    switch (activeTab) {
      case "builder":
        return (
          <QueryBuilder
            leads={leads}
            leadSources={leadSources}
            propertyTypes={propertyTypes}
            agents={agents}
            savedQueries={savedQueries}
          />
        );
      case "source":
        return <SourcePerformanceReport leads={clientLeads} />;
      case "conversion":
        return <ConversionByStageReport leads={clientLeads} />;
      case "agent":
        return <AgentPerformanceReport leads={leads} />;
      case "follow-ups":
        return <FollowUpStatusReport leads={leads} />;
      case "referrers":
        return <ReferrerPerformanceReport leads={leads} />;
      case "velocity":
        return <PipelineVelocityReport leads={clientLeads} activitySummaries={activitySummaries} />;
      case "conversion-timeline":
        return <ConversionTimelineReport leads={clientLeads} activitySummaries={activitySummaries} />;
      case "duplicates":
        return <DuplicateLeadsReport leads={leads} />;
      case "agent-won-audit":
        return <AgentWonAuditReport leads={leads} />;
      case "marketing":
        return <MarketingReportView leads={leads} />;
      case "lost-leads":
        return <LostLeadsReport leads={clientLeads} />;
      case "full-analysis":
        return (
          <FullAnalysisReport
            leads={clientLeads}
            activitySummaries={activitySummaries}
            evidenceLeadIds={evidenceLeadIds}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Build custom queries or jump to a canned report.
        </p>
      </div>

      {/* Mobile / narrow screens: a single grouped dropdown instead of a sidebar. */}
      <div className="lg:hidden">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.reports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Desktop: grouped nav rail. */}
        <nav className="hidden shrink-0 lg:block lg:w-64">
          <div className="sticky top-4 space-y-4 rounded-2xl border border-border bg-card p-3">
            {REPORT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="flex items-center gap-1.5 px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <group.icon className="size-3.5" />
                  {group.label}
                </p>
                <div className="mt-1 flex flex-col gap-0.5">
                  {group.reports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveTab(r.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                        activeTab === r.id
                          ? "bg-accent text-gold"
                          : "text-foreground/70 hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <r.icon className="size-4 shrink-0" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <activeReport.icon className="size-5 shrink-0 text-gold" />
            <h2 className="text-lg font-semibold tracking-tight">{activeReport.label}</h2>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            {renderActiveReport()}
          </div>
        </div>
      </div>
    </div>
  );
}
