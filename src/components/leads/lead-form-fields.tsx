import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { LEAD_PRIORITIES, LEAD_TYPES, LOST_STATUS_KEY, WON_STATUS_KEY, getLostReasons } from "@/lib/constants";
import { usePipelineStages } from "@/components/providers/status-labels-provider";
import { fullName } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { findMatchingLeads, type LeadIdentity } from "@/lib/duplicate-leads";
import type { LeadFormValues } from "@/lib/validations/lead";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };
type AgentLeadOption = { id: string; first_name: string; last_name: string };

export function LeadFormFields({
  register,
  control,
  errors,
  leadSources,
  propertyTypes,
  agents,
  agentLeads,
  campaigns,
  currentLeadId,
  setValue,
  watch,
}: {
  register: UseFormRegister<LeadFormValues>;
  control: Control<LeadFormValues>;
  errors: FieldErrors<LeadFormValues>;
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  campaigns: LeadOption[];
  currentLeadId?: string;
  setValue: UseFormSetValue<LeadFormValues>;
  watch: UseFormWatch<LeadFormValues>;
}) {
  const stages = usePipelineStages();
  const referrableAgentLeads = agentLeads.filter((a) => a.id !== currentLeadId);
  const today = new Date().toISOString().slice(0, 10);

  const [allLeadIdentities, setAllLeadIdentities] = useState<LeadIdentity[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select(
          "id, first_name, last_name, phone, email, status, assigned_agent:sales_agents!leads_assigned_to_fkey(name)"
        );
      if (!cancelled) setAllLeadIdentities((data ?? []) as unknown as LeadIdentity[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const watchedPhone = watch("phone");
  const watchedEmail = watch("email");
  const duplicateMatches = findMatchingLeads(
    { phone: watchedPhone, email: watchedEmail },
    allLeadIdentities,
    currentLeadId
  );
  const isLost = watch("status") === LOST_STATUS_KEY;
  /**
   * An agent isn't the customer, so "Won" never applies to their own card —
   * a completed deal belongs on the client lead created via "Add client
   * details". Hidden from the options (not just blocked on submit) so the
   * wrong choice is never on offer in the first place.
   */
  const isAgentLead = watch("lead_type") === "Real Estate Agent";
  const availableStages = stages.filter((s) => !(isAgentLead && s.key === WON_STATUS_KEY));

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="lead_type"
          render={({ field }) => (
            <Field>
              <FieldLabel>Lead type</FieldLabel>
              <FieldContent>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="referred_by_lead_id"
          render={({ field }) => (
            <Field>
              <FieldLabel>Referred by agent</FieldLabel>
              <FieldContent>
                <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {referrableAgentLeads.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {fullName(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Optional — only if a specific referring agent is known.
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <Field>
        <FieldLabel htmlFor="created_at">Date of inquiry</FieldLabel>
        <FieldContent>
          <Input id="created_at" type="date" max={today} {...register("created_at")} />
          <FieldDescription>
            When this client first inquired — defaults to today, but backdate it for
            leads that started before they were entered into the system.
          </FieldDescription>
        </FieldContent>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="first_name">First name</FieldLabel>
          <FieldContent>
            <Input id="first_name" {...register("first_name")} />
            <FieldError errors={[errors.first_name]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="last_name">Last name</FieldLabel>
          <FieldContent>
            <Input id="last_name" {...register("last_name")} />
            <FieldError errors={[errors.last_name]} />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <FieldContent>
            <Input id="phone" placeholder="+254712345678" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <FieldContent>
            <Input id="email" type="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </FieldContent>
        </Field>
      </div>

      {duplicateMatches.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
          <div className="space-y-1">
            <p className="font-medium">
              Possible duplicate — matching{" "}
              {duplicateMatches[0].matchedOn.length === 2
                ? "phone and email"
                : duplicateMatches[0].matchedOn[0]}{" "}
              found on {duplicateMatches.length === 1 ? "another lead" : `${duplicateMatches.length} other leads`}:
            </p>
            <ul className="space-y-0.5">
              {duplicateMatches.map((m) => (
                <li key={m.lead.id}>
                  <Link
                    href={`/leads/${m.lead.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gold hover:underline"
                  >
                    {fullName(m.lead)}
                  </Link>{" "}
                  — {m.lead.status}
                  {m.lead.assigned_agent && ` · ${m.lead.assigned_agent.name}`}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              You can still save — this is just a heads-up in case it&apos;s the same client.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="lead_source_id"
          render={({ field }) => (
            <Field>
              <FieldLabel>Lead source</FieldLabel>
              <FieldContent>
                <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leadSources.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="assigned_to"
          render={({ field }) => (
            <Field>
              <FieldLabel>Sales manager</FieldLabel>
              <FieldContent>
                <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <Controller
        control={control}
        name="campaign_id"
        render={({ field }) => (
          <Field>
            <FieldLabel>Campaign</FieldLabel>
            <FieldContent>
              <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Optional — which marketing campaign brought this lead in.
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <FieldContent>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Field>
              <FieldLabel>Status</FieldLabel>
              <FieldContent>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAgentLead && (
                  <FieldDescription>
                    Agents can&apos;t be marked Won — use &quot;Add client details&quot; on the lead&apos;s page to convert their referral into a client lead first.
                  </FieldDescription>
                )}
                {errors.status && <FieldError>{errors.status.message}</FieldError>}
              </FieldContent>
            </Field>
          )}
        />
        <Controller
          control={control}
          name="property_type_id"
          render={({ field }) => (
            <Field>
              <FieldLabel>Project</FieldLabel>
              <FieldContent>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const project = propertyTypes.find((p) => p.id === value);
                    if (project?.location) {
                      setValue("preferred_area", project.location, { shouldDirty: true });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {propertyTypes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.location ? ` — ${p.location}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
      </div>

      {isLost && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <Controller
            control={control}
            name="lost_reason"
            render={({ field }) => (
              <Field>
                <FieldLabel>Why was this lead lost?</FieldLabel>
                <FieldContent>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLostReasons(watch("lead_type")).map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.lost_reason]} />
                </FieldContent>
              </Field>
            )}
          />
          <Field>
            <FieldLabel htmlFor="lost_reason_note">Details (optional)</FieldLabel>
            <FieldContent>
              <Input id="lost_reason_note" {...register("lost_reason_note")} />
            </FieldContent>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="preferred_area">Location</FieldLabel>
          <FieldContent>
            <Input id="preferred_area" {...register("preferred_area")} />
            <FieldDescription>
              Auto-fills when a project is selected — edit freely if the client&apos;s
              preferred location differs.
            </FieldDescription>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
          <FieldContent>
            <Input id="bedrooms" type="number" min={0} {...register("bedrooms")} />
            <FieldError errors={[errors.bedrooms]} />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="budget_min">Budget min (KES)</FieldLabel>
          <FieldContent>
            <Input id="budget_min" type="number" min={0} {...register("budget_min")} />
            <FieldError errors={[errors.budget_min]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="budget_max">Budget max (KES)</FieldLabel>
          <FieldContent>
            <Input id="budget_max" type="number" min={0} {...register("budget_max")} />
            <FieldError errors={[errors.budget_max]} />
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="next_follow_up_at">Next follow-up</FieldLabel>
        <FieldContent>
          <Input
            id="next_follow_up_at"
            type="datetime-local"
            {...register("next_follow_up_at")}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <FieldContent>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
