"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LeadFormFields } from "@/components/leads/lead-form-fields";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };
type AgentLeadOption = { id: string; first_name: string; last_name: string };

export function LeadProfileEditor({
  lead,
  leadSources,
  propertyTypes,
  agents,
  agentLeads,
  campaigns,
  onDone,
}: {
  lead: LeadWithRelations;
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  campaigns: LeadOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const profile = useProfile();
  const statusLabels = useStatusLabels();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: leadFormDefaults(lead),
  });

  const onSubmit = handleSubmit(async (values) => {
    const supabase = createClient();
    const payload = buildLeadPayload(values);

    const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);

    if (error) {
      toast.error("Failed to update lead", { description: error.message });
      return;
    }

    await logStatusChange(supabase, lead.id, lead.status, values.status, statusLabels, profile?.id ?? null);

    toast.success("Lead updated");
    if (values.status === WON_STATUS_KEY && lead.status !== WON_STATUS_KEY) celebrateWon();
    onDone();
    router.refresh();
  });

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardContent>
          <LeadFormFields
            register={register}
            control={control}
            errors={errors}
            leadSources={leadSources}
            propertyTypes={propertyTypes}
            agents={agents}
            agentLeads={agentLeads}
            campaigns={campaigns}
            currentLeadId={lead.id}
            setValue={setValue}
            watch={watch}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
