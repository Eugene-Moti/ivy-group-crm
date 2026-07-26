import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResultStep({
  imported,
  skipped,
  onImportAnother,
}: {
  imported: number;
  skipped: number;
  onImportAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
      <CheckCircle2 className="size-10 text-gold" />
      <div>
        <h2 className="text-lg font-semibold">Import complete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {imported} lead{imported === 1 ? "" : "s"} imported
          {skipped > 0 && `, ${skipped} skipped`}.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onImportAnother}>
          Import another file
        </Button>
        <Button asChild>
          <Link href="/leads">Go to client directory</Link>
        </Button>
      </div>
    </div>
  );
}
