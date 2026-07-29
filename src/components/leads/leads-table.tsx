"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Flame,
  Plus,
  Search,
  Send,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { getLeadColumns } from "@/components/leads/lead-columns";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { BulkDeleteLeadsDialog } from "@/components/leads/bulk-delete-leads-dialog";
import { BulkAssignAgentDialog } from "@/components/leads/bulk-assign-agent-dialog";
import { BulkSendToAgentDialog } from "@/components/leads/bulk-send-to-agent-dialog";
import { BulkChangePriorityDialog } from "@/components/leads/bulk-change-priority-dialog";
import { ExportButtons } from "@/components/shared/export-buttons";
import { DEFAULT_LEAD_COLUMN_LABELS, LEAD_PRIORITIES, LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { LeadColumnLabels } from "@/lib/queries/settings";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };
type AgentLeadOption = { id: string; first_name: string; last_name: string };

const ALL = "all";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function LeadsTable({
  leads,
  leadSources,
  propertyTypes,
  agents,
  agentLeads,
  autoOpenCreate,
  initialStatusFilter,
  columnLabels = DEFAULT_LEAD_COLUMN_LABELS,
}: {
  leads: LeadWithRelations[];
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  autoOpenCreate?: boolean;
  initialStatusFilter?: string;
  columnLabels?: LeadColumnLabels;
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const statusLabels = useStatusLabels();

  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [agentFilter, setAgentFilter] = useState(ALL);
  const [leadTypeFilter, setLeadTypeFilter] = useState(ALL);
  const [areaFilter, setAreaFilter] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithRelations | undefined>();
  const [deletingLead, setDeletingLead] = useState<LeadWithRelations | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);

  useEffect(() => {
    if (autoOpenCreate) {
      setEditingLead(undefined);
      setFormOpen(true);
    }
  }, [autoOpenCreate]);

  const areas = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.preferred_area).filter((a): a is string => !!a))
      ).sort(),
    [leads]
  );

  const hasActiveFilters = Boolean(
    globalSearch ||
      statusFilter !== ALL ||
      sourceFilter !== ALL ||
      priorityFilter !== ALL ||
      agentFilter !== ALL ||
      leadTypeFilter !== ALL ||
      (areaFilter && areaFilter !== ALL) ||
      budgetMin ||
      budgetMax
  );

  function clearFilters() {
    setGlobalSearch("");
    setStatusFilter(ALL);
    setSourceFilter(ALL);
    setPriorityFilter(ALL);
    setAgentFilter(ALL);
    setLeadTypeFilter(ALL);
    setAreaFilter(ALL);
    setBudgetMin("");
    setBudgetMax("");
  }

  const filteredLeads = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    const min = budgetMin ? Number(budgetMin) : undefined;
    const max = budgetMax ? Number(budgetMax) : undefined;

    return leads.filter((lead) => {
      if (search) {
        const haystack = [
          lead.first_name,
          lead.last_name,
          lead.phone,
          lead.email,
          lead.preferred_area,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (statusFilter !== ALL && lead.status !== statusFilter) return false;
      if (priorityFilter !== ALL && lead.priority !== priorityFilter) return false;
      if (sourceFilter !== ALL && lead.lead_source_id !== sourceFilter) return false;
      if (agentFilter !== ALL && lead.assigned_to !== agentFilter) return false;
      if (leadTypeFilter !== ALL && lead.lead_type !== leadTypeFilter) return false;
      if (areaFilter && areaFilter !== ALL && lead.preferred_area !== areaFilter) return false;
      if (min != null && (lead.budget_max ?? lead.budget_min ?? 0) < min) return false;
      if (max != null && (lead.budget_min ?? lead.budget_max ?? 0) > max) return false;
      return true;
    });
  }, [leads, globalSearch, statusFilter, priorityFilter, sourceFilter, agentFilter, leadTypeFilter, areaFilter, budgetMin, budgetMax]);

  const exportRows = useMemo(
    () =>
      filteredLeads.map((lead) => ({
        name: fullName(lead),
        leadType: lead.lead_type,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        status: statusLabels[lead.status],
        priority: lead.priority,
        source: lead.lead_source?.name ?? "",
        area: lead.preferred_area ?? "",
        budget: formatBudgetRange(lead.budget_min, lead.budget_max),
        agent: lead.assigned_agent?.name ?? "Unassigned",
        created: formatDate(lead.created_at),
      })),
    [filteredLeads, statusLabels]
  );

  const columns = useMemo(
    () =>
      getLeadColumns({
        isAdmin,
        columnLabels,
        onEdit: (lead) => {
          setEditingLead(lead);
          setFormOpen(true);
        },
        onDelete: (lead) => setDeletingLead(lead),
      }),
    [isAdmin, columnLabels]
  );

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting, columnVisibility, columnFilters, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: isAdmin,
    getRowId: (lead) => lead.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedLeads = table.getSelectedRowModel().rows.map((row) => row.original);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, email, area…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {columnLabels[col.id as keyof LeadColumnLabels] ??
                      col.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ExportButtons
            data={exportRows}
            columns={[
              { key: "name", label: "Name" },
              { key: "leadType", label: "Lead type" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "status", label: "Status" },
              { key: "priority", label: "Priority" },
              { key: "source", label: "Source" },
              { key: "area", label: "Area" },
              { key: "budget", label: "Budget" },
              { key: "agent", label: "Sales manager" },
              { key: "created", label: "Date of inquiry" },
            ]}
            filename="ivy-group-leads"
            title="Leads"
            formats={["csv", "excel"]}
          />

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingLead(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add lead
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              {leadSources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              {LEAD_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Sales manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sales managers</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="Lead type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All lead types</SelectItem>
              {LEAD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={areaFilter || ALL} onValueChange={setAreaFilter}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All areas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min KES"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className="w-28"
          />
          <Input
            type="number"
            placeholder="Max KES"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className="w-28"
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>

        {isAdmin && selectedLeads.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
            <span className="text-sm font-medium">
              {selectedLeads.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                Clear selection
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(true)}>
                <UserCog className="size-3.5" />
                Assign manager
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkPriorityOpen(true)}>
                <Flame className="size-3.5" />
                Change priority
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkSendOpen(true)}>
                <Send className="size-3.5" />
                Send to manager
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDir === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : sortDir === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No leads match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {filteredLeads.length} lead{filteredLeads.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination({ pageIndex: 0, pageSize: Number(v) })
              }
            >
              <SelectTrigger size="sm" className="w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {isAdmin && (
        <>
          <LeadFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            lead={editingLead}
            leadSources={leadSources}
            propertyTypes={propertyTypes}
            agents={agents}
            agentLeads={agentLeads}
            onSaved={() => router.refresh()}
          />
          <DeleteLeadDialog
            open={!!deletingLead}
            onOpenChange={(open) => !open && setDeletingLead(null)}
            lead={deletingLead}
            onDeleted={() => router.refresh()}
          />
          <BulkDeleteLeadsDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            leadIds={selectedLeads.map((lead) => lead.id)}
            onDeleted={() => {
              setRowSelection({});
              router.refresh();
            }}
          />
          <BulkAssignAgentDialog
            open={bulkAssignOpen}
            onOpenChange={setBulkAssignOpen}
            leadIds={selectedLeads.map((lead) => lead.id)}
            agents={agents}
            onAssigned={() => {
              setRowSelection({});
              router.refresh();
            }}
          />
          <BulkSendToAgentDialog
            open={bulkSendOpen}
            onOpenChange={setBulkSendOpen}
            leads={selectedLeads}
            agents={agents}
          />
          <BulkChangePriorityDialog
            open={bulkPriorityOpen}
            onOpenChange={setBulkPriorityOpen}
            leadIds={selectedLeads.map((lead) => lead.id)}
            onChanged={() => {
              setRowSelection({});
              router.refresh();
            }}
          />
        </>
      )}
    </div>
  );
}
