"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Loader2, Send, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useProfile, useIsAdmin } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { OrionMarkdown } from "@/components/orion/orion-markdown";
import {
  applyFollowUp,
  applyNote,
  applyPriorityChange,
  applyReminder,
  applyStatusChange,
  type ProposedAction,
} from "@/lib/assistant-actions";
import { celebrateWon } from "@/lib/celebrate";
import { WON_STATUS_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ActionState = ProposedAction & {
  status: "pending" | "applying" | "done" | "error" | "cancelled";
  error?: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string; actions?: ActionState[] };

/**
 * The reusable core of Orion's chat — message list, action-confirm cards,
 * and the input — shared by the full /orion page panel and the per-lead
 * sidebar. `scopedLead` tells the server which lead the admin is currently
 * looking at so Orion is grounded in it from the first message instead of
 * needing a tool round-trip; `initialPrompt` prefills the input once
 * (URL-seeded on /orion, or just handed in directly for a lead's quick
 * prompts) without auto-sending it.
 */
export function OrionChatBody({
  scopedLead,
  starterPrompts,
  headerTitle,
  headerDescription,
  initialPrompt,
  onConsumeInitialPrompt,
  placeholder,
}: {
  scopedLead?: { id: string; name: string };
  starterPrompts: string[];
  headerTitle: string;
  headerDescription: string;
  initialPrompt?: string;
  onConsumeInitialPrompt?: () => void;
  placeholder: string;
}) {
  const router = useRouter();
  const profile = useProfile();
  const isAdmin = useIsAdmin();
  const statusLabels = useStatusLabels();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialPrompt) return;
    const timer = setTimeout(() => {
      setInput(initialPrompt);
      textareaRef.current?.focus();
      onConsumeInitialPrompt?.();
    }, 0);
    return () => clearTimeout(timer);
    // Only meant to run once per mount for whatever prompt was handed in at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/orion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          leadId: scopedLead?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Orion hit an unexpected error.");
      }
      const actions: ActionState[] | undefined = Array.isArray(data.pendingActions)
        ? data.pendingActions.map((a: ProposedAction) => ({ ...a, status: "pending" as const }))
        : undefined;
      setMessages([...next, { role: "assistant", content: data.reply || "(no response)", actions }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function patchAction(
    messageIndex: number,
    actionId: string,
    patch: Partial<Pick<ActionState, "status" | "error">>
  ) {
    setMessages((prev) =>
      prev.map((m, i) =>
        i !== messageIndex
          ? m
          : {
              ...m,
              actions: m.actions?.map((a) => (a.id === actionId ? ({ ...a, ...patch } as ActionState) : a)),
            }
      )
    );
  }

  async function confirmAction(messageIndex: number, action: ActionState) {
    if (!isAdmin) return;
    patchAction(messageIndex, action.id, { status: "applying" });

    const supabase = createClient();
    const userId = profile?.id ?? null;
    let result: { error: string | null };

    switch (action.kind) {
      case "status_change":
        result = await applyStatusChange(supabase, action, statusLabels, userId);
        break;
      case "priority_change":
        result = await applyPriorityChange(supabase, action, userId);
        break;
      case "follow_up":
        result = await applyFollowUp(supabase, action, userId);
        break;
      case "note":
        result = await applyNote(supabase, action, userId);
        break;
      case "reminder":
        result = await applyReminder(supabase, action, userId);
        break;
    }

    if (result.error) {
      patchAction(messageIndex, action.id, { status: "error", error: result.error });
      toast.error("Couldn't apply that", { description: result.error });
      return;
    }

    patchAction(messageIndex, action.id, { status: "done" });
    toast.success("Applied", { description: action.summary });
    if (action.kind === "status_change" && action.newStatus === WON_STATUS_KEY) celebrateWon();
    router.refresh();
  }

  function cancelAction(messageIndex: number, actionId: string) {
    patchAction(messageIndex, actionId, { status: "cancelled" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Sparkles className="size-4" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{headerTitle}</h2>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{headerDescription}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-4">
        <div ref={scrollRef} className="flex h-full flex-col gap-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Try asking:</p>
              <div className="flex flex-col gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-lg border border-border bg-background p-2.5 text-left text-sm text-foreground transition-colors hover:border-gold/50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gold/15 text-gold"
                  )}
                >
                  {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5",
                    m.role === "user"
                      ? "bg-primary text-sm text-primary-foreground"
                      : "border border-border bg-background text-foreground"
                  )}
                >
                  {m.role === "assistant" ? <OrionMarkdown content={m.content} /> : m.content}
                </div>
              </div>

              {m.actions && m.actions.length > 0 && (
                <div className="ml-9 flex flex-col gap-2">
                  {m.actions.map((action) => (
                    <div key={action.id} className="rounded-lg border border-gold/40 bg-gold/5 p-2.5 text-sm">
                      <p className="text-foreground">{action.summary}</p>
                      {action.status === "pending" && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => confirmAction(i, action)}>
                            <Check className="size-3.5" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => cancelAction(i, action.id)}
                          >
                            <X className="size-3.5" />
                            Cancel
                          </Button>
                        </div>
                      )}
                      {action.status === "applying" && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" />
                          Applying…
                        </p>
                      )}
                      {action.status === "done" && (
                        <p className="mt-1.5 text-xs font-medium text-success">Applied.</p>
                      )}
                      {action.status === "cancelled" && (
                        <p className="mt-1.5 text-xs text-muted-foreground">Cancelled.</p>
                      )}
                      {action.status === "error" && (
                        <p className="mt-1.5 text-xs text-destructive">{action.error ?? "Failed."}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Orion is thinking…
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-end gap-2 border-t border-border p-4">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="max-h-32 min-h-9 resize-none"
          disabled={sending}
        />
        <Button size="icon" onClick={() => send(input)} disabled={sending || !input.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
