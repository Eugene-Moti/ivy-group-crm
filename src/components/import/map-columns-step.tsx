"use client";

import { Fragment } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMPORT_FIELDS,
  isNameMappingComplete,
  resolveImportFieldLabel,
  type ImportFieldKey,
} from "@/lib/import/field-config";
import type { LeadColumnLabels } from "@/lib/queries/settings";

const NONE = "__none__";

export function MapColumnsStep({
  headers,
  mapping,
  columnLabels,
  onChange,
  onBack,
  onContinue,
}: {
  headers: string[];
  mapping: Partial<Record<ImportFieldKey, string>>;
  columnLabels?: LeadColumnLabels;
  onChange: (mapping: Partial<Record<ImportFieldKey, string>>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const nameOk = isNameMappingComplete(mapping);
  const otherMissingRequired = IMPORT_FIELDS.filter(
    (f) => f.required && f.key !== "first_name" && f.key !== "last_name" && !mapping[f.key]
  );
  const canContinue = nameOk && otherMissingRequired.length === 0;

  function setField(key: ImportFieldKey, header: string) {
    const next = { ...mapping };
    if (header === NONE) {
      delete next[key];
    } else {
      next[key] = header;
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We matched what we could from your file&apos;s column headers. Adjust anything
        that looks wrong before continuing.
      </p>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>System field</span>
          <span>Your spreadsheet column</span>
        </div>

        <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
          {IMPORT_FIELDS.map((f) => {
            const { label, note } = resolveImportFieldLabel(f, columnLabels);
            const isNameField =
              f.key === "first_name" || f.key === "last_name" || f.key === "full_name";
            const showRequiredMark = isNameField ? !nameOk : f.required;

            return (
              <Fragment key={f.key}>
                {f.key === "full_name" && (
                  <div className="bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground">
                    — or, if your file has one combined name column —
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-card p-3">
                  <span className="text-sm font-medium">
                    {label}
                    {showRequiredMark && <span className="ml-1 text-destructive">*</span>}
                    {note && (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {note}
                      </span>
                    )}
                  </span>
                  <Select value={mapping[f.key] ?? NONE} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger size="sm" className="w-48">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not mapped</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {!canContinue && (
        <p className="text-sm text-destructive">
          {!nameOk
            ? "Map Full Name, or both First Name and Last Name, to continue."
            : `Map ${otherMissingRequired.map((f) => resolveImportFieldLabel(f, columnLabels).label).join(" and ")} to continue.`}
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={!canContinue}>
          Preview import
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
