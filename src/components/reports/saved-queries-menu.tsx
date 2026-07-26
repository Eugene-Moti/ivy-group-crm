"use client";

import { useRouter } from "next/navigation";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import type { ReportFilters } from "@/lib/report-metrics";
import type { SavedQueryRow } from "@/lib/queries/saved-queries";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SavedQueriesMenu({
  savedQueries,
  onLoad,
}: {
  savedQueries: SavedQueryRow[];
  onLoad: (filters: ReportFilters) => void;
}) {
  const router = useRouter();
  const profile = useProfile();

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("saved_queries").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete query", { description: error.message });
      return;
    }
    toast.success("Query deleted");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="size-4" />
          Saved queries
          {savedQueries.length > 0 && ` (${savedQueries.length})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {savedQueries.length === 0 && (
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            No saved queries yet.
          </DropdownMenuLabel>
        )}
        {savedQueries.map((query, i) => {
          const canDelete = profile?.role === "admin" || profile?.id === query.created_by;
          return (
            <div key={query.id}>
              {i > 0 && <DropdownMenuSeparator />}
              <div className="flex items-center">
                <DropdownMenuItem
                  className="flex-1"
                  onClick={() => onLoad(query.filters as unknown as ReportFilters)}
                >
                  {query.name}
                </DropdownMenuItem>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(query.id);
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
