"use client";

import { useState } from "react";
import { Mail, Pencil, Trophy } from "lucide-react";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TeamMemberDialog } from "@/components/team/team-member-dialog";
import { useOnlineTeam } from "@/components/providers/online-presence-provider";
import type { ProfileRow } from "@/lib/queries/settings";

export function UserCard({
  profile,
  isSelf,
  viewerIsAdmin,
  activityThisMonth,
  isTopThisMonth,
}: {
  profile: ProfileRow;
  isSelf: boolean;
  viewerIsAdmin: boolean;
  activityThisMonth: number;
  isTopThisMonth: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const onlineIds = useOnlineTeam();
  const isOnline = onlineIds.has(profile.id);
  const primaryName = profile.display_name || profile.full_name || profile.email || "Unnamed user";
  const showLegalName =
    !!profile.display_name && profile.full_name && profile.full_name !== profile.display_name;
  const canManage = isSelf || viewerIsAdmin;

  return (
    <>
      <Card className="rounded-2xl">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={primaryName} />
                <AvatarFallback className="bg-gold text-sm font-semibold text-ink">
                  {primaryName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
                {isOnline && (
                  <AvatarBadge className="bg-success" title="Online now" aria-label="Online now" />
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">
                  <span className="truncate">{primaryName}</span>
                  {isSelf && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                  {isTopThisMonth && (
                    <span title="Most active this month" className="shrink-0">
                      <Trophy className="size-3.5 text-gold" aria-label="Most active this month" />
                    </span>
                  )}
                </p>
                {showLegalName && (
                  <p className="truncate text-xs text-muted-foreground">{profile.full_name}</p>
                )}
                <p className="truncate text-xs text-muted-foreground">
                  {profile.job_title || "No job title set"}
                </p>
              </div>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit"
                onClick={() => setDialogOpen(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>

          {profile.email && (
            <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
              <Badge variant={profile.is_active ? "outline" : "destructive"}>
                {profile.is_active ? "Active" : "Deactivated"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {activityThisMonth} logged this month
            </span>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          profile={profile}
          isSelf={isSelf}
          viewerIsAdmin={viewerIsAdmin}
        />
      )}
    </>
  );
}
