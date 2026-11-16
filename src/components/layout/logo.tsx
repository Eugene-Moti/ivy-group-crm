import { OrionMark } from "@/components/brand/orion-mark";
import { cn } from "@/lib/utils";

/** The Orion wordmark. The company being worked in is shown separately, by <SidebarWorkspace>. */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <OrionMark className="size-9" />
      <div className="leading-none">
        <span className="block font-display text-lg tracking-[0.16em] text-sidebar-foreground">ORION</span>
        <span className="mt-1 block text-[10.5px] tracking-wide text-sidebar-foreground/45">Real estate CRM</span>
      </div>
    </div>
  );
}
