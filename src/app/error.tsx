"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { SubtleBgPage } from "@/components/layout/subtle-bg-page";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SubtleBgPage>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90"
      >
        Try again
      </button>
    </SubtleBgPage>
  );
}
