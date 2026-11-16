"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TileHead, compactNumber } from "@/components/dashboard/tile-parts";
import { formatKES } from "@/lib/format";
import { initialsFor } from "@/lib/workspace";
import type { ManagerRow } from "@/lib/dashboard-metrics";

// Avatar colours follow the person (hashed from their id), never their rank,
// so nobody changes colour when the order changes.
const AVATAR_COLOURS = ["#1a6a40", "#1f5f99", "#8a6418", "#6b3f8f", "#0f6670", "#a8442a"];
function colourFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

const COLS = "grid-cols-[1.1rem_1.75rem_minmax(0,1fr)_2.25rem_3.75rem] sm:grid-cols-[1.1rem_1.75rem_minmax(0,1fr)_2.25rem_4rem_4.5rem]";

/** Sales managers ranked by the value of units they sold this month. */
export function ManagersTile({ monthLabel, rows }: { monthLabel: string; rows: ManagerRow[] }) {
  return (
    <Card className="orion-solid h-full">
      <CardContent className="flex h-full flex-col gap-2">
        <TileHead title={`Top sales managers · ${monthLabel}`} />
        {rows.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No unit sales recorded this month or last. Record a sale on a Won lead and its sales manager appears here.
          </p>
        ) : (
          <div role="table" aria-label={`Top sales managers, ${monthLabel}`} className="text-[12.5px]">
            <div role="row" className={`grid ${COLS} items-center gap-2.5 pb-1.5 text-[11px] text-muted-foreground`}>
              <span role="columnheader" className="sr-only">Rank</span>
              <span aria-hidden />
              <span role="columnheader">Name</span>
              <span role="columnheader" className="text-right">Won</span>
              <span role="columnheader" className="text-right">Value</span>
              <span role="columnheader" className="hidden sm:block">Share</span>
            </div>
            {rows.map((r, i) => (
              <motion.div
                role="row"
                key={r.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`grid ${COLS} items-center gap-2.5 border-t border-border/60 py-1.5`}
              >
                <span role="cell" className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <span
                  aria-hidden
                  className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: colourFor(r.id) }}
                >
                  {initialsFor(r.name)}
                </span>
                <span role="cell" className="truncate font-semibold">{r.name}</span>
                <span role="cell" className="text-right font-mono tabular-nums">{r.won}</span>
                <span role="cell" className="text-right font-mono tabular-nums" title={formatKES(r.value)}>{compactNumber(r.value)}</span>
                <span role="cell" className="hidden h-1.5 overflow-hidden rounded-full bg-foreground/10 sm:block" title={`${(r.share * 100).toFixed(1)}% of the month's sales`}>
                  <motion.span
                    className="block h-full rounded-full bg-[var(--chart-1)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${r.share * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
