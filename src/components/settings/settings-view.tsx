"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadSourcesPanel } from "@/components/settings/lead-sources-panel";
import { ProjectsPanel } from "@/components/settings/projects-panel";
import { SalesAgentsPanel } from "@/components/settings/sales-agents-panel";
import { CampaignsPanel } from "@/components/settings/campaigns-panel";
import { UsersPanel } from "@/components/settings/users-panel";
import { ColumnLabelsPanel } from "@/components/settings/column-labels-panel";
import { PipelineStagesPanel } from "@/components/settings/pipeline-stages-panel";
import type { CampaignWithSource, LeadColumnLabels, ProfileRow } from "@/lib/queries/settings";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type SalesAgent = { id: string; name: string; phone: string | null; email: string | null };

export function SettingsView({
  leadSources,
  propertyTypes,
  salesAgents,
  campaigns,
  profiles,
  columnLabels,
}: {
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  salesAgents: SalesAgent[];
  campaigns: CampaignWithSource[];
  profiles: ProfileRow[];
  columnLabels: LeadColumnLabels;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage lead sources, projects, sales managers, campaigns, and
          user roles.
        </p>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Lead sources</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="sales-agents">Sales managers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="columns">Column labels</TabsTrigger>
          <TabsTrigger value="statuses">Pipeline stages</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="pt-4">
          <LeadSourcesPanel leadSources={leadSources} />
        </TabsContent>
        <TabsContent value="projects" className="pt-4">
          <ProjectsPanel projects={propertyTypes} />
        </TabsContent>
        <TabsContent value="sales-agents" className="pt-4">
          <SalesAgentsPanel salesAgents={salesAgents} />
        </TabsContent>
        <TabsContent value="campaigns" className="pt-4">
          <CampaignsPanel campaigns={campaigns} leadSources={leadSources} />
        </TabsContent>
        <TabsContent value="users" className="pt-4">
          <UsersPanel profiles={profiles} />
        </TabsContent>
        <TabsContent value="columns" className="pt-4">
          <ColumnLabelsPanel columnLabels={columnLabels} />
        </TabsContent>
        <TabsContent value="statuses" className="pt-4">
          <PipelineStagesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
