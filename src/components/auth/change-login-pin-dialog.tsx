"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

async function errText(res: Response, fallback: string) {
  try {
    const b = await res.json();
    return typeof b?.error === "string" ? b.error : fallback;
  } catch {
    return fallback;
  }
}

/** Self-service change of the login PIN — asked for after the password on every sign-in. */
export function ChangeLoginPinDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/2fa/pin")
      .then((r) => r.json())
      .then((d) => !cancelled && setPinSet(!!d.pinSet))
      .catch(() => !cancelled && setPinSet(null));
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reset() {
    setCurrentPin("");
    setNewPin("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length < 6) return toast.error("PIN must be at least 6 digits");
    setSaving(true);
    const res = await fetch("/api/2fa/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPin, currentPin }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Couldn't save PIN", { description: await errText(res, "") });
    toast.success("PIN changed");
    reset();
    onOpenChange(false);
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
          <DialogTitle>Sign-in PIN</DialogTitle>
          <DialogDescription>Asked for after your password on every sign-in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {pinSet && (
            <Field>
              <FieldLabel htmlFor="clp-cur">Current PIN</FieldLabel>
              <FieldContent>
                <Input
                  id="clp-cur"
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                />
              </FieldContent>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="clp-new">New PIN</FieldLabel>
            <FieldContent>
              <Input
                id="clp-new"
                type="password"
                inputMode="numeric"
                placeholder="6–12 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              />
            </FieldContent>
          </Field>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || newPin.length < 6}>
              {saving && <Loader2 className="animate-spin" />}
              <KeyRound className="size-3.5" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
