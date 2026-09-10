import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * Both the "how long ago" and the exact date/time, stacked — the relative
 * form for a quick read, the absolute form always visible underneath rather
 * than hidden in a hover tooltip (which does nothing on a phone).
 */
export function TimelineTimestamp({
  value,
  className = "",
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  return (
    <span className={`shrink-0 text-right text-xs leading-tight text-muted-foreground ${className}`}>
      {formatRelative(value)}
      <span className="block text-[11px] text-muted-foreground/60">{formatDateTime(value)}</span>
    </span>
  );
}
