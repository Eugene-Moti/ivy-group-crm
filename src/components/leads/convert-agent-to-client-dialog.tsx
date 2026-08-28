"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

const NAME_PENDING_FOLLOW_UP_DAYS = 3;

/**
 * For deals worked through an agent before the actual client's identity is
 * known — this spins the deal off into its own "Direct Client" lead once
 * that identity is learned, carrying over the project/budget/priority/
 * status/manager the deal already had. Inserting a lead with
 * referred_by_lead_id set fires a DB trigger (auto_resolve_referring_agent)
 * that automatically moves the agent's own card to "Referred — Client
 * Active", so the same deal doesn't show twice on the Kanban — no status
 * update needed here. It does NOT copy notes or evidence: those stay on the
 * agent's record exactly as logged, so the client's own record only
 * accumulates evidence from the point it exists — matching how every other
 * record in this system is append-only and untouched by downstream actions.
 */
export function ConvertAgentToClientDialog({
  open,
  onOpenChange,
  agentLead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentLead: LeadWithRelations;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [namePending, setNamePending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setNamePending(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!namePending && (!firstName.trim() || !lastName.trim())) return;

    setIsSubmitting(true);
    const supabase = createClient();

    // A placeholder that's self-explanatory anywhere this lead's name shows
    // up (Kanban, leads table, notifications) — no separate flag/column
    // needed, and a follow-up date pushes someone to come back and rename it.
    const resolvedFirstName = namePending ? "Unnamed buyer" : firstName.trim();
    const resolvedLastName = namePending ? `(via ${fullName(agentLead)})` : lastName.trim();

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        phone: phone.trim() || null,
        email: email.trim() || null,
        lead_type: "Direct Client",
        referred_by_lead_id: agentLead.id,
        lead_source_id: agentLead.lead_source_id,
        campaign_id: agentLead.campaign_id,
        property_type_id: agentLead.property_type_id,
        preferred_area: agentLead.preferred_area,
        budget_min: agentLead.budget_min,
        budget_max: agentLead.budget_max,
        bedrooms: agentLead.bedrooms,
        priority: agentLead.priority,
        status: agentLead.status,
        assigned_to: agentLead.assigned_to,
        created_at: agentLead.created_at,
        next_follow_up_at: namePending
          ? addDays(new Date(), NAME_PENDING_FOLLOW_UP_DAYS).toISOString()
          : null,
      })
      .select("id")
      .single();

    if (error || !newLead) {
      setIsSubmitting(false);
      toast.error("Failed to create client lead", { description: error?.message });
      return;
    }

    await supabase.from("activities").insert([
      {
        lead_id: agentLead.id,
        type: "note",
        body: namePending
          ? "Deal confirmed but the client's identity isn't known yet — continued as a placeholder client lead, to be renamed once confirmed."
          : `Client details obtained — deal continued as ${resolvedFirstName} ${resolvedLastName}.`,
        created_by: profile?.id ?? null,
      },
      {
        lead_id: newLead.id,
        type: "note",
        body: namePending
          ? `Referred by ${fullName(agentLead)} — deal details (project, budget, status, sales manager) carried over from their record. Rename this lead once the buyer's identity is confirmed.`
          : `Referred by ${fullName(agentLead)} — deal details (project, budget, status, sales manager) carried over from their record.`,
        created_by: profile?.id ?? null,
      },
    ]);

    setIsSubmitting(false);
    toast.success("Client lead created");
    reset();
    onOpenChange(false);
    router.push(`/leads/${newLead.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add client details</DialogTitle>
          <DialogDescription>
            Creates a new client lead linked back to {fullName(agentLead)}, carrying
            over the project, budget, priority, status, and sales manager already on
            this deal. {fullName(agentLead)}&apos;s own card automatically moves to
            &quot;Referred — Client Active&quot;, so this deal no longer shows twice on
            the Kanban — their notes and evidence are left exactly as they are.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="convert-first-name">First name</FieldLabel>
              <FieldContent>
                <Input
                  id="convert-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={namePending}
                  required={!namePending}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="convert-last-name">Last name</FieldLabel>
              <FieldContent>
                <Input
                  id="convert-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={namePending}
                  required={!namePending}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="convert-name-pending"
              checked={namePending}
              onCheckedChange={(checked) => setNamePending(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="convert-name-pending" className="text-sm font-normal text-muted-foreground">
              I don&apos;t know their name yet — create a placeholder lead now and follow up on the
              details in {NAME_PENDING_FOLLOW_UP_DAYS} days.
            </Label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="convert-phone">Phone</FieldLabel>
              <FieldContent>
                <Input
                  id="convert-phone"
                  placeholder="+254712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={namePending}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="convert-email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="convert-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={namePending}
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!namePending && (!firstName.trim() || !lastName.trim()))}
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              Create client lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
