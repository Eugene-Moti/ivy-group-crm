import { OrionMark } from "@/components/brand/orion-mark";
import { cn } from "@/lib/utils";

/**
 * Orion wordmark + the workspace it's signed into. The workspace name is
 * Ivy Group for now; it becomes the signed-in organisation once
 * multi-workspace support lands.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <OrionMark className="size-9" />
      <div className="leading-none">
        <span className="block font-display text-lg tracking-[0.14em] text-sidebar-foreground">ORION</span>
        <span className="mt-1 block text-[11px] text-sidebar-foreground/55">Ivy Group workspace</span>
      </div>
    </div>
  );
}
