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

/** Admin: clear a user's sign-in PIN so they set a new one next time (locked out, forgotten PIN). */
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
    toast.success(`${label}'s sign-in PIN was reset — they'll set a new one on next sign-in`);
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Reset sign-in PIN" title="Reset sign-in PIN">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldX className="size-3.5" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset {label}&apos;s sign-in PIN?</AlertDialogTitle>
          <AlertDialogDescription>
            Clears their PIN. Their next sign-in still needs their password, then asks them to
            set a new PIN. Use this if they&apos;ve forgotten it or are locked out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); reset(); }} disabled={busy}>
            Reset PIN
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
