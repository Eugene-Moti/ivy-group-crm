import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import { RescheduleFollowUpPopover } from "@/components/leads/reschedule-follow-up-popover";
import type { LeadWithRelations } from "@/lib/queries/leads";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function LeadProfileView({
  lead,
  isAdmin,
}: {
  lead: LeadWithRelations;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardContent className="divide-y divide-border">
        <Row label="Lead type" value={lead.lead_type} />
        {lead.referred_by && (
          <Row
            label="Referred by"
            value={
              <Link
                href={`/leads/${lead.referred_by.id}`}
                className="hover:text-gold hover:underline"
              >
                {fullName(lead.referred_by)}
              </Link>
            }
          />
        )}
        <Row label="Source" value={lead.lead_source?.name ?? "—"} />
        <Row label="Property type" value={lead.property_type?.name ?? "—"} />
        <Row label="Preferred area" value={lead.preferred_area ?? "—"} />
        <Row
          label="Budget"
          value={formatBudgetRange(lead.budget_min, lead.budget_max)}
        />
        <Row label="Bedrooms" value={lead.bedrooms ?? "—"} />
        <Row
          label="Sales manager"
          value={lead.assigned_agent?.name ?? "Unassigned"}
        />
        <Row label="Last contact" value={formatDate(lead.last_contact_at)} />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <span className="text-sm text-muted-foreground">Next follow-up</span>
          <RescheduleFollowUpPopover
            leadId={lead.id}
            status={lead.status}
            nextFollowUpAt={lead.next_follow_up_at}
            readOnly={!isAdmin}
          />
        </div>
        {lead.notes && (
          <div className="py-2.5">
            <span className="text-sm text-muted-foreground">Notes</span>
            <p className="mt-1 text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
