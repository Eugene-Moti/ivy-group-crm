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
    defaultValues: leadFormDefaults(lead),
  });

  useEffect(() => {
    if (open) reset(leadFormDefaults(lead));
  }, [open, lead, reset]);

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
          <DialogTitle>{isEdit ? "Edit lead" : "Add lead"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this lead's details."
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
