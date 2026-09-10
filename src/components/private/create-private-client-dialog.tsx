"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { LEAD_PRIORITIES } from "@/lib/constants";

type Project = { id: string; name: string; location: string | null };

export function CreatePrivateClientDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [codename, setCodename] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("Warm");
  const [brief, setBrief] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setCodename("");
    setPhone("");
    setEmail("");
    setProjectId("");
    setPriority("Warm");
    setBrief("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/private/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        codename,
        phone,
        email,
        property_type_id: projectId || null,
        priority,
        confidential_brief: brief,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast.error("Couldn't create", { description: data.error });
      return;
    }
    toast.success("Private client created");
    reset();
    onOpenChange(false);
    router.push(`/private/${data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New private client</DialogTitle>
          <DialogDescription>
            Kept entirely off the shared pipeline. A codename is what shows in lists.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pc-first">First name</FieldLabel>
              <FieldContent>
                <Input id="pc-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="pc-last">Last name</FieldLabel>
              <FieldContent>
                <Input id="pc-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="pc-codename">Codename (optional)</FieldLabel>
            <FieldContent>
              <Input
                id="pc-codename"
                value={codename}
                onChange={(e) => setCodename(e.target.value)}
                placeholder="e.g. Project Halcyon"
              />
            </FieldContent>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="pc-phone">Phone</FieldLabel>
              <FieldContent>
                <Input id="pc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="pc-email">Email</FieldLabel>
              <FieldContent>
                <Input id="pc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FieldContent>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Project</FieldLabel>
              <FieldContent>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <FieldContent>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="pc-brief">Confidential brief (optional)</FieldLabel>
            <FieldContent>
              <Textarea
                id="pc-brief"
                rows={3}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Context only people with private access should see."
              />
            </FieldContent>
          </Field>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !firstName.trim()}>
              {saving && <Loader2 className="animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
