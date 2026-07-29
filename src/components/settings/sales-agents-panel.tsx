"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

type SalesAgent = { id: string; name: string; phone: string | null; email: string | null };

export function SalesAgentsPanel({ salesAgents }: { salesAgents: SalesAgent[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<SalesAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("sales_agents").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add sales manager", { description: error.message });
      return;
    }

    toast.success("Sales manager added");
    setName("");
    setPhone("");
    setEmail("");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("sales_agents").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete sales manager", { description: error.message });
      return;
    }

    toast.success("Sales manager deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sales managers who buyer leads get assigned to. They don&apos;t sign
        into this system — just their name and contact details, so client
        details can be relayed to them directly.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-48"
        />
        <Input
          placeholder="Phone / WhatsApp"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="max-w-44"
        />
        <Input
          placeholder="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-52"
        />
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {salesAgents.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No sales managers yet.
            </p>
          )}
          {salesAgents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[agent.phone, agent.email].filter(Boolean).join(" · ") ||
                    "No phone or email set"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleting(agent)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sales manager?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `"${deleting.name}" will be removed. Leads assigned to them become unassigned rather than deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
