import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase, getDatabase } from "../db";
import { seedTools } from "../db/seed";
import { _setClient } from "../agent/llmClient";
import { runAgentTask } from "../agent/agentLoop";
import {
  writeSecurityEvent,
  getSecurityEvents,
} from "../db/repositories/securityEventsRepository";
import { createToolRequest } from "../db/repositories/toolRequestsRepository";
import * as gatewayModule from "../gateway/toolGateway";

function createMockGroqClient(toolCall?: { name: string; arguments: Record<string, unknown> }) {
  const tool_calls = toolCall
    ? [
        {
          id: "call_mock_audit_test",
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
          id: "mock_chat_audit_test",
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

describe("Security Audit Log (Phase 17 - security_events & /api/events)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const db = await initDatabase(":memory:");
    await seedTools(db);
  });

  describe("Demo 1 Flow: CONFIRM → Approve", () => {
    it("produces exactly 2 events (CONFIRM then APPROVED), both with matching requestId", async () => {
      // 1. Mock agent requesting a HIGH risk tool without taint -> CONFIRM
      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "demo1_orders_db" },
      });
      _setClient(mock);

      const agentResult = await runAgentTask(
        {
          task: "Provision demo1_orders_db",
          userAuthorized: true,
        },
        getDatabase(),
      );

      expect(agentResult.status).toBe("PENDING_APPROVAL");
      expect(agentResult.requestId).toBeDefined();
      const requestId = agentResult.requestId!;

      // 2. Verify exactly 1 event exists so far: CONFIRM
      const initialEvents = getSecurityEvents({ requestId }, getDatabase());
      expect(initialEvents).toHaveLength(1);
      expect(initialEvents[0].eventType).toBe("CONFIRM");
      expect(initialEvents[0].requestId).toBe(requestId);
      expect(initialEvents[0].toolName).toBe("create_database");
      expect(initialEvents[0].args).toEqual({ name: "demo1_orders_db" });

      // 3. Human approves the request via API
      const approveRes = await request(app).post(`/api/approvals/${requestId}/approve`);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe("approved");

      // 4. Verify exactly 2 events exist now: CONFIRM and APPROVED, both matching requestId
      const finalEvents = getSecurityEvents({ requestId }, getDatabase());
      expect(finalEvents).toHaveLength(2);

      // getSecurityEvents returns newest first
      const approvedEvent = finalEvents[0];
      const confirmEvent = finalEvents[1];

      expect(approvedEvent.eventType).toBe("APPROVED");
      expect(approvedEvent.requestId).toBe(requestId);
      expect(approvedEvent.toolName).toBe("create_database");
      expect(approvedEvent.userAuthorized).toBe(true);

      expect(confirmEvent.eventType).toBe("CONFIRM");
      expect(confirmEvent.requestId).toBe(requestId);
      expect(confirmEvent.toolName).toBe("create_database");
    });
  });

  describe("Demo 2 Flow: Injection BLOCK", () => {
    it("produces exactly 1 event (BLOCK), with taint details correctly captured in the row", async () => {
      // Malicious document injection scenario:
      // Document contains attacker_db injection; agent requests create_database(attacker_db)
      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "attacker_db", privileges: "ALL" },
      });
      _setClient(mock);

      const agentResult = await runAgentTask(
        {
          task: "Read this document and create database",
          documentId: "doc_pdf_malicious_001",
        },
        getDatabase(),
      );

      expect(agentResult.status).toBe("BLOCKED");
      expect(agentResult.requestId).toBeDefined();
      const requestId = agentResult.requestId!;

      // Verify exactly 1 event exists: BLOCK
      const events = getSecurityEvents({ requestId }, getDatabase());
      expect(events).toHaveLength(1);

      const blockEvent = events[0];
      expect(blockEvent.eventType).toBe("BLOCK");
      expect(blockEvent.requestId).toBe(requestId);
      expect(blockEvent.toolName).toBe("create_database");
      expect(blockEvent.args).toEqual({ name: "attacker_db", privileges: "ALL" });

      // Verify taint details are correctly captured
      expect(blockEvent.taint).toBeDefined();
      expect(blockEvent.taint.tainted).toBe(true);
      expect(blockEvent.taint.matchedTerms).toContain("attacker_db");
      expect(blockEvent.taint.matchedSources.length).toBeGreaterThan(0);

      // Verify risk and rule details
      expect(blockEvent.risk.risk).toBe("HIGH");
      expect(blockEvent.matchedRule).toContain("Rule 1");
    });
  });

  describe("Deny Flow: CONFIRM → Deny", () => {
    it("produces CONFIRM then DENIED (2 events), and Gateway is NEVER called", async () => {
      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "sensitive_financial_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const agentResult = await runAgentTask(
        {
          task: "Set up sensitive database",
          userAuthorized: true,
        },
        getDatabase(),
      );

      expect(agentResult.status).toBe("PENDING_APPROVAL");
      const requestId = agentResult.requestId!;

      // Human denies the request via API
      const denyRes = await request(app).post(`/api/approvals/${requestId}/deny`);
      expect(denyRes.status).toBe(200);
      expect(denyRes.body.status).toBe("denied");

      // Verify Gateway was NEVER called
      expect(executeSpy).not.toHaveBeenCalled();

      // Verify 2 events exist: DENIED then CONFIRM (newest first)
      const events = getSecurityEvents({ requestId }, getDatabase());
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe("DENIED");
      expect(events[0].requestId).toBe(requestId);
      expect(events[0].userAuthorized).toBe(false);

      expect(events[1].eventType).toBe("CONFIRM");
      expect(events[1].requestId).toBe(requestId);
    });
  });

  describe("GET /api/events (Read & Filter Endpoint)", () => {
    beforeEach(() => {
      // Seed corresponding tool_requests first to satisfy foreign key constraint
      createToolRequest(
        {
          id: "req_block_01",
          tool_id: "delete_file",
          arguments: { path: "/etc/passwd" },
          tainted: true,
          risk_level: "CRITICAL",
          decision: "BLOCK",
          status: "blocked",
        },
        getDatabase(),
      );

      createToolRequest(
        {
          id: "req_allow_01",
          tool_id: "search_web",
          arguments: { query: "AgentShield documentation" },
          tainted: false,
          risk_level: "LOW",
          decision: "ALLOW",
          status: "allowed",
        },
        getDatabase(),
      );

      createToolRequest(
        {
          id: "req_confirm_01",
          tool_id: "create_database",
          arguments: { name: "analytics_db" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      // Seed a variety of events directly for filtering tests
      writeSecurityEvent(
        {
          requestId: "req_block_01",
          eventType: "BLOCK",
          toolName: "delete_file",
          args: { path: "/etc/passwd" },
          provenance: [],
          taint: { tainted: true, matchedSources: ["src_malicious"], matchedTerms: ["passwd"] },
          risk: { risk: "CRITICAL", known: true },
          matchedRule: "Rule 1: tainted === true AND risk in [HIGH, CRITICAL]",
          reasoning: "Attempted sensitive file deletion with tainted input",
          userAuthorized: false,
          timestamp: "2026-09-20T10:00:00.000Z",
        },
        getDatabase(),
      );

      writeSecurityEvent(
        {
          requestId: "req_allow_01",
          eventType: "ALLOW",
          toolName: "search_web",
          args: { query: "AgentShield documentation" },
          provenance: [],
          taint: { tainted: false, matchedSources: [], matchedTerms: [] },
          risk: { risk: "LOW", known: true },
          matchedRule: "Rule 5: userAuthorized === true",
          reasoning: "Safe read-only search",
          userAuthorized: true,
          timestamp: "2026-09-21T12:00:00.000Z",
        },
        getDatabase(),
      );

      writeSecurityEvent(
        {
          requestId: "req_confirm_01",
          eventType: "CONFIRM",
          toolName: "create_database",
          args: { name: "analytics_db" },
          provenance: [],
          taint: { tainted: false, matchedSources: [], matchedTerms: [] },
          risk: { risk: "HIGH", known: true },
          matchedRule: "Rule 4: trustLevel === 'trusted' AND risk in [HIGH, CRITICAL]",
          reasoning: "High-risk tool requires human authorization",
          userAuthorized: false,
          timestamp: "2026-09-22T08:00:00.000Z",
        },
        getDatabase(),
      );
    });

    it("filters by eventType=BLOCK and returns only BLOCK rows", async () => {
      const res = await request(app).get("/api/events?eventType=BLOCK");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].eventType).toBe("BLOCK");
      expect(res.body[0].toolName).toBe("delete_file");
    });

    it("filters by requestId correctly", async () => {
      const res = await request(app).get("/api/events?requestId=req_allow_01");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].requestId).toBe("req_allow_01");
      expect(res.body[0].eventType).toBe("ALLOW");
    });

    it("filters by toolName correctly", async () => {
      const res = await request(app).get("/api/events?toolName=create_database");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].toolName).toBe("create_database");
      expect(res.body[0].eventType).toBe("CONFIRM");
    });

    it("respects limit parameter and orders newest first", async () => {
      const res = await request(app).get("/api/events?limit=2");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      // Newest is 2026-09-22 (CONFIRM), then 2026-09-21 (ALLOW)
      expect(res.body[0].requestId).toBe("req_confirm_01");
      expect(res.body[1].requestId).toBe("req_allow_01");
    });

    it("supports date range filtering (startDate / endDate)", async () => {
      const res = await request(app).get(
        "/api/events?startDate=2026-09-21T00:00:00.000Z&endDate=2026-09-21T23:59:59.999Z",
      );
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].requestId).toBe("req_allow_01");
    });
  });

  describe("Fail-Safe Failure Mode: Event Write Failure Resilience", () => {
    it("does not crash or abort firewall decision when DB write fails, logs error with console.error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Simulate a DB write failure when writing security events
      const db = getDatabase();
      const origPrepare = db.prepare.bind(db);
      vi.spyOn(db, "prepare").mockImplementation((sql: string) => {
        if (sql.includes("INSERT INTO security_events")) {
          throw new Error("Simulated SQLite disk I/O error");
        }
        return origPrepare(sql);
      });

      const mock = createMockGroqClient({
        name: "search_web",
        arguments: { query: "test resilience" },
      });
      _setClient(mock);

      // Run agent task (which attempts to write an ALLOW security event)
      const result = await runAgentTask(
        {
          task: "Search web for resilience testing",
          userAuthorized: true,
        },
        db,
      );

      // Verify firewall decision was NOT blocked or delayed; execution proceeded
      expect(result.status).toBe("EXECUTED");
      expect(result.toolExecutionResult?.success).toBe(true);

      // Verify failure was logged via console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some((arg) => typeof arg === "string" && arg.includes("[AUDIT]")),
        ),
      ).toBe(true);
    });
  });

  describe("Append-Only Immutability Verification", () => {
    it("never mutates or overwrites existing rows; each transition adds a distinct record", async () => {
      // 1. Manually seed a pending tool request
      const pendingReq = createToolRequest(
        {
          tool_id: "create_database",
          arguments: { name: "immutable_test_db" },
          tainted: false,
          risk_level: "HIGH",
          decision: "CONFIRM",
          status: "pending",
        },
        getDatabase(),
      );

      // Initial CONFIRM event
      const initialEvent = writeSecurityEvent(
        {
          requestId: pendingReq.id,
          eventType: "CONFIRM",
          toolName: "create_database",
          args: { name: "immutable_test_db" },
          provenance: [],
          taint: { tainted: false, matchedSources: [], matchedTerms: [] },
          risk: { risk: "HIGH", known: true },
          matchedRule: "Rule 4: HIGH risk requires confirmation",
          reasoning: "Confirmation required",
          userAuthorized: true,
        },
        getDatabase(),
      );
      expect(initialEvent).not.toBeNull();

      // 2. Human approves via API
      await request(app).post(`/api/approvals/${pendingReq.id}/approve`);

      // 3. Query all events for this request
      const events = getSecurityEvents({ requestId: pendingReq.id }, getDatabase());
      expect(events).toHaveLength(2);

      // Ensure the initial event is completely unchanged and exists alongside the new APPROVED event
      const originalConfirmed = events.find((e) => e.eventType === "CONFIRM");
      const newlyApproved = events.find((e) => e.eventType === "APPROVED");

      expect(originalConfirmed).toBeDefined();
      expect(newlyApproved).toBeDefined();
      expect(originalConfirmed?.id).not.toBe(newlyApproved?.id);
      expect(originalConfirmed?.eventType).toBe("CONFIRM");
      expect(newlyApproved?.eventType).toBe("APPROVED");
    });
  });
});
