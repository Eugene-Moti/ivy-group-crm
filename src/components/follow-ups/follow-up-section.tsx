import { FollowUpRow } from "@/components/follow-ups/follow-up-row";
import { hexToRgba } from "@/lib/color";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function FollowUpSection({
  title,
  color,
  emptyMessage,
  leads,
  isAdmin,
  selected,
  onToggleSelected,
  onSelectAll,
}: {
  title: string;
  color: string;
  emptyMessage: string;
  leads: LeadWithRelations[];
  isAdmin: boolean;
  selected?: Set<string>;
  onToggleSelected?: (leadId: string) => void;
  onSelectAll?: (leadIds: string[], select: boolean) => void;
}) {
  const allSelected =
    !!selected && leads.length > 0 && leads.every((l) => selected.has(l.id));

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
        {isAdmin && onSelectAll && leads.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onSelectAll(
                leads.map((l) => l.id),
                !allSelected
              )
            }
            className="text-xs text-muted-foreground hover:text-gold hover:underline"
          >
            {allSelected ? "Deselect all" : `Select all ${title.toLowerCase()}`}
          </button>
        )}
      </div>

      {leads.length ? (
        <div className="space-y-2">
          {leads.map((lead) => (
            <FollowUpRow
              key={lead.id}
              lead={lead}
              isAdmin={isAdmin}
              selected={selected?.has(lead.id)}
              onToggleSelected={onToggleSelected}
            />
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
