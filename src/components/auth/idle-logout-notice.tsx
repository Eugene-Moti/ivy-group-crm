"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a toast when redirected here after IdleSessionGuard signs someone out. */
export function IdleLogoutNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isIdleLogout = searchParams.get("reason") === "idle";

  useEffect(() => {
    if (isIdleLogout) {
      toast.info("You were signed out after being idle, for security.");
      // Strip the query param without a Next.js navigation/re-render — this
      // runs right as the video/animations are mounting, and a full route
      // transition here was a likely contributor to a ~450ms INP sample
      // landing on the email field at the same moment.
      window.history.replaceState(null, "", pathname);
    }
  }, [isIdleLogout, pathname]);

  return null;
}
