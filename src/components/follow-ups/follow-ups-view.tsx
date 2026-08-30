"use client";

import { useMemo, useState } from "react";
import { CalendarClock, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useIsAdmin, useProfile } from "@/components/providers/profile-provider";
import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { FollowUpSection } from "@/components/follow-ups/follow-up-section";
import { BulkRescheduleDialog } from "@/components/leads/bulk-reschedule-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOLLOW_UP_ALERT_COLORS } from "@/lib/leads";
import { composeReportTitle } from "@/lib/report-metrics";
import { generateFollowUpReport } from "@/lib/follow-up-report";
import type { LeadWithRelations } from "@/lib/queries/leads";

type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

const ALL = "all";

export function FollowUpsView({
  overdue,
  dueToday,
  upcoming,
  agents,
}: {
  overdue: LeadWithRelations[];
  dueToday: LeadWithRelations[];
  upcoming: LeadWithRelations[];
  agents: AgentOption[];
}) {
  const isAdmin = useIsAdmin();
  const profile = useProfile();
  useRealtimeLeadsRefresh();

  const [agentFilter, setAgentFilter] = useState(ALL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);

  function toggleSelected(leadId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function selectMany(leadIds: string[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of leadIds) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const filteredOverdue = useMemo(
    () => (agentFilter === ALL ? overdue : overdue.filter((l) => l.assigned_to === agentFilter)),
    [overdue, agentFilter]
  );
  const filteredDueToday = useMemo(
    () => (agentFilter === ALL ? dueToday : dueToday.filter((l) => l.assigned_to === agentFilter)),
    [dueToday, agentFilter]
  );
  const filteredUpcoming = useMemo(
    () => (agentFilter === ALL ? upcoming : upcoming.filter((l) => l.assigned_to === agentFilter)),
    [upcoming, agentFilter]
  );

  const reportTitle = useMemo(
    () =>
      composeReportTitle({
        agentName: agentFilter !== ALL ? agents.find((a) => a.id === agentFilter)?.name : undefined,
        baseName: "Follow-up Schedule",
      }),
    [agentFilter, agents]
  );

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      await generateFollowUpReport({
        reportTitle,
        overdue: filteredOverdue,
        dueToday: filteredDueToday,
        upcoming: filteredUpcoming,
        generatedByName: profile?.full_name ?? null,
      });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">
            Every open lead with a follow-up due now or in the next 7 days.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="Sales manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sales managers</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleGeneratePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
              Generate PDF
            </Button>
          </div>
        )}
      </div>

      {isAdmin && selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkRescheduleOpen(true)}>
              <CalendarClock className="size-3.5" />
              Reschedule
            </Button>
          </div>
        </div>
      )}

      <FollowUpSection
        title="Overdue"
        color={FOLLOW_UP_ALERT_COLORS.Overdue}
        emptyMessage="No overdue follow-ups. Nice work."
        leads={filteredOverdue}
        isAdmin={isAdmin}
        selected={selected}
        onToggleSelected={toggleSelected}
        onSelectAll={selectMany}
      />
      <FollowUpSection
        title="Due today"
        color={FOLLOW_UP_ALERT_COLORS["Due Soon"]}
        emptyMessage="Nothing due today."
        leads={filteredDueToday}
        isAdmin={isAdmin}
        selected={selected}
        onToggleSelected={toggleSelected}
        onSelectAll={selectMany}
      />
      <FollowUpSection
        title="Upcoming (next 7 days)"
        color={FOLLOW_UP_ALERT_COLORS["On Track"]}
        emptyMessage="Nothing on the horizon this week."
        leads={filteredUpcoming}
        isAdmin={isAdmin}
        selected={selected}
        onToggleSelected={toggleSelected}
        onSelectAll={selectMany}
      />

      {isAdmin && (
        <BulkRescheduleDialog
          open={bulkRescheduleOpen}
          onOpenChange={setBulkRescheduleOpen}
          leadIds={Array.from(selected)}
          onChanged={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
