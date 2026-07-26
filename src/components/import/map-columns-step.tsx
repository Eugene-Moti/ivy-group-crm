"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPORT_FIELDS, type ImportFieldKey } from "@/lib/import/field-config";

const NONE = "__none__";

export function MapColumnsStep({
  headers,
  mapping,
  onChange,
  onBack,
  onContinue,
}: {
  headers: string[];
  mapping: Partial<Record<ImportFieldKey, string>>;
  onChange: (mapping: Partial<Record<ImportFieldKey, string>>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);

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
        <div className="grid grid-cols-2 gap-px bg-border">
          {IMPORT_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 bg-card p-3">
              <span className="text-sm font-medium">
                {f.label}
                {f.required && <span className="ml-1 text-destructive">*</span>}
              </span>
              <Select
                value={mapping[f.key] ?? NONE}
                onValueChange={(v) => setField(f.key, v)}
              >
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
          ))}
        </div>
      </div>

      {missingRequired.length > 0 && (
        <p className="text-sm text-destructive">
          Map {missingRequired.map((f) => f.label).join(" and ")} to continue.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onContinue} disabled={missingRequired.length > 0}>
          Preview import
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
