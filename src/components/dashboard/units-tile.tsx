"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TileHead, ViewToggle, formatKESCompact } from "@/components/dashboard/tile-parts";
import { formatKES, formatDate } from "@/lib/format";
import type { ProjectUnits } from "@/lib/dashboard-metrics";

const MAX_DOTS = 72;

/**
 * Unit inventory, one row of squares per project — one square per unit
 * sold. Reserved and available units join this grid once the Inventory
 * module records each project's full stock; until then it is honest about
 * showing sales only.
 */
export function UnitsTile({ projects }: { projects: ProjectUnits[] }) {
  const [view, setView] = useState<"units" | "table">("units");
  const sold = projects.reduce((s, p) => s + p.units.length, 0);

  return (
    <Card className="orion-solid h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <TileHead title="Unit inventory">
          <ViewToggle
            label="Inventory view"
            value={view}
            onChange={setView}
            options={[
              { value: "units", label: "Units" },
              { value: "table", label: "Table" },
            ]}
          />
        </TileHead>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded-[3px] bg-[var(--chart-1)]" /> Sold <b className="font-semibold text-foreground tabular-nums">{sold}</b>
          </span>
          <span className="flex items-center gap-1.5 opacity-60">
            <i className="orion-hatch size-3 rounded-[3px]" /> Reserved
          </span>
          <span className="flex items-center gap-1.5 opacity-60">
            <i className="size-3 rounded-[3px] border border-foreground/30" /> Available
          </span>
        </div>

        {sold === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No unit sales recorded yet. Each sale you record shows up here as a square.
          </p>
        ) : view === "units" ? (
          <div className="flex flex-col gap-3.5">
            {projects.map((p, pi) => (
              <div key={p.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <b className="font-semibold">
                    {p.name} · {p.units.length} {p.units.length === 1 ? "unit" : "units"} sold
                  </b>
                  <span className="text-muted-foreground tabular-nums">{formatKESCompact(p.value)}</span>
                </div>
                <ul className="flex flex-wrap gap-[3px]" aria-label={`${p.name}: ${p.units.length} units sold`}>
                  {p.units.slice(0, MAX_DOTS).map((u, i) => (
                    <motion.li
                      key={`${u.number}-${i}`}
                      title={`Unit ${u.number} · ${formatKES(u.amount)} · sold ${formatDate(u.soldAt)}`}
                      className="size-3.5 rounded-[4px] bg-[var(--chart-1)] transition-transform hover:scale-125 hover:ring-2 hover:ring-gold/70"
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + pi * 0.12 + i * 0.012, type: "spring", stiffness: 520, damping: 26 }}
                    />
                  ))}
                  {p.units.length > MAX_DOTS && (
                    <li className="ml-1 self-center text-[11px] text-muted-foreground">+{p.units.length - MAX_DOTS} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Units sold per project</caption>
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground">
                <th className="pb-1.5 font-medium">Project</th>
                <th className="pb-1.5 text-right font-medium">Sold</th>
                <th className="pb-1.5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{p.units.length}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{formatKES(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-auto text-[11px] text-muted-foreground">
          Reserved and available units appear once the <b className="font-medium text-foreground/80">Inventory module</b> (coming soon) holds each project&apos;s full stock.
        </p>
      </CardContent>
    </Card>
  );
}
