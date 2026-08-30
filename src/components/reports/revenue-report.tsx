"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { WON_STATUS_KEY } from "@/lib/constants";
import { formatKES, fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

/**
 * Actual closing figures on Won deals — deal value, agency commission, and
 * what's owed to (and paid out to) referring agents. None of these fields
 * are required to mark a lead Won, so this report is only ever as complete
 * as what's been filled in — the missing-deal-value callout exists so that
 * gap is visible rather than silently undercounting revenue.
 */
export function RevenueReport({ leads }: { leads: LeadWithRelations[] }) {
  const wonLeads = useMemo(() => leads.filter((l) => l.status === WON_STATUS_KEY), [leads]);

  const totals = useMemo(() => {
    const dealValue = wonLeads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
    const commission = wonLeads.reduce((sum, l) => sum + (l.commission_amount ?? 0), 0);
    const referralOwed = wonLeads.reduce((sum, l) => sum + (l.referral_fee_amount ?? 0), 0);
    const referralPaid = wonLeads
      .filter((l) => l.referral_fee_paid)
      .reduce((sum, l) => sum + (l.referral_fee_amount ?? 0), 0);
    const missingDealValue = wonLeads.filter((l) => l.deal_value == null).length;
    return {
      dealValue,
      commission,
      referralPaid,
      referralUnpaid: referralOwed - referralPaid,
      missingDealValue,
    };
  }, [wonLeads]);

  const byManager = useMemo(() => {
    const map = new Map<
      string,
      { name: string; deals: number; dealValue: number; commission: number }
    >();
    for (const l of wonLeads) {
      const name = l.assigned_agent?.name ?? "Unassigned";
      const entry = map.get(name) ?? { name, deals: 0, dealValue: 0, commission: 0 };
      entry.deals += 1;
      entry.dealValue += l.deal_value ?? 0;
      entry.commission += l.commission_amount ?? 0;
      map.set(name, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.dealValue - a.dealValue);
  }, [wonLeads]);

  const referralPayouts = useMemo(
    () => wonLeads.filter((l) => (l.referral_fee_amount ?? 0) > 0),
    [wonLeads]
  );

  const kpis = [
    { label: "Total deal value", value: totals.dealValue },
    { label: "Total commission earned", value: totals.commission },
    { label: "Referral fees paid", value: totals.referralPaid },
    { label: "Referral fees owed (unpaid)", value: totals.referralUnpaid },
  ];

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Actual closing figures on Won deals — deal value, agency commission, and what&apos;s
        owed to referring agents. Only as complete as what&apos;s been filled in on each Won
        lead.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              <AnimatedCounter value={k.value} formatter={formatKES} />
            </p>
          </div>
        ))}
      </div>

      {totals.missingDealValue > 0 && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-foreground">
          {totals.missingDealValue} Won lead{totals.missingDealValue === 1 ? "" : "s"} still
          missing a deal value — the totals above undercount until those are filled in.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">By sales manager</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales manager</TableHead>
                <TableHead>Won deals</TableHead>
                <TableHead>Total deal value</TableHead>
                <TableHead>Total commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byManager.length ? (
                byManager.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.deals}</TableCell>
                    <TableCell>{formatKES(m.dealValue)}</TableCell>
                    <TableCell>{formatKES(m.commission)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No Won deals yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Referral payouts</p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Referred by</TableHead>
                <TableHead>Fee owed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referralPayouts.length ? (
                referralPayouts.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <Link href={`/leads/${l.id}`} className="hover:text-gold hover:underline">
                        {fullName(l)}
                      </Link>
                    </TableCell>
                    <TableCell>{l.referred_by ? fullName(l.referred_by) : "—"}</TableCell>
                    <TableCell>{formatKES(l.referral_fee_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={l.referral_fee_paid ? "outline" : "default"}>
                        {l.referral_fee_paid ? "Paid" : "Owed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No referral fees recorded.
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
