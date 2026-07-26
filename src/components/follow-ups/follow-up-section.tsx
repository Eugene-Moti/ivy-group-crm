import { FollowUpRow } from "@/components/follow-ups/follow-up-row";
import { hexToRgba } from "@/lib/color";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function FollowUpSection({
  title,
  color,
  emptyMessage,
  leads,
  isAdmin,
}: {
  title: string;
  color: string;
  emptyMessage: string;
  leads: LeadWithRelations[];
  isAdmin: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight" style={{ color }}>
          {title}
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: hexToRgba(color, 0.15), color }}
        >
          {leads.length}
        </span>
      </div>

      {leads.length ? (
        <div className="space-y-2">
          {leads.map((lead) => (
            <FollowUpRow key={lead.id} lead={lead} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
