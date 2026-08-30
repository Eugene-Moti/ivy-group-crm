"use client";

import { useMemo, useState } from "react";
import { FileDown, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { computeMarketingReport, type MarketingLeadRow } from "@/lib/marketing-report";
import { generateMarketingReport } from "@/lib/marketing-pdf-report";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function MarketingReportView({ leads }: { leads: LeadWithRelations[] }) {
  const statusLabels = useStatusLabels();
  const profile = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  const report = useMemo(() => computeMarketingReport(leads, statusLabels), [leads, statusLabels]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Negotiating" value={report.negotiatingCount} />
        <Stat label="At offer stage" value={report.offerStageCount} />
        <Stat label="Site visits booked" value={report.siteVisitCount} />
        <Stat label="Best-converting source" value={report.topSource?.source ?? "—"} />
      </div>

      <MarketingTable title="Negotiating" rows={report.negotiating} />
      <MarketingTable title="At offer stage" rows={report.offerStage} />
      <MarketingTable title="Site visits / meetings booked" rows={report.siteVisits} />

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

      <div className="space-y-2">
        <p className="text-sm font-medium">Leads assigned per sales manager</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales manager</TableHead>
                <TableHead>Direct clients</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.managerBreakdown.length ? (
                report.managerBreakdown.map((m) => (
                  <TableRow key={m.managerName}>
                    <TableCell className="font-medium">{m.managerName}</TableCell>
                    <TableCell>{m.directClientCount}</TableCell>
                    <TableCell>{m.agentCount}</TableCell>
                    <TableCell>{m.total}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No active leads yet.
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </p>
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
