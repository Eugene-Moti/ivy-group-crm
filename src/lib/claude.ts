import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition, ToolExecutor } from "@/lib/assistant-tools";

const MODEL = "claude-opus-5";
const MAX_TOOL_ITERATIONS = 8;
const MAX_TOKENS = 8000;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

export type SimpleMessage = { role: "user" | "assistant"; content: string };

/**
 * Orion's engine — a manual tool-calling loop against Claude Opus 5, built
 * against the same ToolDefinition/ToolExecutor contracts from
 * lib/assistant-tools.ts as every other Orion surface. Non-streaming:
 * MAX_TOKENS is comfortably under the platform's request timeout, so
 * there's no need for the streaming complexity a much larger response
 * would call for.
 */
export async function runClaudeAssistant({
  system,
  messages,
  tools,
  executors,
}: {
  system: string;
  messages: SimpleMessage[];
  tools: ToolDefinition[];
  executors: Record<string, ToolExecutor>;
}): Promise<string> {
  const anthropic = getClient();

  const claudeTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await createMessage(anthropic, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: claudeTools,
      messages: conversation,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUses.length === 0) {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return textBlock?.text ?? "";
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const executor = executors[use.name];
      let result: unknown;
      if (!executor) {
        result = { error: `Unknown tool: ${use.name}` };
      } else {
        try {
          result = await executor((use.input as Record<string, unknown>) ?? {});
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Tool execution failed." };
        }
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: JSON.stringify(result ?? null),
      });
    }
    conversation.push({ role: "user", content: toolResults });
  }

  return "I wasn't able to finish gathering the information for that — try narrowing the question a bit.";
}

/**
 * A single, tool-free call for narrating already-computed data (the
 * Portfolio Briefing) — no loop, since there's nothing to look up: the
 * caller hands Orion the full, trustworthy numbers up front and asks it to
 * prioritize and write them up, rather than risking it recomputing stats
 * itself.
 */
export async function runClaudeNarration({
  system,
  prompt,
  maxTokens = 4000,
}: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getClient();
  const response = await createMessage(anthropic, {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text ?? "";
}

async function createMessage(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  try {
    return await anthropic.messages.create(params);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("Orion's API key is invalid or missing — check ANTHROPIC_API_KEY.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Orion is getting rate-limited — try again in a moment.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Orion hit an API error (${err.status}): ${err.message}`);
    }
    throw err;
  }
}
