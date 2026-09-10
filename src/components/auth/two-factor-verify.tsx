"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Mail } from "lucide-react";
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

export function TwoFactorVerify() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "verify" | "resend" | "out">(null);
  const [cooldown, setCooldown] = useState(0);
  const sentOnce = useRef(false);

  // Send the first code as soon as the page opens.
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    void send(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run exactly once on mount
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function send(initial = false) {
    if (!initial) setBusy("resend");
    try {
      const res = await fetch("/api/2fa/code", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.alreadyVerified) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Couldn't send a code");
      setCooldown(data.cooldownSeconds ?? 45);
      if (!initial) toast.success("New code sent");
    } catch (err) {
      toast.error("Couldn't send a code", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy("verify");
    try {
      const res = await fetch("/api/2fa/code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(await errText(res, "Incorrect code"));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't verify", { description: err instanceof Error ? err.message : undefined });
      setCode("");
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
      <form className="space-y-3" onSubmit={verify}>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-lg tracking-[0.4em]"
        />
        <Button type="submit" className="w-full" disabled={busy !== null || code.length !== 6}>
          {busy === "verify" ? <Loader2 className="animate-spin" /> : <Mail />}
          Verify
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => send(false)}
          disabled={busy !== null || cooldown > 0}
          className="underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-60"
        >
          {busy === "resend"
            ? "Sending…"
            : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend code"}
        </button>
        <button
          type="button"
          onClick={signOut}
          disabled={busy !== null}
          className="flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
        >
          <LogOut className="size-3" />
          Sign out
        </button>
      </div>
    </div>
  );
}
