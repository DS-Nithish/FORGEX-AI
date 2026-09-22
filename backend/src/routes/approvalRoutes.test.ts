import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase, getDatabase } from "../db";
import { seedTools } from "../db/seed";
import { _setClient } from "../agent/llmClient";
import { runAgentTask } from "../agent/agentLoop";
import { createToolRequest, getToolRequestById } from "../db/repositories/toolRequestsRepository";
import * as gatewayModule from "../gateway/toolGateway";

function createMockGroqClient(toolCall?: { name: string; arguments: Record<string, unknown> }) {
  const tool_calls = toolCall
    ? [
        {
          id: "call_mock_api_approval",
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
          id: "mock_api_chat_approval",
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

describe("Human Approval API Routes (/api/approvals)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const db = await initDatabase(":memory:");
    await seedTools(db);
  });

  describe("CONFIRM Decision Tool Request Creation", () => {
    it("creates a tool_requests row with status 'pending' and halts without calling the Gateway", async () => {
      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "customer_orders_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Provision customer_orders_db",
          userAuthorized: true,
        },
        getDatabase(),
      );

      // Verify agent stopped at PENDING_APPROVAL
      expect(result.status).toBe("PENDING_APPROVAL");
      expect(result.firewallResult?.policy.decision).toBe("CONFIRM");
      expect(result.requestId).toBeDefined();

      // Verify row in database
      const row = getToolRequestById(result.requestId!, getDatabase());
      expect(row).not.toBeNull();
      expect(row?.status).toBe("pending");
      expect(row?.decision).toBe("CONFIRM");
      expect(row?.tool_id).toBe("create_database");
      expect(row?.arguments).toEqual({ name: "customer_orders_db" });

      // Verify Tool Gateway was NOT executed
      expect(executeSpy).not.toHaveBeenCalled();
      expect(result.toolExecutionResult?.success).toBe(false);
    });
  });

  describe("POST /api/approvals/:requestId/approve", () => {
    it("approves a pending request, updates status to 'approved', calls Gateway, and executes the tool", async () => {
      // 1. Seed a pending request directly in DB
      const pendingReq = createToolRequest(
        {
          tool_id: "create_database",
          arguments: { name: "approved_db", privileges: "READ_WRITE" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      // 2. Human approves via API
      const res = await request(app).post(`/api/approvals/${pendingReq.id}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("approved");
      expect(res.body.requestId).toBe(pendingReq.id);
      expect(res.body.executionResult).toHaveProperty("success", true);
      expect(res.body.executionResult.output).toEqual({
        created: true,
        name: "approved_db",
        privileges: "READ_WRITE",
      });

      // 3. Verify Gateway was called exactly once with correct parameters and auth
      expect(executeSpy).toHaveBeenCalledOnce();
      expect(executeSpy).toHaveBeenCalledWith(
        "create_database",
        { name: "approved_db", privileges: "READ_WRITE" },
        undefined,
        { authorized: true, decision: "ALLOW" },
      );

      // 4. Verify DB status is now 'approved'
      const updated = getToolRequestById(pendingReq.id, getDatabase());
      expect(updated?.status).toBe("approved");
    });

    it("rejects approving an already-approved request with 409 Conflict without calling Gateway again", async () => {
      const pendingReq = createToolRequest(
        {
          tool_id: "search_web",
          arguments: { query: "security best practices" },
          tainted: false,
          risk_level: "LOW",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      // First approval: succeeds
      const res1 = await request(app).post(`/api/approvals/${pendingReq.id}/approve`);
      expect(res1.status).toBe(200);
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Second approval attempt: 409 Conflict
      const res2 = await request(app).post(`/api/approvals/${pendingReq.id}/approve`);
      expect(res2.status).toBe(409);
      expect(res2.body).toHaveProperty("error");
      expect(res2.body.error).toContain("Cannot approve request with status 'approved'");

      // Verify Gateway was NOT called a second time
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });

    it("returns 404 Not Found when approving a nonexistent requestId", async () => {
      const res = await request(app).post("/api/approvals/req_nonexistent_999/approve");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("req_nonexistent_999");
    });
  });

  describe("POST /api/approvals/:requestId/deny", () => {
    it("denies a pending request, updates status to 'denied', and NEVER calls Gateway", async () => {
      const pendingReq = createToolRequest(
        {
          tool_id: "delete_database",
          arguments: { name: "production_db" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      // Human denies via API
      const res = await request(app).post(`/api/approvals/${pendingReq.id}/deny`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("denied");
      expect(res.body.requestId).toBe(pendingReq.id);

      // Verify DB status is 'denied'
      const updated = getToolRequestById(pendingReq.id, getDatabase());
      expect(updated?.status).toBe("denied");

      // Verify Tool Gateway was NEVER called
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it("rejects denying an already-denied or approved request with 409 Conflict", async () => {
      const pendingReq = createToolRequest(
        {
          tool_id: "delete_file",
          arguments: { path: "/tmp/data.csv" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      // First deny: 200
      const res1 = await request(app).post(`/api/approvals/${pendingReq.id}/deny`);
      expect(res1.status).toBe(200);

      // Second deny: 409 Conflict
      const res2 = await request(app).post(`/api/approvals/${pendingReq.id}/deny`);
      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain("Cannot deny request with status 'denied'");

      // Attempt to approve a denied request: 409 Conflict
      const res3 = await request(app).post(`/api/approvals/${pendingReq.id}/approve`);
      expect(res3.status).toBe(409);
      expect(res3.body.error).toContain("Cannot approve request with status 'denied'");
    });

    it("returns 404 Not Found when denying a nonexistent requestId", async () => {
      const res = await request(app).post("/api/approvals/req_fake_123/deny");

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("req_fake_123");
    });
  });

  describe("GET /api/approvals/pending", () => {
    it("returns only requests with status 'pending', strictly excluding approved, denied, allowed, and blocked ones", async () => {
      const db = getDatabase();

      // Create requests with different statuses
      createToolRequest(
        {
          tool_id: "create_database",
          arguments: { name: "pending_one" },
          tainted: false,
          risk_level: "HIGH",
          status: "pending",
        },
        db,
      );

      createToolRequest(
        {
          tool_id: "send_email",
          arguments: { to: "user@example.com" },
          tainted: false,
          risk_level: "MEDIUM",
          status: "approved",
        },
        db,
      );

      createToolRequest(
        {
          tool_id: "delete_database",
          arguments: { name: "denied_db" },
          tainted: true,
          risk_level: "HIGH",
          status: "denied",
        },
        db,
      );

      createToolRequest(
        {
          tool_id: "search_web",
          arguments: { query: "clean query" },
          tainted: false,
          risk_level: "LOW",
          status: "allowed",
        },
        db,
      );

      createToolRequest(
        {
          tool_id: "execute_command",
          arguments: { command: "dangerous" },
          tainted: true,
          risk_level: "CRITICAL",
          status: "blocked",
        },
        db,
      );

      createToolRequest(
        {
          tool_id: "create_database",
          arguments: { name: "pending_two" },
          tainted: false,
          risk_level: "HIGH",
          status: "pending",
        },
        db,
      );

      const res = await request(app).get("/api/approvals/pending");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      // Verify every returned item has status === 'pending'
      for (const item of res.body) {
        expect(item.status).toBe("pending");
      }

      // Verify order: oldest first (pending_one then pending_two)
      expect(res.body[0].arguments.name).toBe("pending_one");
      expect(res.body[1].arguments.name).toBe("pending_two");
    });
  });

  describe("Race Condition Guard", () => {
    it("handles two nearly simultaneous approve calls safely so Gateway executes only once", async () => {
      const pendingReq = createToolRequest(
        {
          tool_id: "create_database",
          arguments: { name: "race_db" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      // Fire two concurrent approve requests
      const [res1, res2] = await Promise.all([
        request(app).post(`/api/approvals/${pendingReq.id}/approve`),
        request(app).post(`/api/approvals/${pendingReq.id}/approve`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request should succeed (200), and the other should conflict (409)
      expect(statuses).toEqual([200, 409]);

      // Gateway must have been called exactly once
      expect(executeSpy).toHaveBeenCalledOnce();
    });
  });
});
