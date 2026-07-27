"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadSourcesPanel } from "@/components/settings/lead-sources-panel";
import { PropertyTypesPanel } from "@/components/settings/property-types-panel";
import { SalesAgentsPanel } from "@/components/settings/sales-agents-panel";
import { CampaignsPanel } from "@/components/settings/campaigns-panel";
import { UsersPanel } from "@/components/settings/users-panel";
import { ColumnLabelsPanel } from "@/components/settings/column-labels-panel";
import { StatusLabelsPanel } from "@/components/settings/status-labels-panel";
import type { CampaignWithSource, LeadColumnLabels, ProfileRow } from "@/lib/queries/settings";

type LeadOption = { id: string; name: string };
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
  propertyTypes: LeadOption[];
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
          Manage lead sources, property types, sales agents, campaigns, and
          user roles.
        </p>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Lead sources</TabsTrigger>
          <TabsTrigger value="property-types">Property types</TabsTrigger>
          <TabsTrigger value="sales-agents">Sales agents</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="columns">Column labels</TabsTrigger>
          <TabsTrigger value="statuses">Status labels</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="pt-4">
          <LeadSourcesPanel leadSources={leadSources} />
        </TabsContent>
        <TabsContent value="property-types" className="pt-4">
          <PropertyTypesPanel propertyTypes={propertyTypes} />
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
          <StatusLabelsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
