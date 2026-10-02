import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

/** Newer leads explicitly linked as this client buying again (a different project/unit) — only rendered when there's at least one, since most leads never have one. */
export function RepeatLeadsList({ leads }: { leads: LeadWithRelations[] }) {
  if (leads.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <RefreshCw className="size-3.5" />
          This client came back
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
          >
            <span className="text-sm font-medium">
              {fullName(lead)}
              {lead.property_type?.name && (
                <span className="font-normal text-muted-foreground"> — {lead.property_type.name}</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={lead.priority} />
              <StatusBadge status={lead.status} />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
