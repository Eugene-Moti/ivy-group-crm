import Link from "next/link";
import { Compass } from "lucide-react";
import { SubtleBgPage } from "@/components/layout/subtle-bg-page";

export default function NotFound() {
  return (
    <SubtleBgPage>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gold/10 text-gold">
        <Compass className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90"
      >
        Go to dashboard
      </Link>
    </SubtleBgPage>
  );
}
