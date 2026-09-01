"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { DIRECT_SALE_BONUS_RATE, WON_STATUS_KEY, type SaleType } from "@/lib/constants";
import { formatKES, fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Records one unit sold against a Won, Direct Client lead — always required
 * (never a free-standing entry), since client name, sales manager, and (for
 * an agent-referred sale) the referring agent are all read straight off
 * that lead rather than re-typed here. sale_type isn't a form field: it's
 * a fact about the lead (has a referrer, or doesn't), not a choice.
 */
export function RecordUnitSaleDialog({
  open,
  onOpenChange,
  leads,
  lockedLead,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Won, Direct Client leads to pick from — ignored when lockedLead is given. */
  leads: LeadWithRelations[];
  /** Skips the picker — used when launched from that lead's own detail page. */
  lockedLead?: LeadWithRelations;
  onSaved: () => void;
}) {
  const router = useRouter();
  const profile = useProfile();

  const eligibleLeads = useMemo(
    () => leads.filter((l) => l.status === WON_STATUS_KEY && l.lead_type === "Direct Client"),
    [leads]
  );

  const [leadId, setLeadId] = useState(lockedLead?.id ?? "");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitSize, setUnitSize] = useState("");
  const [unitAmount, setUnitAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusManuallyEdited, setBonusManuallyEdited] = useState(false);
  const [bonusPaid, setBonusPaid] = useState(false);
  const [soldAt, setSoldAt] = useState(todayLocal());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLead = lockedLead ?? eligibleLeads.find((l) => l.id === leadId);
  const saleType: SaleType | null = selectedLead
    ? selectedLead.referred_by_lead_id
      ? "Agent Referral"
      : "Direct Client"
    : null;

  function reset() {
    setLeadId(lockedLead?.id ?? "");
    setUnitNumber("");
    setUnitSize("");
    setUnitAmount("");
    setBonusAmount("");
    setBonusManuallyEdited(false);
    setBonusPaid(false);
    setSoldAt(todayLocal());
    setNotes("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleUnitAmountChange(value: string) {
    setUnitAmount(value);
    if (saleType === "Direct Client" && !bonusManuallyEdited) {
      const amount = Number(value);
      setBonusAmount(
        value.trim() && !Number.isNaN(amount) ? String(Math.round(amount * DIRECT_SALE_BONUS_RATE)) : ""
      );
    }
  }

  function handleBonusAmountChange(value: string) {
    setBonusAmount(value);
    setBonusManuallyEdited(true);
  }

  const canSubmit =
    !!selectedLead &&
    unitNumber.trim() !== "" &&
    unitAmount.trim() !== "" &&
    !Number.isNaN(Number(unitAmount)) &&
    !Number.isNaN(Number(bonusAmount || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedLead || !saleType) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("units_sold").insert({
      lead_id: selectedLead.id,
      unit_number: unitNumber.trim(),
      unit_size: unitSize.trim() || null,
      sale_type: saleType,
      unit_amount: Number(unitAmount),
      bonus_amount: bonusAmount.trim() ? Number(bonusAmount) : 0,
      bonus_paid: bonusPaid,
      sold_at: soldAt,
      notes: notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to record unit sale", { description: error.message });
      return;
    }

    toast.success(`${unitNumber.trim()} recorded as sold`);
    handleOpenChange(false);
    onSaved();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a unit sale</DialogTitle>
          <DialogDescription>
            Client, sales manager, and referring agent (if any) are read from the lead — only
            the unit and money details need entering here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!lockedLead && (
            <Field>
              <FieldLabel>Client</FieldLabel>
              <FieldContent>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Won, Direct Client lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleLeads.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No Won, Direct Client leads yet.
                      </div>
                    ) : (
                      eligibleLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {fullName(l)}
                          {l.property_type?.name ? ` — ${l.property_type.name}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          )}

          {selectedLead && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-sm">
              <Badge variant="outline">{saleType}</Badge>
              <span className="text-muted-foreground">
                {selectedLead.property_type?.name ?? "No project set"}
                {selectedLead.assigned_agent?.name ? ` · ${selectedLead.assigned_agent.name}` : ""}
                {selectedLead.referred_by ? ` · Referred by ${fullName(selectedLead.referred_by)}` : ""}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="unit-number">Unit number</FieldLabel>
              <FieldContent>
                <Input
                  id="unit-number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. A-204"
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="unit-size">Unit size</FieldLabel>
              <FieldContent>
                <Input
                  id="unit-size"
                  value={unitSize}
                  onChange={(e) => setUnitSize(e.target.value)}
                  placeholder="e.g. 2 bed, 90 sqm"
                />
              </FieldContent>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="unit-amount">Unit amount (KES)</FieldLabel>
              <FieldContent>
                <Input
                  id="unit-amount"
                  type="number"
                  min={0}
                  value={unitAmount}
                  onChange={(e) => handleUnitAmountChange(e.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="bonus-amount">
                Bonus (KES){saleType === "Direct Client" && " — auto: 1% of unit amount"}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="bonus-amount"
                  type="number"
                  min={0}
                  value={bonusAmount}
                  onChange={(e) => handleBonusAmountChange(e.target.value)}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sold-at">Date sold</FieldLabel>
              <FieldContent>
                <Input
                  id="sold-at"
                  type="date"
                  value={soldAt}
                  max={todayLocal()}
                  onChange={(e) => setSoldAt(e.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Payout status</FieldLabel>
              <FieldContent>
                <div className="flex h-8 items-center gap-2">
                  <Checkbox
                    id="bonus-paid"
                    checked={bonusPaid}
                    onCheckedChange={(checked) => setBonusPaid(checked === true)}
                  />
                  <Label htmlFor="bonus-paid" className="font-normal">
                    Bonus already paid out
                  </Label>
                </div>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="unit-notes">Notes (optional)</FieldLabel>
            <FieldContent>
              <Textarea
                id="unit-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FieldContent>
          </Field>

          {unitAmount && !Number.isNaN(Number(unitAmount)) && (
            <p className="text-xs text-muted-foreground">
              Unit amount: {formatKES(Number(unitAmount))}
              {bonusAmount && !Number.isNaN(Number(bonusAmount))
                ? ` · Bonus: ${formatKES(Number(bonusAmount))}`
                : ""}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
