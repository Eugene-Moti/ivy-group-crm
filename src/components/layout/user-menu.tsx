"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Mail, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { COMPANY_CONTACT } from "@/lib/company";
import { SetPasswordDialog } from "@/components/account/set-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFor(label: string) {
  return label.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const profile = useProfile();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name = profile?.full_name ?? null;
  const email = profile?.email ?? "";
  const label = name || email || "Account";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-1.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-gold text-xs font-semibold text-ink">
                {initialsFor(label)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {label}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{name || "Signed in"}</span>
              {profile && (
                <Badge
                  variant="outline"
                  className="h-4.5 px-1.5 text-[10px] font-medium capitalize"
                >
                  {profile.role}
                </Badge>
              )}
            </div>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setPasswordDialogOpen(true);
            }}
          >
            <KeyRound />
            Set a password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Contact support
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href={`tel:${COMPANY_CONTACT.phoneHref}`}>
                <Phone />
                Call {COMPANY_CONTACT.phoneDisplay}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`https://wa.me/${COMPANY_CONTACT.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`mailto:${COMPANY_CONTACT.email}`}>
                <Mail />
                Email support
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SetPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </>
  );
}
