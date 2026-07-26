"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, UserCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { UserRole } from "@/types/database.types";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

function generatePassword(length = 12) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join("");
}

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [password, setPassword] = useState(() => generatePassword());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setFullName("");
    setRole("viewer");
    setPassword(generatePassword());
    setCreated(false);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      if (created) router.refresh();
      reset();
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role, password, mode: "manual" }),
    });
    const data = await res.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!res.ok) {
      toast.error("Failed to create user", { description: data.error });
      return;
    }

    setCreated(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserCog className="size-4" />
          Create user manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                Share these sign-in details with {fullName || email} yourself (WhatsApp,
                call, in person). They should set their own password from the account
                menu once they&apos;ve signed in.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input readOnly value={email} className="font-mono text-sm" />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Temporary password</FieldLabel>
                <FieldContent>
                  <div className="flex gap-2">
                    <Input readOnly value={password} className="font-mono text-sm" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      aria-label="Copy password"
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </FieldContent>
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create a user manually</DialogTitle>
              <DialogDescription>
                Creates the account immediately with the password below — no email
                sent. Useful while Supabase&apos;s free-tier email limit is blocking
                invites.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="create-email">Email</FieldLabel>
                  <FieldContent>
                    <Input
                      id="create-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@ivygroup.co.ke"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-name">Full name (optional)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="create-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </FieldContent>
                </Field>
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
                <Field>
                  <FieldLabel htmlFor="create-password">Temporary password</FieldLabel>
                  <FieldContent>
                    <div className="flex gap-2">
                      <Input
                        id="create-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPassword(generatePassword())}
                        aria-label="Generate new password"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    </div>
                    <FieldDescription>
                      You&apos;ll need to share this with them yourself.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !email.trim()}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Create user
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
