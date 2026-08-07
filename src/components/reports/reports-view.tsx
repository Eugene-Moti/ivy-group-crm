"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryBuilder } from "@/components/reports/query-builder";
import { SourcePerformanceReport } from "@/components/reports/source-performance-report";
import { ConversionByStageReport } from "@/components/reports/conversion-by-stage-report";
import { AgentPerformanceReport } from "@/components/reports/agent-performance-report";
import { FollowUpStatusReport } from "@/components/reports/follow-up-status-report";
import { ReferrerPerformanceReport } from "@/components/reports/referrer-performance-report";
import { PipelineVelocityReport } from "@/components/reports/pipeline-velocity-report";
import { ConversionTimelineReport } from "@/components/reports/conversion-timeline-report";
import { DuplicateLeadsReport } from "@/components/reports/duplicate-leads-report";
import { MarketingReportView } from "@/components/reports/marketing-report";
import { FullAnalysisReport } from "@/components/reports/full-analysis-report";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { SavedQueryRow } from "@/lib/queries/saved-queries";
import type { ActivitySummary, EvidenceLeadId } from "@/lib/full-analysis";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

const VALID_TABS = [
  "builder",
  "source",
  "conversion",
  "agent",
  "follow-ups",
  "referrers",
  "velocity",
  "conversion-timeline",
  "duplicates",
  "marketing",
  "full-analysis",
];

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
  const defaultTab = VALID_TABS.includes(requestedTab ?? "") ? requestedTab! : "builder";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Build custom queries or jump to a canned report.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="builder">Query builder</TabsTrigger>
          <TabsTrigger value="source">Source performance</TabsTrigger>
          <TabsTrigger value="conversion">Conversion by stage</TabsTrigger>
          <TabsTrigger value="agent">Sales manager performance</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-up status</TabsTrigger>
          <TabsTrigger value="referrers">Referrers</TabsTrigger>
          <TabsTrigger value="velocity">Pipeline velocity</TabsTrigger>
          <TabsTrigger value="conversion-timeline">Conversion timeline</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="full-analysis">Full analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="pt-4">
          <QueryBuilder
            leads={leads}
            leadSources={leadSources}
            propertyTypes={propertyTypes}
            agents={agents}
            savedQueries={savedQueries}
          />
        </TabsContent>
        <TabsContent value="source" className="pt-4">
          <SourcePerformanceReport leads={leads} />
        </TabsContent>
        <TabsContent value="conversion" className="pt-4">
          <ConversionByStageReport leads={leads} />
        </TabsContent>
        <TabsContent value="agent" className="pt-4">
          <AgentPerformanceReport leads={leads} />
        </TabsContent>
        <TabsContent value="follow-ups" className="pt-4">
          <FollowUpStatusReport leads={leads} />
        </TabsContent>
        <TabsContent value="referrers" className="pt-4">
          <ReferrerPerformanceReport leads={leads} />
        </TabsContent>
        <TabsContent value="velocity" className="pt-4">
          <PipelineVelocityReport leads={leads} activitySummaries={activitySummaries} />
        </TabsContent>
        <TabsContent value="conversion-timeline" className="pt-4">
          <ConversionTimelineReport leads={leads} activitySummaries={activitySummaries} />
        </TabsContent>
        <TabsContent value="duplicates" className="pt-4">
          <DuplicateLeadsReport leads={leads} />
        </TabsContent>
        <TabsContent value="marketing" className="pt-4">
          <MarketingReportView leads={leads} activitySummaries={activitySummaries} />
        </TabsContent>
        <TabsContent value="full-analysis" className="pt-4">
          <FullAnalysisReport
            leads={leads}
            activitySummaries={activitySummaries}
            evidenceLeadIds={evidenceLeadIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
