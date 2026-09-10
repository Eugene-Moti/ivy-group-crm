"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Undo2 } from "lucide-react";
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

export function PrivateClientActions({ leadId, isAdmin }: { leadId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);

  async function moveOut() {
    setMoving(true);
    const res = await fetch("/api/private/lead", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, isPrivate: false }),
    });
    setMoving(false);
    if (!res.ok) {
      toast.error("Couldn't move", { description: (await res.json().catch(() => ({}))).error });
      return;
    }
    toast.success("Client returned to the shared pipeline");
    router.push("/private");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/private">
          <ArrowLeft className="size-4" />
          All private clients
        </Link>
      </Button>

      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={moving}>
              {moving ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
              Return to shared pipeline
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Make this client visible again?</AlertDialogTitle>
              <AlertDialogDescription>
                They&apos;ll reappear in the main pipeline, reports, search, and the digest for
                everyone with normal access. Their history stays intact. You can make them private
                again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={moveOut}>Return to pipeline</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
