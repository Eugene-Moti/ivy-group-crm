"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const TICK_MS = 1000;
const STORAGE_KEY = "ivy-last-activity";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;

/** Signs the user out after IDLE_TIMEOUT_MS of no activity, with a warning countdown first. */
export function IdleSessionGuard() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const loggingOutRef = useRef(false);

  const recordActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));

    let lastRecorded = 0;
    const onActivity = () => {
      const t = Date.now();
      if (t - lastRecorded > 1000) {
        lastRecorded = t;
        recordActivity();
      }
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const interval = setInterval(async () => {
      if (loggingOutRef.current) return;

      const last = Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - last);

      if (remaining <= 0) {
        loggingOutRef.current = true;
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login?reason=idle");
        router.refresh();
        return;
      }

      setSecondsLeft(remaining <= WARNING_MS ? Math.ceil(remaining / 1000) : null);
    }, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      clearInterval(interval);
    };
  }, [recordActivity, router]);

  return (
    <AlertDialog open={secondsLeft != null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            For security, you&apos;ll be signed out in {secondsLeft}s due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={recordActivity}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
