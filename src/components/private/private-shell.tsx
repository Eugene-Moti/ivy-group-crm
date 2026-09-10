"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Thin bar above every private page: shows the unlock is live, counts it
 * down, and re-runs the server layout (which re-shows the gate) the moment
 * it lapses. "Lock now" clears it immediately.
 */
export function PrivateShell({
  secondsRemaining,
  children,
}: {
  secondsRemaining: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  // The layout only renders this shell while an unlock is live and never
  // re-runs mid-mount (sibling routes navigate client-side), so the prop is
  // effectively fixed for the life of this component — a plain initializer,
  // no prop-sync effect needed.
  const [left, setLeft] = useState(() => secondsRemaining);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    if (left <= 0) {
      router.refresh();
      return;
    }
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [left, router]);

  async function lockNow() {
    setLocking(true);
    await fetch("/api/private/lock", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  const mins = Math.floor(left / 60);
  const secs = left % 60;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/5 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-gold" />
          <span className="font-medium">Private area unlocked</span>
          <span className="text-muted-foreground">
            · locks in {mins}:{String(secs).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/private/security">Security</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={lockNow} disabled={locking}>
            <Lock className="size-3.5" />
            Lock now
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
