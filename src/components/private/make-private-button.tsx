"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
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
import { useIsAdmin } from "@/components/providers/profile-provider";
import { usePrivateAccess } from "@/components/providers/private-access-provider";

/** Shown on a normal lead only to allowlisted admins — moves it into the sealed Private area. */
export function MakePrivateButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { hasAccess } = usePrivateAccess();
  const [busy, setBusy] = useState(false);

  if (!isAdmin || !hasAccess) return null;

  async function makePrivate() {
    setBusy(true);
    const res = await fetch("/api/private/lead", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, isPrivate: true }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Couldn't make private", {
        description:
          res.status === 403
            ? "Open the Private tab and unlock it first, then try again."
            : data.error,
      });
      return;
    }
    toast.success("Moved to Private");
    router.push(`/private/${leadId}`);
  }

  return (
    <div className="flex justify-end">
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
          Make private
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move this client into the Private area?</AlertDialogTitle>
          <AlertDialogDescription>
            They disappear from the shared pipeline, reports, search, and the daily digest for
            everyone. Any assigned sales manager is cleared. Only people on the private allowlist
            will see them. Their full history carries over, and you can return them to the normal
            pipeline later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={makePrivate}>Make private</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
