"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { ExportButtons } from "@/components/shared/export-buttons";
import { RecordUnitSaleDialog } from "@/components/leads/record-unit-sale-dialog";
import { generateUnitSalePdf } from "@/lib/unit-sale-pdf";
import { formatDate, formatKES, fullName } from "@/lib/format";
import type { UnitSoldRow } from "@/lib/queries/units-sold";
import type { LeadWithRelations } from "@/lib/queries/leads";

/**
 * Every unit sold, with client/sales manager/referring agent joined in from
 * the linked lead rather than duplicated in units_sold itself — see the
 * migration's own comment for why. 1% of the unit amount for a direct
 * sale, a set amount the sales manager enters by hand for an agent-referred
 * one; the duplicate-unit-number callout is the same "flag it, don't
 * silently trust it" pattern as the Agent Won and Duplicate Leads audits.
 */
export function UnitsSoldReport({
  units,
  leads,
}: {
  units: UnitSoldRow[];
  leads: LeadWithRelations[];
}) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const leadsById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const rows = useMemo(
    () =>
      units.map((u) => {
        const lead = leadsById.get(u.lead_id);
        return {
          ...u,
          clientName: lead ? fullName(lead) : "Unknown lead",
          project: lead?.property_type?.name ?? null,
          salesManager: lead?.assigned_agent?.name ?? "Unassigned",
          agentName: lead?.referred_by ? fullName(lead.referred_by) : null,
        };
      }),
    [units, leadsById]
  );

  const totals = useMemo(() => {
    const unitValue = rows.reduce((s, r) => s + r.unit_amount, 0);
    const bonusPaid = rows.filter((r) => r.bonus_paid).reduce((s, r) => s + r.bonus_amount, 0);
    const bonusUnpaid = rows.filter((r) => !r.bonus_paid).reduce((s, r) => s + r.bonus_amount, 0);
    return { count: rows.length, unitValue, bonusPaid, bonusUnpaid };
  }, [rows]);

  const byManager = useMemo(() => {
    const map = new Map<
      string,
      { name: string; units: number; unitValue: number; bonus: number }
    >();
    for (const r of rows) {
      const entry = map.get(r.salesManager) ?? { name: r.salesManager, units: 0, unitValue: 0, bonus: 0 };
      entry.units += 1;
      entry.unitValue += r.unit_amount;
      entry.bonus += r.bonus_amount;
      map.set(r.salesManager, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.unitValue - a.unitValue);
  }, [rows]);

  const duplicateUnitNumbers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.unit_number, (counts.get(r.unit_number) ?? 0) + 1);
    return Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([n]) => n);
  }, [rows]);

  const kpis: { label: string; value: number; formatter?: (n: number) => string }[] = [
    { label: "Units sold", value: totals.count },
    { label: "Total unit value", value: totals.unitValue, formatter: formatKES },
    { label: "Bonus paid", value: totals.bonusPaid, formatter: formatKES },
    { label: "Bonus outstanding", value: totals.bonusUnpaid, formatter: formatKES },
  ];

  const fullExportRows = rows.map((r) => ({
    unit_number: r.unit_number,
    unit_size: r.unit_size ?? "—",
    project: r.project ?? "—",
    client: r.clientName,
    sale_type: r.sale_type,
    agent: r.agentName ?? "—",
    sales_manager: r.salesManager,
    unit_amount: formatKES(r.unit_amount),
    bonus_amount: formatKES(r.bonus_amount),
    bonus_paid: r.bonus_paid ? "Yes" : "No",
    sold_at: formatDate(r.sold_at),
  }));

  const bonusExportRows = rows.map((r) => ({
    unit_number: r.unit_number,
    sales_manager: r.salesManager,
    sale_type: r.sale_type,
    bonus_amount: formatKES(r.bonus_amount),
    bonus_paid: r.bonus_paid ? "Paid" : "Owed",
    sold_at: formatDate(r.sold_at),
  }));

  async function handleDownloadOne(row: (typeof rows)[number]) {
    setDownloadingId(row.id);
    try {
      await generateUnitSalePdf({
        unitNumber: row.unit_number,
        unitSize: row.unit_size,
        project: row.project,
        clientName: row.clientName,
        saleType: row.sale_type,
        agentName: row.agentName,
        salesManager: row.salesManager,
        unitAmount: row.unit_amount,
        bonusAmount: row.bonus_amount,
        bonusPaid: row.bonus_paid,
        soldAt: row.sold_at,
        notes: row.notes,
      });
    } catch (err) {
      toast.error("Failed to generate PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every unit sold, the client, the sales manager who closed it, and the marketing
          team&apos;s bonus — 1% of the unit amount for a direct sale, a set amount for an
          agent-referred one.
        </p>
        <Button size="sm" onClick={() => setRecordOpen(true)}>
          <Plus className="size-4" />
          Record unit sale
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              <AnimatedCounter value={k.value} formatter={k.formatter} />
            </p>
          </div>
        ))}
      </div>

      {duplicateUnitNumbers.length > 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {duplicateUnitNumbers.length} unit number{duplicateUnitNumbers.length === 1 ? "" : "s"}{" "}
          recorded more than once — worth checking for double entry:{" "}
          {duplicateUnitNumbers.join(", ")}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">By sales manager</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales manager</TableHead>
                <TableHead>Units sold</TableHead>
                <TableHead>Total unit value</TableHead>
                <TableHead>Total bonus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byManager.length ? (
                byManager.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.units}</TableCell>
                    <TableCell>{formatKES(m.unitValue)}</TableCell>
                    <TableCell>{formatKES(m.bonus)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No units sold yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">All units sold</p>
          <div className="flex flex-wrap gap-2">
            <ExportButtons
              data={fullExportRows}
              columns={[
                { key: "unit_number", label: "Unit number" },
                { key: "unit_size", label: "Unit size" },
                { key: "project", label: "Project" },
                { key: "client", label: "Client" },
                { key: "sale_type", label: "Sale type" },
                { key: "agent", label: "Agent" },
                { key: "sales_manager", label: "Sales manager" },
                { key: "unit_amount", label: "Unit amount" },
                { key: "bonus_amount", label: "Bonus" },
                { key: "bonus_paid", label: "Bonus paid" },
                { key: "sold_at", label: "Date sold" },
              ]}
              filename="ivy-group-units-sold"
              title="Units Sold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Bonus payouts only, for finance/payroll:</p>
          <ExportButtons
            data={bonusExportRows}
            columns={[
              { key: "unit_number", label: "Unit number" },
              { key: "sales_manager", label: "Sales manager" },
              { key: "sale_type", label: "Sale type" },
              { key: "bonus_amount", label: "Bonus" },
              { key: "bonus_paid", label: "Status" },
              { key: "sold_at", label: "Date sold" },
            ]}
            filename="ivy-group-bonus-payouts"
            title="Bonus Payouts"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Sale type</TableHead>
                <TableHead>Sales manager</TableHead>
                <TableHead>Unit amount</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={duplicateUnitNumbers.includes(r.unit_number) ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="font-medium">
                      {r.unit_number}
                      {r.unit_size ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">{r.unit_size}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.project ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/leads/${r.lead_id}`} className="hover:text-gold hover:underline">
                        {r.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.sale_type}</Badge>
                      {r.agentName && (
                        <span className="ml-1.5 text-xs text-muted-foreground">via {r.agentName}</span>
                      )}
                    </TableCell>
                    <TableCell>{r.salesManager}</TableCell>
                    <TableCell>{formatKES(r.unit_amount)}</TableCell>
                    <TableCell>{formatKES(r.bonus_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={r.bonus_paid ? "outline" : "default"}>
                        {r.bonus_paid ? "Paid" : "Owed"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(r.sold_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Download ${r.unit_number} sale record`}
                        onClick={() => handleDownloadOne(r)}
                        disabled={downloadingId === r.id}
                      >
                        <FileDown className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No units sold yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <RecordUnitSaleDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        leads={leads}
        onSaved={() => {}}
      />
    </div>
  );
}
