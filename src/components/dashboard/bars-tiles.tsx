"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BarRows, TileHead } from "@/components/dashboard/tile-parts";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { LOST_STATUS_KEY, WON_STATUS_KEY } from "@/lib/constants";

/**
 * Leads in each pipeline stage right now. One colour for the journey,
 * gold for Closed – Won (the goal), grey for Closed – Lost.
 */
export function PipelineTile({ data }: { data: { status: string; count: number }[] }) {
  const labels = useStatusLabels();
  const rows = data.map((d) => ({
    key: d.status,
    label: labels[d.status] ?? d.status,
    value: d.count,
    color: d.status === WON_STATUS_KEY ? "var(--gold)" : d.status === LOST_STATUS_KEY ? "color-mix(in oklab, var(--muted-foreground) 55%, transparent)" : undefined,
  }));
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <TileHead title="Pipeline by stage · leads today">
          <Link href="/leads" className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Open board →
          </Link>
        </TileHead>
        <BarRows rows={rows} labelWidth="7.5rem" unit="leads" />
      </CardContent>
    </Card>
  );
}

export function SourcesTile({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <TileHead title="Where leads came from" />
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          <BarRows rows={data.map((d) => ({ key: d.name, label: d.name, value: d.count }))} labelWidth="6.5rem" unit="leads" />
        )}
      </CardContent>
    </Card>
  );
}
