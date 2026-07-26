"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { CreateUserDialog } from "@/components/settings/create-user-dialog";
import type { ProfileRow } from "@/lib/queries/settings";
import type { UserRole } from "@/types/database.types";

export function UsersPanel({ profiles }: { profiles: ProfileRow[] }) {
  const router = useRouter();
  const currentProfile = useProfile();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ProfileRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRoleChange(userId: string, role: UserRole) {
    setPendingId(userId);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    setPendingId(null);

    if (error) {
      toast.error("Failed to update role", { description: error.message });
      return;
    }

    toast.success("Role updated");
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) return;
    setIsRemoving(true);

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: removing.id }),
    });
    const data = await res.json().catch(() => ({}));
    setIsRemoving(false);

    if (!res.ok) {
      toast.error("Failed to remove user", { description: data.error });
      return;
    }

    toast.success("User removed");
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <CreateUserDialog />
        <InviteUserDialog />
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {profiles.map((profile) => {
            const label = profile.full_name || profile.email || "Unnamed user";
            const isSelf = profile.id === currentProfile?.id;

            return (
              <div key={profile.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-gold text-xs font-semibold text-ink">
                      {label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {label}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pendingId === profile.id && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  )}
                  <Select
                    value={profile.role}
                    onValueChange={(v) => handleRoleChange(profile.id, v as UserRole)}
                    disabled={isSelf || pendingId === profile.id}
                  >
                    <SelectTrigger size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSelf ? (
                    <Badge variant="outline" className="text-[10px]">
                      That&apos;s you
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRemoving(profile)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing &&
                `${removing.full_name || removing.email} will lose access immediately. Their leads will become unassigned rather than deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={isRemoving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isRemoving && <Loader2 className="animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
