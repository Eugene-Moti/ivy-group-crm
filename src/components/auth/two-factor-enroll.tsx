"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function errText(res: Response, fallback: string): Promise<string> {
  try {
    const b = await res.json();
    return typeof b?.error === "string" ? b.error : fallback;
  } catch {
    return res.status === 401 ? "Your session expired — sign in again." : fallback;
  }
}

export function TwoFactorEnroll() {
  const router = useRouter();
  const [choice, setChoice] = useState<"passkey" | "pin">("passkey");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<null | "passkey" | "pin" | "out">(null);

  function done() {
    router.push("/dashboard");
    router.refresh();
  }

  async function enrolPasskey() {
    setBusy("passkey");
    try {
      const optRes = await fetch("/api/2fa/webauthn/register");
      if (!optRes.ok) throw new Error(await errText(optRes, "Could not start"));
      const optionsJSON = await optRes.json();
      const attestation = await startRegistration({ optionsJSON });
      const res = await fetch("/api/2fa/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attestation, deviceLabel: "This device" }),
      });
      if (!res.ok) throw new Error(await errText(res, "Could not register"));
      toast.success("Passkey registered");
      done();
    } catch (err) {
      toast.error("Couldn't set up a passkey", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function enrolPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 6 || pin !== confirm) {
      toast.error(pin !== confirm ? "PINs don't match" : "PIN must be at least 6 digits");
      return;
    }
    setBusy("pin");
    try {
      const res = await fetch("/api/2fa/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      });
      if (!res.ok) throw new Error(await errText(res, "Could not set PIN"));
      toast.success("PIN set");
      done();
    } catch (err) {
      toast.error("Couldn't set your PIN", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("out");
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
        <button
          type="button"
          onClick={() => setChoice("passkey")}
          className={`flex-1 rounded-md px-2 py-1.5 ${choice === "passkey" ? "bg-white/10 font-medium" : "text-muted-foreground"}`}
        >
          Passkey
        </button>
        <button
          type="button"
          onClick={() => setChoice("pin")}
          className={`flex-1 rounded-md px-2 py-1.5 ${choice === "pin" ? "bg-white/10 font-medium" : "text-muted-foreground"}`}
        >
          PIN
        </button>
      </div>

      {choice === "passkey" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Uses your laptop&apos;s fingerprint / face unlock or Windows Hello. Nothing to
            remember, and it can&apos;t be phished. Recommended.
          </p>
          <Button className="w-full" onClick={enrolPasskey} disabled={busy !== null}>
            {busy === "passkey" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            Set up passkey on this device
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={enrolPin}>
          <p className="text-xs text-muted-foreground">
            A 6–12 digit code, asked for after your password. Use this if your device has no
            biometric.
          </p>
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
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 12))}
          />
          <Button type="submit" className="w-full" disabled={busy !== null || pin.length < 6}>
            {busy === "pin" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Set PIN &amp; continue
          </Button>
        </form>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <KeyRound className="size-3 shrink-0" />
        You can add the other method later from your profile.
      </p>

      <button
        type="button"
        onClick={signOut}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <LogOut className="size-3" />
        Sign out
      </button>
    </div>
  );
}
