import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-96" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 flex-1 min-w-56" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
