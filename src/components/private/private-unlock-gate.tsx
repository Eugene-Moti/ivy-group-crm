"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

/** Pull an error message out of a failed response, whatever shape it came back in. */
async function errText(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return res.status === 401 ? "Your session expired — sign in again." : fallback;
  }
}

export function PrivateUnlockGate({
  hasPin,
  hasBiometric,
}: {
  hasPin: boolean;
  hasBiometric: boolean;
}) {
  const router = useRouter();
  const firstRun = !hasPin && !hasBiometric;

  const [mode, setMode] = useState<"choose" | "pin" | "setup">(
    firstRun ? "setup" : hasBiometric ? "choose" : "pin"
  );
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState<null | "bio" | "pin" | "setup" | "register">(null);

  async function unlockWithBiometric() {
    setBusy("bio");
    try {
      const optRes = await fetch("/api/private/webauthn/authenticate");
      if (!optRes.ok) throw new Error(await errText(optRes, "Could not start"));
      const optionsJSON = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON });
      const verifyRes = await fetch("/api/private/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion }),
      });
      if (!verifyRes.ok) throw new Error(await errText(verifyRes, "Verification failed"));
      router.refresh();
    } catch (err) {
      toast.error("Biometric unlock failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function unlockWithPin() {
    if (pin.length < 6) return;
    setBusy("pin");
    try {
      const res = await fetch("/api/private/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error(await errText(res, "Incorrect PIN"));
      router.refresh();
    } catch (err) {
      toast.error("Couldn't unlock", { description: err instanceof Error ? err.message : undefined });
      setPin("");
    } finally {
      setBusy(null);
    }
  }

  async function createPinAndEnter() {
    if (pin.length < 6 || pin !== confirmPin) {
      toast.error(pin !== confirmPin ? "PINs don't match" : "PIN must be at least 6 digits");
      return;
    }
    setBusy("setup");
    try {
      const setRes = await fetch("/api/private/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      });
      if (!setRes.ok) throw new Error(await errText(setRes, "Could not set PIN"));
      const unlockRes = await fetch("/api/private/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!unlockRes.ok) throw new Error(await errText(unlockRes, "Could not unlock"));
      router.refresh();
    } catch (err) {
      toast.error("Setup failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function registerBiometric() {
    setBusy("register");
    try {
      const optRes = await fetch("/api/private/webauthn/register");
      if (!optRes.ok) throw new Error(await errText(optRes, "Could not start"));
      const optionsJSON = await optRes.json();
      const attestation = await startRegistration({ optionsJSON });
      const verifyRes = await fetch("/api/private/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestation, deviceLabel: "This device" }),
      });
      if (!verifyRes.ok) throw new Error(await errText(verifyRes, "Could not register"));
      toast.success("This device's biometric is registered");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't register biometric", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center">
      <Card className="w-full rounded-2xl">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-gold/10 p-3">
              <Lock className="size-6 text-gold" />
            </div>
            <h1 className="text-lg font-semibold">Private clients</h1>
            <p className="text-sm text-muted-foreground">
              {firstRun
                ? "Set a PIN to protect this area. You can add fingerprint / Windows Hello unlock after."
                : "Verify it's you to open the private area. This unlock lasts 15 minutes."}
            </p>
          </div>

          {mode === "setup" && (
            <div className="space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="New PIN (6–12 digits)"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              />
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              />
              <Button className="w-full" onClick={createPinAndEnter} disabled={busy !== null}>
                {busy === "setup" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                Set PIN &amp; enter
              </Button>
            </div>
          )}

          {mode === "choose" && (
            <div className="space-y-2">
              <Button className="w-full" onClick={unlockWithBiometric} disabled={busy !== null}>
                {busy === "bio" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
                Unlock with Windows Hello / Touch ID
              </Button>
              {hasPin && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("pin")}
                  disabled={busy !== null}
                >
                  <KeyRound />
                  Use PIN instead
                </Button>
              )}
            </div>
          )}

          {mode === "pin" && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                unlockWithPin();
              }}
            >
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              />
              <Button type="submit" className="w-full" disabled={busy !== null || pin.length < 6}>
                {busy === "pin" ? <Loader2 className="animate-spin" /> : <KeyRound />}
                Unlock
              </Button>
              {hasBiometric && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMode("choose")}
                  disabled={busy !== null}
                >
                  <Fingerprint />
                  Use biometric instead
                </Button>
              )}
            </form>
          )}

          {firstRun && (
            <p className="text-center text-xs text-muted-foreground">
              After setting your PIN you can register this laptop&apos;s fingerprint or
              face unlock from Private → Security.
            </p>
          )}
          {!firstRun && !hasBiometric && mode === "pin" && (
            <button
              type="button"
              onClick={registerBiometric}
              disabled={busy !== null}
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {busy === "register" ? "Registering…" : "Register this device's biometric for next time"}
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
