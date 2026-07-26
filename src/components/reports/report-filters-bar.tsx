"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/constants";
import { ALL, EMPTY_REPORT_FILTERS, type ReportFilters } from "@/lib/report-metrics";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

export function ReportFiltersBar({
  filters,
  onChange,
  leadSources,
  propertyTypes,
  agents,
  areas,
}: {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
  areas: string[];
}) {
  function set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_REPORT_FILTERS[key as keyof ReportFilters]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.source} onValueChange={(v) => set("source", v)}>
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

      <Select value={filters.priority} onValueChange={(v) => set("priority", v)}>
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

      <Select value={filters.agent} onValueChange={(v) => set("agent", v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All agents</SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.propertyTypeId} onValueChange={(v) => set("propertyTypeId", v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Property type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All property types</SelectItem>
          {propertyTypes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.area} onValueChange={(v) => set("area", v)}>
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
        value={filters.budgetMin}
        onChange={(e) => set("budgetMin", e.target.value)}
        className="w-28"
      />
      <Input
        type="number"
        placeholder="Max KES"
        value={filters.budgetMax}
        onChange={(e) => set("budgetMax", e.target.value)}
        className="w-28"
      />

      <Input
        type="date"
        aria-label="Created from"
        value={filters.dateFrom}
        onChange={(e) => set("dateFrom", e.target.value)}
        className="w-36"
      />
      <Input
        type="date"
        aria-label="Created to"
        value={filters.dateTo}
        onChange={(e) => set("dateTo", e.target.value)}
        className="w-36"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_REPORT_FILTERS)}>
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
