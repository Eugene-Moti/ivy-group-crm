"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { autoMapHeaders, type ImportFieldKey } from "@/lib/import/field-config";
import type { ParsedSheet } from "@/lib/import/parse-file";
import type { ImportRowResult } from "@/lib/import/validate-row";
import type { LeadColumnLabels } from "@/lib/queries/settings";

import { UploadStep } from "@/components/import/upload-step";
import { MapColumnsStep } from "@/components/import/map-columns-step";
import { PreviewStep } from "@/components/import/preview-step";
import { ResultStep } from "@/components/import/result-step";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string };

type Step = "upload" | "map" | "preview" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "preview", label: "Preview" },
  { key: "done", label: "Done" },
];

export function ImportWizard({
  leadSources,
  propertyTypes,
  agents,
  columnLabels,
}: {
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
  columnLabels?: LeadColumnLabels;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportFieldKey, string>>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const existingSourceNames = useMemo(
    () => new Set(leadSources.map((s) => s.name.toLowerCase())),
    [leadSources]
  );

  const existingPropertyTypeNames = useMemo(
    () => new Set(propertyTypes.map((p) => p.name.toLowerCase())),
    [propertyTypes]
  );

  const agentIdsByName = useMemo(
    () => new Map(agents.map((a) => [a.name.toLowerCase(), a.id])),
    [agents]
  );

  const sourceIdByNameRef = useMemo(
    () => new Map(leadSources.map((s) => [s.name.toLowerCase(), s.id])),
    [leadSources]
  );

  const propertyTypeIdByNameRef = useMemo(
    () => new Map(propertyTypes.map((p) => [p.name.toLowerCase(), p.id])),
    [propertyTypes]
  );

  function reset() {
    setStep("upload");
    setSheet(null);
    setMapping({});
    setResult(null);
  }

  async function handleConfirm(results: ImportRowResult[]) {
    const valid = results.filter((r) => r.data);
    if (!valid.length) return;

    setIsImporting(true);
    const supabase = createClient();

    const newSourceNames = [
      ...new Set(valid.filter((r) => r.isNewSource).map((r) => r.data!.lead_source_name!)),
    ];
    const newPropertyTypeNames = [
      ...new Set(
        valid.filter((r) => r.isNewPropertyType).map((r) => r.data!.property_type_name!)
      ),
    ];

    const sourceIdByName = new Map(sourceIdByNameRef);
    const propertyTypeIdByName = new Map(propertyTypeIdByNameRef);

    if (newSourceNames.length) {
      const { data: created, error } = await supabase
        .from("lead_sources")
        .insert(newSourceNames.map((name) => ({ name })))
        .select("id, name");

      if (error) {
        setIsImporting(false);
        toast.error("Failed to create new lead sources", { description: error.message });
        return;
      }
      for (const row of created ?? []) {
        sourceIdByName.set(row.name.toLowerCase(), row.id);
      }
    }

    if (newPropertyTypeNames.length) {
      const { data: created, error } = await supabase
        .from("property_types")
        .insert(newPropertyTypeNames.map((name) => ({ name })))
        .select("id, name");

      if (error) {
        setIsImporting(false);
        toast.error("Failed to create new property types", { description: error.message });
        return;
      }
      for (const row of created ?? []) {
        propertyTypeIdByName.set(row.name.toLowerCase(), row.id);
      }
    }

    const payloads = valid.map((r) => {
      const d = r.data!;
      return {
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        email: d.email,
        lead_source_id: d.lead_source_name
          ? (sourceIdByName.get(d.lead_source_name.toLowerCase()) ?? null)
          : null,
        priority: d.priority,
        status: d.status,
        property_type_id: d.property_type_name
          ? (propertyTypeIdByName.get(d.property_type_name.toLowerCase()) ?? null)
          : null,
        preferred_area: d.preferred_area,
        budget_min: d.budget_min,
        budget_max: d.budget_max,
        bedrooms: d.bedrooms,
        last_contact_at: d.last_contact_at,
        next_follow_up_at: d.next_follow_up_at,
        assigned_to: d.assigned_to,
        notes: d.notes,
      };
    });

    const { error: insertError } = await supabase.from("leads").insert(payloads);

    setIsImporting(false);

    if (insertError) {
      toast.error("Failed to import leads", { description: insertError.message });
      return;
    }

    setResult({ imported: valid.length, skipped: results.length - valid.length });
    setStep("done");
  }

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const currentIndex = STEPS.findIndex((x) => x.key === step);
          const isDone = i < currentIndex || step === "done";
          const isCurrent = s.key === step;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isDone
                    ? "bg-gold text-ink"
                    : isCurrent
                      ? "border border-gold text-gold"
                      : "border border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-medium" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>

      {step === "upload" && (
        <UploadStep
          onParsed={(parsed) => {
            setSheet(parsed);
            setMapping(autoMapHeaders(parsed.headers));
            setStep("map");
          }}
        />
      )}

      {step === "map" && sheet && (
        <MapColumnsStep
          headers={sheet.headers}
          mapping={mapping}
          columnLabels={columnLabels}
          onChange={setMapping}
          onBack={() => setStep("upload")}
          onContinue={() => setStep("preview")}
        />
      )}

      {step === "preview" && sheet && (
        <PreviewStep
          rows={sheet.rows}
          mapping={mapping}
          existingSourceNames={existingSourceNames}
          existingPropertyTypeNames={existingPropertyTypeNames}
          agentsByName={agentIdsByName}
          isImporting={isImporting}
          onBack={() => setStep("map")}
          onConfirm={handleConfirm}
        />
      )}

      {step === "done" && result && (
        <ResultStep
          imported={result.imported}
          skipped={result.skipped}
          onImportAnother={reset}
        />
      )}
    </div>
  );
}
