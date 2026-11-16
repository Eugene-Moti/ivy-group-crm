"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadSourcesPanel } from "@/components/settings/lead-sources-panel";
import { ProjectsPanel } from "@/components/settings/projects-panel";
import { SalesAgentsPanel } from "@/components/settings/sales-agents-panel";
import { CampaignsPanel } from "@/components/settings/campaigns-panel";
import { UsersPanel } from "@/components/settings/users-panel";
import { ColumnLabelsPanel } from "@/components/settings/column-labels-panel";
import { PipelineStagesPanel } from "@/components/settings/pipeline-stages-panel";
import { ASK_ORION_ENABLED } from "@/lib/features";
import { WorkspacePanel } from "@/components/settings/workspace-panel";
import type { Workspace } from "@/lib/workspace";
import { OrionContextPanel } from "@/components/settings/orion-context-panel";
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
  orionContext,
  workspace,
}: {
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  salesAgents: SalesAgent[];
  campaigns: CampaignWithSource[];
  profiles: ProfileRow[];
  columnLabels: LeadColumnLabels;
  orionContext: string;
  workspace: Workspace;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your workspace branding, lead sources, projects, sales managers,
          campaigns, pipeline stages, and user roles.
        </p>
      </div>

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="sources">Lead sources</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="sales-agents">Sales managers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="columns">Column labels</TabsTrigger>
          <TabsTrigger value="statuses">Pipeline stages</TabsTrigger>
          {ASK_ORION_ENABLED && <TabsTrigger value="orion">Teach Orion</TabsTrigger>}
        </TabsList>
        <TabsContent value="workspace" className="pt-4">
          <WorkspacePanel workspace={workspace} />
        </TabsContent>
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
        {ASK_ORION_ENABLED && (
          <TabsContent value="orion" className="pt-4">
            <OrionContextPanel initialContent={orionContext} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
