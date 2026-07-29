import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { LEAD_PRIORITIES, LEAD_STATUSES, LEAD_TYPES } from "@/lib/constants";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { fullName } from "@/lib/format";
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
  currentLeadId,
}: {
  register: UseFormRegister<LeadFormValues>;
  control: Control<LeadFormValues>;
  errors: FieldErrors<LeadFormValues>;
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  currentLeadId?: string;
}) {
  const statusLabels = useStatusLabels();
  const referrableAgentLeads = agentLeads.filter((a) => a.id !== currentLeadId);
  const today = new Date().toISOString().slice(0, 10);

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
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
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
          name="property_type_id"
          render={({ field }) => (
            <Field>
              <FieldLabel>Property type</FieldLabel>
              <FieldContent>
                <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {propertyTypes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="preferred_area">Preferred area</FieldLabel>
          <FieldContent>
            <Input id="preferred_area" {...register("preferred_area")} />
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
