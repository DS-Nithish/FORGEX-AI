import Groq from "groq-sdk";
import { config } from "../shared/config";
import { logger } from "../shared/logger";
import { ToolDefinition } from "./toolDefinitions";

const MODEL = config.GROQ_MODEL;
const MAX_TOKENS = 1000;

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return client;
}

export interface LLMToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMToolResponse {
  text: string;
  toolCalls: LLMToolCall[];
  rawResponse?: unknown;
}

/**
 * Send a prompt to the Groq API and return the text response.
 * Maintained for backward compatibility.
 */
export async function callLLM(prompt: string): Promise<string> {
  logger.info(`callLLM → sending prompt (${prompt.length} chars)`);

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices?.[0]?.message?.content ?? "";

  logger.info(`callLLM → received response (${text.length} chars)`);
  return text;
}

/**
 * Send a prompt with tool schemas to the Groq API.
 * Supports tool calling and extracts structured tool_calls if emitted by the LLM.
 */
export async function callLLMWithTools(params: {
  systemPrompt?: string;
  userMessage: string;
  tools?: ToolDefinition[];
}): Promise<LLMToolResponse> {
  logger.info(
    `callLLMWithTools → sending prompt (${params.userMessage.length} chars, ${params.tools?.length ?? 0} tools)`,
  );

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.userMessage });

  const groqTools: Groq.Chat.Completions.ChatCompletionTool[] | undefined =
    params.tools && params.tools.length > 0
      ? params.tools.map((t) => ({
          type: "function",
          function: {
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          },
        }))
      : undefined;

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    messages,
    tools: groqTools,
    tool_choice: groqTools ? "auto" : undefined,
  });

  const message = response.choices?.[0]?.message;
  const text = message?.content ?? "";
  const toolCalls: LLMToolCall[] = [];

  if (message?.tool_calls && Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      if (tc.type === "function" && tc.function) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs =
            typeof tc.function.arguments === "string"
              ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
              : (tc.function.arguments as Record<string, unknown>);
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({
          name: tc.function.name,
          arguments: parsedArgs,
        });
      }
    }
  }

  logger.info(
    `callLLMWithTools → received response (${text.length} chars, ${toolCalls.length} tool calls)`,
  );

  return {
    text,
    toolCalls,
    rawResponse: response,
  };
}

// Exported for testing — allows injecting a mock client
export function _setClient(mockClient: Groq): void {
  client = mockClient;
}
