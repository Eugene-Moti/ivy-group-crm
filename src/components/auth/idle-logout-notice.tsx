"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a toast when redirected here after IdleSessionGuard signs someone out. */
export function IdleLogoutNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isIdleLogout = searchParams.get("reason") === "idle";

  useEffect(() => {
    if (isIdleLogout) {
      toast.info("You were signed out after being idle, for security.");
      router.replace(pathname);
    }
  }, [isIdleLogout, pathname, router]);

  return null;
}
