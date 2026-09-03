"use client";

import { useMemo } from "react";
import { useIsAdmin, useProfile } from "@/components/providers/profile-provider";
import { UserCard } from "@/components/team/user-card";
import { CreateUserDialog } from "@/components/settings/create-user-dialog";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import type { ProfileRow } from "@/lib/queries/settings";

export function TeamView({
  profiles,
  activityCounts,
}: {
  profiles: ProfileRow[];
  activityCounts: Record<string, number>;
}) {
  const isAdmin = useIsAdmin();
  const currentProfile = useProfile();

  // The top logger(s) this month, only once there's a real signal — a lone
  // "leader" out of one logged activity isn't worth a trophy.
  const topActivityIds = useMemo(() => {
    const max = Math.max(0, ...Object.values(activityCounts));
    if (max < 3) return new Set<string>();
    return new Set(Object.entries(activityCounts).filter(([, n]) => n === max).map(([id]) => id));
  }, [activityCounts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team &amp; Users</h1>
          <p className="text-sm text-muted-foreground">
            Everyone with access to Ivy Group CRM.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <CreateUserDialog />
            <InviteUserDialog />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <UserCard
            key={profile.id}
            profile={profile}
            isSelf={profile.id === currentProfile?.id}
            viewerIsAdmin={isAdmin}
            activityThisMonth={activityCounts[profile.id] ?? 0}
            isTopThisMonth={topActivityIds.has(profile.id)}
          />
        ))}
      </div>
    </div>
  );
}
