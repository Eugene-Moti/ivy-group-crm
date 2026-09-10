"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { PrivateAccessLogRow } from "@/lib/queries/private-leads";

const ACTION_LABELS: Record<string, string> = {
  unlock_biometric: "Unlocked (biometric)",
  unlock_pin: "Unlocked (PIN)",
  unlock_failed: "Failed unlock",
  lock: "Locked",
  view_client: "Opened a client",
  create_client: "Created a client",
  update_client: "Edited a client",
  move_in: "Moved a client into Private",
  move_out: "Returned a client to the pipeline",
  pin_set: "Set / changed PIN",
  biometric_registered: "Registered a device",
  biometric_removed: "Removed a device",
  access_granted: "Granted access",
  access_revoked: "Revoked access",
};

function actorLabel(r: PrivateAccessLogRow) {
  return r.actor?.display_name || r.actor?.full_name || r.actor?.email || "Unknown";
}

function targetLabel(r: PrivateAccessLogRow) {
  if (r.lead) return r.lead.codename || `${r.lead.first_name} ${r.lead.last_name}`.trim();
  return "—";
}

export function PrivateAccessLogTable({ rows }: { rows: PrivateAccessLogRow[] }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3">
        <div>
          <h2 className="font-semibold">Access log</h2>
          <p className="text-sm text-muted-foreground">
            Every unlock, client open, and access change. Visible only to you.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Nothing logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(r.at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{actorLabel(r)}</TableCell>
                    <TableCell>{ACTION_LABELS[r.action] ?? r.action}</TableCell>
                    <TableCell>{targetLabel(r)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
