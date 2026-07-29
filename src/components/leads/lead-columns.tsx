"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { FollowUpAlertBadge } from "@/components/badges/follow-up-alert-badge";
import { QuickContactActions } from "@/components/leads/quick-contact-actions";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import { getFollowUpAlert } from "@/lib/leads";
import { DEFAULT_LEAD_COLUMN_LABELS } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { LeadColumnLabels } from "@/lib/queries/settings";

export function getLeadColumns({
  isAdmin,
  columnLabels = DEFAULT_LEAD_COLUMN_LABELS,
  onEdit,
  onDelete,
}: {
  isAdmin: boolean;
  columnLabels?: LeadColumnLabels;
  onEdit: (lead: LeadWithRelations) => void;
  onDelete: (lead: LeadWithRelations) => void;
}): ColumnDef<LeadWithRelations>[] {
  const columns: ColumnDef<LeadWithRelations>[] = [
    ...(isAdmin
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected()
                    ? true
                    : table.getIsSomePageRowsSelected()
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Select all rows on this page"
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Select row"
              />
            ),
            enableSorting: false,
            enableHiding: false,
          } satisfies ColumnDef<LeadWithRelations>,
        ]
      : []),
    {
      id: "name",
      header: columnLabels.name,
      accessorFn: (lead) => fullName(lead),
      cell: ({ row }) => (
        <Link
          href={`/leads/${row.original.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium hover:text-gold hover:underline"
        >
          {fullName(row.original)}
        </Link>
      ),
    },
    {
      id: "lead_type",
      header: columnLabels.lead_type,
      accessorKey: "lead_type",
      cell: ({ row }) =>
        row.original.lead_type === "Real Estate Agent" ? (
          <Badge variant="outline" className="border-gold/40 text-gold">
            Agent
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Direct client</span>
        ),
    },
    {
      id: "phone",
      header: columnLabels.phone,
      accessorKey: "phone",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="text-sm">{row.original.phone || "—"}</span>
          {row.original.phone && (
            <QuickContactActions phone={row.original.phone} email={null} />
          )}
        </div>
      ),
    },
    {
      id: "email",
      header: columnLabels.email,
      accessorKey: "email",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="max-w-40 truncate text-sm">
            {row.original.email || "—"}
          </span>
          {row.original.email && (
            <QuickContactActions phone={null} email={row.original.email} />
          )}
        </div>
      ),
    },
    {
      id: "source",
      header: columnLabels.source,
      accessorFn: (lead) => lead.lead_source?.name ?? "—",
    },
    {
      id: "priority",
      header: columnLabels.priority,
      accessorKey: "priority",
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    },
    {
      id: "status",
      header: columnLabels.status,
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "property_type",
      header: columnLabels.property_type,
      accessorFn: (lead) => lead.property_type?.name ?? "—",
    },
    {
      id: "area",
      header: columnLabels.area,
      accessorFn: (lead) => lead.preferred_area ?? "—",
    },
    {
      id: "budget",
      header: columnLabels.budget,
      accessorFn: (lead) => lead.budget_max ?? lead.budget_min ?? 0,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatBudgetRange(row.original.budget_min, row.original.budget_max)}
        </span>
      ),
    },
    {
      id: "bedrooms",
      header: columnLabels.bedrooms,
      accessorFn: (lead) => lead.bedrooms ?? "—",
    },
    {
      id: "last_contact_at",
      header: columnLabels.last_contact_at,
      accessorKey: "last_contact_at",
      cell: ({ row }) => formatDate(row.original.last_contact_at),
    },
    {
      id: "next_follow_up_at",
      header: columnLabels.next_follow_up_at,
      accessorKey: "next_follow_up_at",
      cell: ({ row }) => {
        const alert = getFollowUpAlert(
          row.original.next_follow_up_at,
          row.original.status
        );
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm">
              {formatDate(row.original.next_follow_up_at)}
            </span>
            <FollowUpAlertBadge alert={alert} />
          </div>
        );
      },
    },
    {
      id: "agent",
      header: columnLabels.agent,
      accessorFn: (lead) => lead.assigned_agent?.name ?? "Unassigned",
    },
    {
      id: "created_at",
      header: columnLabels.created_at,
      accessorKey: "created_at",
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit lead"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete lead"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
