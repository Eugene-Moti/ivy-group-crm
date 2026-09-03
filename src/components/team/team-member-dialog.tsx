"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, RefreshCw, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { generatePassword } from "@/lib/password";
import { SetPasswordDialog } from "@/components/account/set-password-dialog";
import { AvatarUpload } from "@/components/team/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { ProfileRow } from "@/lib/queries/settings";
import type { UserRole } from "@/types/database.types";

/**
 * Editing a teammate — display name and job title are self-service (either
 * the owner or an admin can set them), role and active status are
 * admin-only and never editable for the admin's own row (matches the same
 * caution already established in Settings > Users & roles). Password
 * handling forks by who's being edited: your own row reuses the existing
 * SetPasswordDialog; an admin editing someone else gets a "generate and
 * hand off" flow instead, since only Supabase's admin API can set another
 * user's password directly.
 */
export function TeamMemberDialog({
  open,
  onOpenChange,
  profile,
  isSelf,
  viewerIsAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow;
  isSelf: boolean;
  viewerIsAdmin: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [role, setRole] = useState<UserRole>(profile.role);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canEditRoleAndStatus = viewerIsAdmin && !isSelf;

  function reset() {
    setDisplayName(profile.display_name ?? "");
    setJobTitle(profile.job_title ?? "");
    setRole(profile.role);
    setGeneratedPassword(null);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    const supabase = createClient();
    const payload: { display_name: string | null; job_title: string | null; role?: UserRole } = {
      display_name: displayName.trim() || null,
      job_title: jobTitle.trim() || null,
    };
    if (canEditRoleAndStatus && role !== profile.role) {
      payload.role = role;
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to save", { description: error.message });
      return;
    }
    toast.success("Profile updated");
    router.refresh();
    handleOpenChange(false);
  }

  async function handleToggleActive() {
    setIsTogglingActive(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, isActive: !profile.is_active }),
    });
    const data = await res.json().catch(() => ({}));
    setIsTogglingActive(false);

    if (!res.ok) {
      toast.error("Failed to update status", { description: data.error });
      return;
    }
    toast.success(profile.is_active ? "Account deactivated" : "Account reactivated");
    router.refresh();
  }

  async function handleGeneratePassword() {
    const password = generatePassword();
    setIsGeneratingPassword(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, password }),
    });
    const data = await res.json().catch(() => ({}));
    setIsGeneratingPassword(false);

    if (!res.ok) {
      toast.error("Failed to set a new password", { description: data.error });
      return;
    }
    setGeneratedPassword(password);
  }

  async function handleCopyPassword() {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayLabel = profile.display_name || profile.full_name || profile.email || "this user";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isSelf ? "Your profile" : displayLabel}</DialogTitle>
            <DialogDescription>
              {isSelf
                ? "How the system refers to you, and your account security."
                : "Team member details and account controls."}
            </DialogDescription>
          </DialogHeader>

          <AvatarUpload profile={profile} displayLabel={displayLabel} />

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <FieldContent>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={profile.full_name ?? "e.g. Mike"}
                />
                <FieldDescription>
                  What the dashboard greeting and other first-name-basis spots call{" "}
                  {isSelf ? "you" : "them"} — the account&apos;s real name stays{" "}
                  {profile.full_name ?? "on file"} either way.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="job-title">Job title</FieldLabel>
              <FieldContent>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Head of Marketing"
                />
              </FieldContent>
            </Field>

            {canEditRoleAndStatus && (
              <Field>
                <FieldLabel>Role</FieldLabel>
                <FieldContent>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter className="mt-2 gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>

          <div className="space-y-3 border-t border-border pt-4">
            {isSelf ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSetPasswordOpen(true)}
              >
                <KeyRound className="size-3.5" />
                Change password
              </Button>
            ) : (
              canEditRoleAndStatus &&
              (generatedPassword ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    New password — share this with {displayLabel} yourself. It won&apos;t be shown
                    again.
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={generatedPassword} className="font-mono text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPassword}
                      aria-label="Copy password"
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGeneratePassword}
                  disabled={isGeneratingPassword}
                >
                  {isGeneratingPassword ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Generate a new password
                </Button>
              ))
            )}

            {canEditRoleAndStatus && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleToggleActive}
                disabled={isTogglingActive}
              >
                {isTogglingActive ? (
                  <Loader2 className="animate-spin" />
                ) : profile.is_active ? (
                  <ShieldOff className="size-3.5 text-destructive" />
                ) : (
                  <ShieldCheck className="size-3.5 text-success" />
                )}
                {profile.is_active ? "Deactivate account" : "Reactivate account"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isSelf && <SetPasswordDialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />}
    </>
  );
}
