import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color";

export function ColorBadge({
  label,
  color,
  className,
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.12),
        borderColor: hexToRgba(color, 0.3),
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
