"use client";

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { formatDate } from "@/lib/format";

type Device = {
  credential_id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export function PrivateSecurityPanel() {
  const [loading, setLoading] = useState(true);
  const [pinSet, setPinSet] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");

  const [phraseSet, setPhraseSet] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [savingPhrase, setSavingPhrase] = useState(false);

  const reload = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [credRes, phraseRes] = await Promise.all([
        fetch("/api/private/credentials"),
        fetch("/api/private/entry-phrase"),
      ]);
      if (cancelled) return;
      if (credRes.ok) {
        const data = await credRes.json();
        if (cancelled) return;
        setPinSet(data.pinSet);
        setDevices(data.devices);
      }
      if (phraseRes.ok) {
        const data = await phraseRes.json();
        if (cancelled) return;
        setPhraseSet(data.set);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin.length < 6) {
      toast.error("PIN must be at least 6 digits");
      return;
    }
    setSavingPin(true);
    const res = await fetch("/api/private/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPin, currentPin }),
    });
    setSavingPin(false);
    if (!res.ok) {
      toast.error("Couldn't save PIN", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success(pinSet ? "PIN changed" : "PIN set");
    setCurrentPin("");
    setNewPin("");
    reload();
  }

  async function savePhrase(e: React.FormEvent) {
    e.preventDefault();
    if (newPhrase.trim().length < 4) {
      toast.error("Phrase must be at least 4 characters");
      return;
    }
    setSavingPhrase(true);
    const res = await fetch("/api/private/entry-phrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPhrase, currentPhrase }),
    });
    setSavingPhrase(false);
    if (!res.ok) {
      toast.error("Couldn't save phrase", {
        description: (await res.json().catch(() => ({}))).error,
      });
      return;
    }
    toast.success(phraseSet ? "Entry phrase changed" : "Entry phrase set");
    setCurrentPhrase("");
    setNewPhrase("");
    reload();
  }

  async function addDevice() {
    setRegistering(true);
    try {
      const optRes = await fetch("/api/private/webauthn/register");
      if (!optRes.ok) throw new Error((await optRes.json()).error ?? "Could not start");
      const optionsJSON = await optRes.json();
      const attestation = await startRegistration({ optionsJSON });
      const verifyRes = await fetch("/api/private/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestation, deviceLabel: deviceLabel.trim() || "This device" }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error ?? "Could not register");
      toast.success("Device registered");
      setDeviceLabel("");
      reload();
    } catch (err) {
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRegistering(false);
    }
  }

  async function removeDevice(credentialId: string) {
    const res = await fetch("/api/private/credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialId }),
    });
    if (!res.ok) {
      toast.error("Couldn't remove", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success("Device removed");
    reload();
  }

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="rounded-2xl">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-gold" />
            <h2 className="font-semibold">Search entry phrase</h2>
            <span className="text-xs text-muted-foreground">
              {phraseSet ? "Set" : "Not set"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Type this into Ctrl/Cmd+K anywhere in the app to jump straight here — nothing shows
            up in the search results, it just opens. Only you have this one.
          </p>
          <form onSubmit={savePhrase} className="space-y-3">
            {phraseSet && (
              <Field>
                <FieldLabel htmlFor="cur-phrase">Current phrase</FieldLabel>
                <FieldContent>
                  <Input
                    id="cur-phrase"
                    type="password"
                    value={currentPhrase}
                    onChange={(e) => setCurrentPhrase(e.target.value)}
                    placeholder="Leave blank if already unlocked"
                  />
                </FieldContent>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="new-phrase">{phraseSet ? "New phrase" : "Create a phrase"}</FieldLabel>
              <FieldContent>
                <Input
                  id="new-phrase"
                  type="text"
                  value={newPhrase}
                  onChange={(e) => setNewPhrase(e.target.value)}
                  placeholder="e.g. a short phrase only you'd type"
                  maxLength={60}
                />
              </FieldContent>
            </Field>
            <Button type="submit" size="sm" disabled={savingPhrase || newPhrase.trim().length < 4}>
              {savingPhrase && <Loader2 className="animate-spin" />}
              {phraseSet ? "Change phrase" : "Set phrase"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-gold" />
            <h2 className="font-semibold">PIN</h2>
            <span className="text-xs text-muted-foreground">
              {pinSet ? "Set" : "Not set"}
            </span>
          </div>
          <form onSubmit={savePin} className="space-y-3">
            {pinSet && (
              <Field>
                <FieldLabel htmlFor="cur-pin">Current PIN</FieldLabel>
                <FieldContent>
                  <Input
                    id="cur-pin"
                    type="password"
                    inputMode="numeric"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="Leave blank if already unlocked"
                  />
                </FieldContent>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="new-pin">{pinSet ? "New PIN" : "Create a PIN"}</FieldLabel>
              <FieldContent>
                <Input
                  id="new-pin"
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="6–12 digits"
                />
              </FieldContent>
            </Field>
            <Button type="submit" size="sm" disabled={savingPin || newPin.length < 6}>
              {savingPin && <Loader2 className="animate-spin" />}
              {pinSet ? "Change PIN" : "Set PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-gold" />
            <h2 className="font-semibold">Biometric devices</h2>
          </div>
          <div className="space-y-2">
            {devices.length === 0 && (
              <p className="text-sm text-muted-foreground">No devices registered.</p>
            )}
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
                  aria-label="Remove device"
                  onClick={() => removeDevice(d.credential_id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              placeholder="Label (e.g. Work laptop)"
              className="h-8"
            />
            <Button size="sm" onClick={addDevice} disabled={registering}>
              {registering ? <Loader2 className="animate-spin" /> : <Plus className="size-3.5" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
