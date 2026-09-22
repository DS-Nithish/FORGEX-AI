import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase } from "../db";
import { seedTools } from "../db/seed";
import { _setClient } from "../agent/llmClient";

function createMockGroqClient(toolCall?: { name: string; arguments: Record<string, unknown> }) {
  const tool_calls = toolCall
    ? [
        {
          id: "call_mock_api",
          type: "function",
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments),
          },
        },
      ]
    : null;

  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: "mock_api_chat_001",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Executing requested task...",
                tool_calls,
              },
            },
          ],
        }),
      },
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("POST /api/agent/run", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await initDatabase(":memory:");
    await seedTools();
  });

  it("executes an agent task and returns full AgentRunResult", async () => {
    const mock = createMockGroqClient({
      name: "search_web",
      arguments: { query: "AgentShield runtime firewall" },
    });
    _setClient(mock);

    const res = await request(app).post("/api/agent/run").send({
      task: "Search for security architecture documents",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("task", "Search for security architecture documents");
    expect(res.body.toolCallRequested).toEqual({
      tool: "search_web",
      arguments: { query: "AgentShield runtime firewall" },
    });
    expect(res.body.toolExecutionResult).toHaveProperty("success", true);
  });

  it("handles documentId parameter and populates documentRead", async () => {
    const mock = createMockGroqClient({
      name: "create_database",
      arguments: { name: "customer_orders_db" },
    });
    _setClient(mock);

    const res = await request(app).post("/api/agent/run").send({
      task: "Read spec and set up the DB",
      documentId: "doc_pdf_clean_001",
    });

    expect(res.status).toBe(200);
    expect(res.body.documentRead).not.toBeNull();
    expect(res.body.documentRead.id).toBe("doc_pdf_clean_001");
    expect(res.body.toolCallRequested.tool).toBe("create_database");
  });

  it("returns 400 when task is missing or empty", async () => {
    const res = await request(app).post("/api/agent/run").send({
      task: "",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Validation error");
  });
});
