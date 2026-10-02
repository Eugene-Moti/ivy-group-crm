"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { leadFormSchema, type LeadFormValues } from "@/lib/validations/lead";
import { buildLeadPayload, leadFormDefaults } from "@/lib/leads-form";
import { logStatusChange } from "@/lib/activity-log";
import { celebrateWon } from "@/lib/celebrate";
import { WON_STATUS_KEY } from "@/lib/constants";
import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadFormFields } from "@/components/leads/lead-form-fields";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };
type AgentLeadOption = { id: string; first_name: string; last_name: string };

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  prefill,
  leadSources,
  propertyTypes,
  agents,
  agentLeads,
  campaigns,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadWithRelations;
  /** Create mode only (ignored when `lead` is set) — seeds personal details (and repeat_of_lead_id) onto the normal "new lead" defaults, e.g. for a repeat client's new purchase, where only the deal-specific fields should start blank. */
  prefill?: Partial<LeadFormValues>;
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  campaigns: LeadOption[];
  onSaved: () => void;
}) {
  const isEdit = !!lead;
  const profile = useProfile();
  const statusLabels = useStatusLabels();

  const defaults = () => (isEdit ? leadFormDefaults(lead) : { ...leadFormDefaults(lead), ...prefill });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults() is re-derived from lead/prefill, both already in the dep list via their own identity
  }, [open, lead, prefill, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const supabase = createClient();
    const payload = buildLeadPayload(values);

    const { error } = isEdit
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert(payload);

    if (error) {
      toast.error(isEdit ? "Failed to update lead" : "Failed to create lead", {
        description: error.message,
      });
      return;
    }

    if (isEdit) {
      await logStatusChange(supabase, lead.id, lead.status, values.status, statusLabels, profile?.id ?? null);
    }

    toast.success(isEdit ? "Lead updated" : "Lead created");
    if (values.status === WON_STATUS_KEY && (!isEdit || lead?.status !== WON_STATUS_KEY)) {
      celebrateWon();
    }
    onOpenChange(false);
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : prefill?.repeat_of_lead_id ? "Add repeat purchase" : "Add lead"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this lead's details."
              : prefill?.repeat_of_lead_id
                ? "Their name and contact details are carried over — just the project, budget, and other deal details need entering fresh."
                : "Add a new buyer lead to the pipeline."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <LeadFormFields
            register={register}
            control={control}
            errors={errors}
            leadSources={leadSources}
            propertyTypes={propertyTypes}
            agents={agents}
            agentLeads={agentLeads}
            campaigns={campaigns}
            currentLeadId={lead?.id}
            setValue={setValue}
            watch={watch}
          />

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
