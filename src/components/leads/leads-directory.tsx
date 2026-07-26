"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, TableIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsKanban } from "@/components/leads/kanban/leads-kanban";
import type { LeadWithRelations } from "@/lib/queries/leads";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

export function LeadsDirectory({
  leads,
  leadSources,
  propertyTypes,
  agents,
}: {
  leads: LeadWithRelations[];
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
}) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"table" | "kanban">("table");
  useRealtimeLeadsRefresh();

  const shouldAutoOpenCreate = isAdmin && searchParams.get("new") === "1";
  const initialStatusFilter = searchParams.get("status") ?? undefined;

  useEffect(() => {
    if (shouldAutoOpenCreate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- switching to the Table tab in response to an external ?new=1 navigation signal (e.g. from the command palette), not derived render state
      setView("table");
      router.replace("/leads");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the initial ?new=1, not subsequent router/searchParams identity changes
  }, []);

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon className="size-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <LayoutGrid className="size-4" />
            Kanban
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "table" ? (
        <LeadsTable
          leads={leads}
          leadSources={leadSources}
          propertyTypes={propertyTypes}
          agents={agents}
          autoOpenCreate={shouldAutoOpenCreate}
          initialStatusFilter={initialStatusFilter}
        />
      ) : (
        <LeadsKanban leads={leads} isAdmin={isAdmin} />
      )}
    </div>
  );
}
