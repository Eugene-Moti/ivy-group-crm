import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function ReferredLeadsList({ leads }: { leads: LeadWithRelations[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Clients referred by this agent
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {leads.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No clients linked to this agent yet — agents don&apos;t always share
            client details, so this may just not be recorded.
          </p>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{fullName(lead)}</span>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={lead.priority} />
                <StatusBadge status={lead.status} />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
