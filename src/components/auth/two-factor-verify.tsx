"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2, LogOut } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
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

export function TwoFactorVerify({
  hasPasskey,
  hasPin,
}: {
  hasPasskey: boolean;
  hasPin: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"passkey" | "pin">(hasPasskey ? "passkey" : "pin");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<null | "passkey" | "pin" | "out">(null);

  function done() {
    router.push("/dashboard");
    router.refresh();
  }

  async function withPasskey() {
    setBusy("passkey");
    try {
      const optRes = await fetch("/api/2fa/webauthn/authenticate");
      if (!optRes.ok) throw new Error(await errText(optRes, "Could not start"));
      const optionsJSON = await optRes.json();
      const assertion = await startAuthentication({ optionsJSON });
      const res = await fetch("/api/2fa/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion }),
      });
      if (!res.ok) throw new Error(await errText(res, "Verification failed"));
      done();
    } catch (err) {
      toast.error("Couldn't verify", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  async function withPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 6) return;
    setBusy("pin");
    try {
      const res = await fetch("/api/2fa/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error(await errText(res, "Incorrect PIN"));
      done();
    } catch (err) {
      toast.error("Couldn't verify", { description: err instanceof Error ? err.message : undefined });
      setPin("");
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
      {mode === "passkey" ? (
        <div className="space-y-2">
          <Button className="w-full" onClick={withPasskey} disabled={busy !== null}>
            {busy === "passkey" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            Verify with Windows Hello / Touch ID
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
      ) : (
        <form className="space-y-3" onSubmit={withPin}>
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
            Verify
          </Button>
          {hasPasskey && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setMode("passkey")}
              disabled={busy !== null}
            >
              <Fingerprint />
              Use passkey instead
            </Button>
          )}
        </form>
      )}

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
