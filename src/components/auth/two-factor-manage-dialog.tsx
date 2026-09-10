"use client";

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { formatDate } from "@/lib/format";

type Device = {
  credential_id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
};

async function errText(res: Response, fallback: string) {
  try {
    const b = await res.json();
    return typeof b?.error === "string" ? b.error : fallback;
  } catch {
    return fallback;
  }
}

export function TwoFactorManageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [pinSet, setPinSet] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState<null | "pin" | "passkey" | string>(null);
  const [deviceLabel, setDeviceLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/2fa/credentials");
      if (cancelled) return;
      if (res.ok) {
        const d = await res.json();
        if (cancelled) return;
        setPinSet(d.pinSet);
        setDevices(d.devices);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length < 6) return toast.error("PIN must be at least 6 digits");
    setBusy("pin");
    const res = await fetch("/api/2fa/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPin, currentPin }),
    });
    setBusy(null);
    if (!res.ok) return toast.error("Couldn't save PIN", { description: await errText(res, "") });
    toast.success(pinSet ? "PIN changed" : "PIN set");
    setCurrentPin("");
    setNewPin("");
    reload();
  }

  async function addPasskey() {
    setBusy("passkey");
    try {
      const optRes = await fetch("/api/2fa/webauthn/register");
      if (!optRes.ok) throw new Error(await errText(optRes, "Could not start"));
      const optionsJSON = await optRes.json();
      const attestation = await startRegistration({ optionsJSON });
      const res = await fetch("/api/2fa/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestation, deviceLabel: deviceLabel.trim() || "This device" }),
      });
      if (!res.ok) throw new Error(await errText(res, "Could not register"));
      toast.success("Passkey added");
      setDeviceLabel("");
      reload();
    } catch (err) {
      toast.error("Couldn't add passkey", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: "pin" | "passkey", credentialId?: string) {
    setBusy(credentialId ?? kind);
    const res = await fetch("/api/2fa/credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, credentialId }),
    });
    setBusy(null);
    if (!res.ok) return toast.error("Couldn't remove", { description: await errText(res, "") });
    toast.success("Removed");
    reload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Two-factor security</DialogTitle>
          <DialogDescription>
            Asked for after your password on every sign-in. Keep at least one method, and add a
            second so a lost device doesn&apos;t lock you out.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Fingerprint className="size-4 text-gold" /> Passkeys
              </div>
              {devices.map((d) => (
                <div
                  key={d.credential_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{d.device_label ?? "Device"}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDate(d.created_at)}
                      {d.last_used_at ? ` · last used ${formatDate(d.last_used_at)}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove passkey"
                    onClick={() => remove("passkey", d.credential_id)}
                    disabled={busy === d.credential_id}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="Label (e.g. Work laptop)"
                  className="h-8"
                />
                <Button size="sm" onClick={addPasskey} disabled={busy === "passkey"}>
                  {busy === "passkey" ? <Loader2 className="animate-spin" /> : <Plus className="size-3.5" />}
                  Add
                </Button>
              </div>
            </div>

            <form onSubmit={savePin} className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4 text-gold" /> PIN {pinSet && <span className="text-xs font-normal text-muted-foreground">· set</span>}
              </div>
              {pinSet && (
                <Field>
                  <FieldLabel htmlFor="tfm-cur">Current PIN</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tfm-cur"
                      type="password"
                      inputMode="numeric"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    />
                  </FieldContent>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="tfm-new">{pinSet ? "New PIN" : "Create a PIN"}</FieldLabel>
                <FieldContent>
                  <Input
                    id="tfm-new"
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="6–12 digits"
                  />
                </FieldContent>
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy === "pin" || newPin.length < 6}>
                  {busy === "pin" ? <Loader2 className="animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  {pinSet ? "Change PIN" : "Set PIN"}
                </Button>
                {pinSet && (devices.length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove("pin")}
                    disabled={busy === "pin"}
                  >
                    Remove PIN
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
