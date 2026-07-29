"use client";

import { useMemo } from "react";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validateImportRow, type ImportRowResult } from "@/lib/import/validate-row";
import type { ImportFieldKey } from "@/lib/import/field-config";
import { fullName } from "@/lib/format";

export function PreviewStep({
  rows,
  mapping,
  existingSourceNames,
  existingPropertyTypeNames,
  agentsByName,
  isImporting,
  onBack,
  onConfirm,
}: {
  rows: Record<string, string>[];
  mapping: Partial<Record<ImportFieldKey, string>>;
  existingSourceNames: Set<string>;
  existingPropertyTypeNames: Set<string>;
  agentsByName: Map<string, string>;
  isImporting: boolean;
  onBack: () => void;
  onConfirm: (results: ImportRowResult[]) => void;
}) {
  const results = useMemo(
    () =>
      rows.map((row, i) =>
        validateImportRow(
          row,
          i,
          mapping,
          existingSourceNames,
          existingPropertyTypeNames,
          agentsByName
        )
      ),
    [rows, mapping, existingSourceNames, existingPropertyTypeNames, agentsByName]
  );

  const valid = results.filter((r) => r.data);
  const invalid = results.filter((r) => !r.data);
  const newSourceNames = [
    ...new Set(
      valid
        .filter((r) => r.isNewSource)
        .map((r) => r.data!.lead_source_name!)
    ),
  ];
  const newPropertyTypeNames = [
    ...new Set(
      valid
        .filter((r) => r.isNewPropertyType)
        .map((r) => r.data!.property_type_name!)
    ),
  ];
  const unmatchedAgentCount = valid.filter((r) => r.agentUnmatched).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Total rows" value={results.length} />
        <SummaryStat label="Ready to import" value={valid.length} accent="gold" />
        <SummaryStat label="Will be skipped" value={invalid.length} accent="destructive" />
        <SummaryStat
          label="New sources / types"
          value={newSourceNames.length + newPropertyTypeNames.length}
        />
      </div>

      {newSourceNames.length > 0 && (
        <p className="text-sm text-muted-foreground">
          New lead sources will be created: {newSourceNames.join(", ")}
        </p>
      )}
      {newPropertyTypeNames.length > 0 && (
        <p className="text-sm text-muted-foreground">
          New property types will be created: {newPropertyTypeNames.join(", ")}
        </p>
      )}
      {unmatchedAgentCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {unmatchedAgentCount} row{unmatchedAgentCount === 1 ? "" : "s"} reference a
          sales manager name we couldn&apos;t match — those leads will import unassigned.
        </p>
      )}

      <div className="max-h-96 overflow-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.rowIndex}>
                <TableCell className="text-muted-foreground">{r.rowIndex + 2}</TableCell>
                <TableCell className="font-medium">
                  {r.data ? fullName(r.data) : "—"}
                </TableCell>
                <TableCell>
                  {r.data ? (
                    <Badge className="bg-gold/15 text-gold border-gold/30">Ready</Badge>
                  ) : (
                    <Badge variant="destructive">Skipped</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.errors.length > 0
                    ? r.errors.join("; ")
                    : [
                        r.isNewSource && "new source",
                        r.isNewPropertyType && "new property type",
                        r.agentUnmatched && "agent unmatched",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={() => onConfirm(results)} disabled={isImporting || valid.length === 0}>
          {isImporting ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
          Import {valid.length} lead{valid.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "gold" | "destructive";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{
          color:
            accent === "gold"
              ? "var(--gold)"
              : accent === "destructive"
                ? "var(--destructive)"
                : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}
