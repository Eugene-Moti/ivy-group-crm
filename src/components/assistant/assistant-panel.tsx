"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "What needs my attention right now?",
  "Summarize the current pipeline and top priorities",
  "Which Hot leads haven't been contacted recently?",
  "Any lost leads worth a win-back attempt?",
];

export function AssistantPanel({
  open,
  onOpenChange,
  seedPrompt,
  seedKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedPrompt?: string;
  seedKey: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appliedSeedKey = useRef(0);

  useEffect(() => {
    if (!seedPrompt || seedKey === appliedSeedKey.current) return;
    appliedSeedKey.current = seedKey;
    setInput(seedPrompt);
    textareaRef.current?.focus();
  }, [seedPrompt, seedKey]);

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
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "The assistant hit an unexpected error.");
      }
      setMessages([...next, { role: "assistant", content: data.reply || "(no response)" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Ask about leads, notifications, or the pipeline — grounded in live CRM data, read-only.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          <div ref={scrollRef} className="flex h-full flex-col gap-3 pb-2">
            {messages.length === 0 && (
              <div className="space-y-3 py-4">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="flex flex-col gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="rounded-lg border border-border bg-card p-2.5 text-left text-sm text-foreground transition-colors hover:border-gold/50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    m.role === "user" ? "bg-ivy-800 text-white" : "bg-muted text-foreground"
                  )}
                >
                  {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-ivy-800 text-white"
                      : "border border-border bg-card text-foreground"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Thinking…
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
            placeholder="Ask about your leads, pipeline, or what needs attention…"
            className="max-h-32 min-h-9 resize-none"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
