"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/shared/insight-card";
import { useProfile } from "@/components/providers/profile-provider";
import { formatDateTime } from "@/lib/format";
import type { OrionBriefing } from "@/app/api/orion/briefing/route";

export function PortfolioBriefing() {
  const profile = useProfile();
  const [briefing, setBriefing] = useState<OrionBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orion/briefing");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Orion couldn't put the briefing together.");
      setBriefing(data as OrionBriefing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function exportPdf() {
    if (!briefing) return;
    setExporting(true);
    try {
      const { generateOrionBriefingPdf } = await import("@/lib/orion-briefing-pdf");
      await generateOrionBriefingPdf({ briefing, generatedByName: profile?.full_name ?? null });
    } catch {
      toast.error("Couldn't export the PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Sparkles className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Portfolio Briefing</h2>
          </div>
          {briefing && !loading && (
            <p className="mt-1 text-xs text-muted-foreground">Generated {formatDateTime(briefing.generatedAt)}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={exportPdf}
            disabled={!briefing || loading || exporting}
            aria-label="Export as PDF"
          >
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={load}
            disabled={loading}
            aria-label="Refresh briefing"
          >
            <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Orion is reviewing the pipeline…
          </div>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && briefing && (
          <div className="space-y-5">
            {briefing.headline && (
              <p className="text-sm italic text-foreground">{briefing.headline}</p>
            )}

            {briefing.items.length > 0 ? (
              <div className="space-y-2.5">
                {briefing.items.map((item, i) => (
                  <InsightCard key={i} insight={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing notable to flag right now — the pipeline looks steady.
              </p>
            )}

            {briefing.recommendations.length > 0 && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">Recommendations</p>
                <ul className="mt-2 space-y-1.5">
                  {briefing.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="text-gold">—</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
