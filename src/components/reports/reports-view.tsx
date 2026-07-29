"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryBuilder } from "@/components/reports/query-builder";
import { SourcePerformanceReport } from "@/components/reports/source-performance-report";
import { ConversionByStageReport } from "@/components/reports/conversion-by-stage-report";
import { AgentPerformanceReport } from "@/components/reports/agent-performance-report";
import { FollowUpStatusReport } from "@/components/reports/follow-up-status-report";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { SavedQueryRow } from "@/lib/queries/saved-queries";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

const VALID_TABS = ["builder", "source", "conversion", "agent", "follow-ups"];

export function ReportsView({
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
      </Tabs>
    </div>
  );
}
