import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gold/10 text-gold">
        <Icon className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      <span className="mt-4 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
        {phase}
      </span>
    </div>
  );
}
