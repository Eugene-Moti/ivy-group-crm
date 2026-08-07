"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

/**
 * For deals worked through an agent before the actual client's identity is
 * known — this spins the deal off into its own "Direct Client" lead once
 * that identity is learned, carrying over the project/budget/priority/
 * status/manager the deal already had. It does NOT copy notes or evidence:
 * those stay on the agent's record exactly as logged, so the client's own
 * record only accumulates evidence from the point it exists — matching how
 * every other record in this system is append-only and untouched by
 * downstream actions.
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
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
        body: `Client details obtained — deal continued as ${firstName.trim()} ${lastName.trim()}.`,
        created_by: profile?.id ?? null,
      },
      {
        lead_id: newLead.id,
        type: "note",
        body: `Referred by ${fullName(agentLead)} — deal details (project, budget, status, sales manager) carried over from their record.`,
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
            this deal. {fullName(agentLead)}&apos;s own record, notes, and evidence
            are left exactly as they are.
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
                  required
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
                  required
                />
              </FieldContent>
            </Field>
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
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !firstName.trim() || !lastName.trim()}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Create client lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
