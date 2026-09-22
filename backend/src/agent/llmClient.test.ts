import { describe, it, expect, vi, beforeEach } from "vitest";
import { config } from "../shared/config";
import { callLLM, _setClient } from "./llmClient";

// Mock the Groq client (OpenAI-compatible chat completions API)
function createMockClient(responseText: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: "chatcmpl-mock-123",
          object: "chat.completion",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: responseText },
              finish_reason: "stop",
            },
          ],
          model: config.GROQ_MODEL,
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      },
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("callLLM", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return the text from a mocked Groq response", async () => {
    const mockClient = createMockClient("Hello from the mock!");
    _setClient(mockClient);

    const result = await callLLM("Say hello");

    expect(result).toBe("Hello from the mock!");
    expect(mockClient.chat.completions.create).toHaveBeenCalledOnce();
    expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
      model: config.GROQ_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: "Say hello" }],
    });
  });

  it("should return empty string when response content is null", async () => {
    const nullClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            id: "chatcmpl-mock-456",
            object: "chat.completion",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: null },
                finish_reason: "stop",
              },
            ],
            model: config.GROQ_MODEL,
            usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
          }),
        },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    _setClient(nullClient);

    const result = await callLLM("Return nothing");
    expect(result).toBe("");
  });

  it("should propagate errors from the Groq SDK", async () => {
    const errorClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("API rate limit exceeded")),
        },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    _setClient(errorClient);

    await expect(callLLM("This will fail")).rejects.toThrow("API rate limit exceeded");
  });
});
