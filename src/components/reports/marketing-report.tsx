"use client";

import { useMemo, useState } from "react";
import { FileDown, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { computeMarketingReport, type MarketingLeadRow } from "@/lib/marketing-report";
import { generateMarketingReport } from "@/lib/marketing-pdf-report";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";

export function MarketingReportView({
  leads,
  activitySummaries,
}: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
}) {
  const statusLabels = useStatusLabels();
  const profile = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  const report = useMemo(
    () => computeMarketingReport(leads, activitySummaries, statusLabels),
    [leads, activitySummaries, statusLabels]
  );

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      await generateMarketingReport({ report, generatedByName: profile?.full_name ?? null });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm max-w-2xl">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
          <p>
            Safe to share outside the sales team — phone numbers, emails, and budgets
            are never included here, even though names, projects, and sources are.
          </p>
        </div>
        <Button size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
          Generate PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Active leads" value={String(report.totalActive)} />
        <Stat label="Hot leads" value={String(report.hotCount)} />
        <Stat label="Negotiating" value={String(report.negotiatingCount)} />
        <Stat label="At offer stage" value={String(report.offerStageCount)} />
        <Stat label="Best-converting source" value={report.topSource?.source ?? "—"} />
      </div>

      <MarketingTable title="Hot leads" rows={report.hotLeads} />
      <MarketingTable title="Promising — hot and recently in contact" rows={report.promising} />
      <MarketingTable title="Negotiating" rows={report.negotiating} />
      <MarketingTable title="At offer stage" rows={report.offerStage} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Source performance</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Total leads</TableHead>
                <TableHead>Closed won</TableHead>
                <TableHead>Win rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sourcePerformance.length ? (
                report.sourcePerformance.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="font-medium">{s.source}</TableCell>
                    <TableCell>{s.total}</TableCell>
                    <TableCell>{s.won}</TableCell>
                    <TableCell>{s.winRate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No leads yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MarketingTable({ title, rows }: { title: string; rows: MarketingLeadRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Sales manager</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.leadType}</TableCell>
                  <TableCell>{row.project}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <TableCell>{row.statusLabel}</TableCell>
                  <TableCell>{row.managerName}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                  None right now.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
