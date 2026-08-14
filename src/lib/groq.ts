import "server-only";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_TOOL_ITERATIONS = 5;
const MAX_RETRIES_PER_CALL = 2;

export type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown> | unknown;

class ToolUseFailedError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One completions call, with retries for Groq's `tool_use_failed` error — a
 * documented, purely-stochastic reliability quirk in Groq's function-calling
 * (the model occasionally emits malformed call arguments; regenerating the
 * same request usually succeeds) rather than anything wrong with the request
 * itself, so a same-input retry is the correct fix rather than a bug to chase.
 */
async function callGroqOnce(
  apiKey: string,
  conversation: ChatMessage[],
  toolSchema: { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }[]
): Promise<{ content: string | null; tool_calls?: GroqToolCall[] }> {
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_CALL; attempt++) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: conversation,
        tools: toolSchema,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const message = data.choices?.[0]?.message;
      if (!message) throw new Error("Groq API returned no message.");
      return message;
    }

    const body = await res.text().catch(() => "");
    const isToolUseFailed = res.status === 400 && body.includes("tool_use_failed");
    if (isToolUseFailed && attempt < MAX_RETRIES_PER_CALL) {
      await sleep(250 * (attempt + 1));
      continue;
    }
    if (isToolUseFailed) {
      throw new ToolUseFailedError(
        "The assistant had trouble forming a request for that — try rephrasing, or ask something more specific."
      );
    }
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 300)}`);
  }
  throw new ToolUseFailedError("The assistant had trouble forming a request for that — try rephrasing.");
}

/**
 * Runs the Groq chat-completions tool-calling loop to a final text answer.
 * Groq's API is OpenAI-compatible, so this is a plain fetch rather than a
 * dependency — one less package for what's a handful of well-defined calls.
 */
export async function runGroqAssistant({
  messages,
  tools,
  executors,
}: {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  executors: Record<string, ToolExecutor>;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const conversation = [...messages];
  const toolSchema = tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const message = await callGroqOnce(apiKey, conversation, toolSchema);

    const toolCalls: GroqToolCall[] | undefined = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return message.content ?? "";
    }

    conversation.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const executor = executors[call.function.name];
      let result: unknown;
      if (!executor) {
        result = { error: `Unknown tool: ${call.function.name}` };
      } else {
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          result = await executor(args);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Tool execution failed." };
        }
      }
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result ?? null),
      });
    }
  }

  return "I wasn't able to finish gathering the information for that — try narrowing the question a bit.";
}
