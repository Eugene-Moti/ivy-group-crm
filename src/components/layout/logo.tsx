import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo-icon.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 object-contain"
        priority
      />
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
        Ivy Group
      </span>
    </div>
  );
}
