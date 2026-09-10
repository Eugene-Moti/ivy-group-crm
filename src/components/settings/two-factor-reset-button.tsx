"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Admin: wipe a user's passkeys + PIN so they re-enrol on next sign-in (locked out, lost device). */
export function TwoFactorResetButton({ userId, label }: { userId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    const res = await fetch("/api/2fa/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't reset", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success(`${label}'s two-factor was reset — they'll set it up again on next sign-in`);
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Reset two-factor" title="Reset two-factor">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldX className="size-3.5" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset two-factor for {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Removes their passkeys and PIN. Their next sign-in still needs their password, then
            walks them through setting up a new second factor. Use this if they&apos;ve lost their
            device or are locked out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); reset(); }} disabled={busy}>
            Reset two-factor
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
