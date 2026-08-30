import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="lg:hidden">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="hidden shrink-0 space-y-4 rounded-2xl border border-border bg-card p-3 lg:block lg:w-64">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
