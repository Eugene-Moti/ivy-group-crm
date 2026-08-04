"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/shared/export-buttons";
import { findAllDuplicateClusters } from "@/lib/duplicate-leads";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function DuplicateLeadsReport({ leads }: { leads: LeadWithRelations[] }) {
  const clusters = useMemo(() => findAllDuplicateClusters(leads), [leads]);

  const rows = useMemo(
    () =>
      clusters.flatMap((cluster, clusterIndex) =>
        cluster.leads.map((lead) => ({
          group: clusterIndex + 1,
          matchedOn: cluster.field === "phone" ? "Phone" : "Email",
          matchedValue: cluster.key,
          id: lead.id,
          name: fullName(lead),
          status: lead.status,
          manager: lead.assigned_agent?.name ?? "Unassigned",
          phone: lead.phone ?? "—",
          email: lead.email ?? "—",
        }))
      ),
    [clusters]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Leads sharing a phone number or email, after normalizing formatting
          differences (spaces, dashes, +254/0 prefixes, casing) — a possible
          sign the same client was entered more than once, under different
          names. This is a heads-up for review, not an automatic merge.
        </p>
        <ExportButtons
          data={rows}
          columns={[
            { key: "group", label: "Group" },
            { key: "matchedOn", label: "Matched on" },
            { key: "matchedValue", label: "Matched value" },
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "manager", label: "Sales manager" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
          ]}
          filename="ivy-group-possible-duplicates"
          title="Possible Duplicate Leads"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Matched on</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sales manager</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={`${row.group}-${row.id}`}
                  className={row.group % 2 === 0 ? "bg-muted/30" : undefined}
                >
                  <TableCell>
                    <Badge variant="outline">#{row.group}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.matchedOn} · {row.matchedValue}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/leads/${row.id}`} className="hover:text-gold hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.manager}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.email}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No possible duplicates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
