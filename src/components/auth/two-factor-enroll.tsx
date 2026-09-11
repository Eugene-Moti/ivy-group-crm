"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut } from "lucide-react";
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
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<null | "save" | "out">(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 6 || pin !== confirm) {
      toast.error(pin !== confirm ? "PINs don't match" : "PIN must be at least 6 digits");
      return;
    }
    setBusy("save");
    try {
      const res = await fetch("/api/2fa/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      });
      if (!res.ok) throw new Error(await errText(res, "Could not set PIN"));
      toast.success("PIN set");
      router.push("/dashboard");
      router.refresh();
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
      <form className="space-y-3" onSubmit={submit}>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          autoFocus
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
          {busy === "save" ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Set PIN &amp; continue
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        You&apos;ll be asked for this after your password each time you sign in. An admin can
        reset it for you if you ever forget it.
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
