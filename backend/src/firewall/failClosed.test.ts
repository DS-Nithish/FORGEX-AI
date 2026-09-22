import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import http from "http";
import { initDatabase, getDatabase } from "../db";
import { seedTools } from "../db/seed";
import { _setClient } from "../agent/llmClient";
import { runAgentTask } from "../agent/agentLoop";
import {
  getFailClosedDecision,
  isSimulateFirewallDown,
  setSimulateFirewallDown,
} from "./failClosed";
import { getSecurityEvents } from "../db/repositories/securityEventsRepository";
import * as gatewayModule from "../gateway/toolGateway";

function createMockGroqClient(toolCall?: { name: string; arguments: Record<string, unknown> }) {
  const tool_calls = toolCall
    ? [
        {
          id: "call_mock_fail_closed",
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
          id: "mock_chat_fail_closed",
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

describe("Fail-Safe / Fail-Closed Layer (Phase 19)", () => {
  let mockServer: http.Server | null = null;
  let mockServerPort = 0;

  beforeEach(async () => {
    vi.restoreAllMocks();
    setSimulateFirewallDown(false);
    const db = await initDatabase(":memory:");
    await seedTools(db);
  });

  afterEach(async () => {
    setSimulateFirewallDown(false);
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
      mockServer = null;
    }
  });

  describe("getFailClosedDecision() Unit Tests", () => {
    it("returns BLOCK for HIGH risk tool (create_database)", () => {
      const decision = getFailClosedDecision("create_database");
      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toContain("Risk [HIGH, CRITICAL]");
      expect(decision.reasoning).toContain("fail-closed default applied");
      expect(decision.reasoning).toContain("HIGH risk");
    });

    it("returns BLOCK for CRITICAL risk tool (delete_file)", () => {
      const decision = getFailClosedDecision("delete_file");
      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toContain("Risk [HIGH, CRITICAL]");
      expect(decision.reasoning).toContain("CRITICAL risk");
    });

    it("returns BLOCK for unrecognized/unknown tool", () => {
      const decision = getFailClosedDecision("unknown_dangerous_tool");
      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toContain("Risk [HIGH, CRITICAL]");
      expect(decision.reasoning).toContain("CRITICAL risk");
    });

    it("returns CONFIRM for LOW risk tool (search_web), never auto-ALLOW", () => {
      const decision = getFailClosedDecision("search_web");
      expect(decision.decision).toBe("CONFIRM");
      expect(decision.decision).not.toBe("ALLOW");
      expect(decision.matchedRule).toContain("Risk [LOW, MEDIUM]");
      expect(decision.reasoning).toContain("fail-closed default applied");
      expect(decision.reasoning).toContain("Human confirmation required");
    });

    it("returns CONFIRM for MEDIUM risk tool (send_email), never auto-ALLOW", () => {
      const decision = getFailClosedDecision("send_email");
      expect(decision.decision).toBe("CONFIRM");
      expect(decision.decision).not.toBe("ALLOW");
      expect(decision.matchedRule).toContain("Risk [LOW, MEDIUM]");
    });
  });

  describe("Firewall Endpoint Down (Connection Refused)", () => {
    // Port 59998 is closed/refused
    const DEAD_FIREWALL_URL = "http://127.0.0.1:59998/api/firewall/check";

    it("HIGH risk tool: returns BLOCK via fallback, Gateway is NEVER called", async () => {
      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "fail_closed_test_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Create database when firewall is down",
          userAuthorized: true,
          firewallUrl: DEAD_FIREWALL_URL,
        },
        getDatabase(),
      );

      // Verify fail-closed BLOCK decision
      expect(result.status).toBe("BLOCKED");
      expect(result.firewallResult?.policy.decision).toBe("BLOCK");
      expect(result.firewallResult?.policy.reasoning).toContain(
        "AgentShield unreachable — fail-closed default applied",
      );
      expect(result.toolExecutionResult?.success).toBe(false);

      // CRITICAL: Gateway must NEVER be called
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it("LOW risk tool: returns CONFIRM fallback, never auto-ALLOW, Gateway not called", async () => {
      const mock = createMockGroqClient({
        name: "search_web",
        arguments: { query: "fail closed low risk" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Search web when firewall is down",
          userAuthorized: true,
          firewallUrl: DEAD_FIREWALL_URL,
        },
        getDatabase(),
      );

      // Verify fail-closed CONFIRM decision (soft fallback, never ALLOW)
      expect(result.status).toBe("PENDING_APPROVAL");
      expect(result.firewallResult?.policy.decision).toBe("CONFIRM");
      expect(result.firewallResult?.policy.reasoning).toContain(
        "AgentShield unreachable — fail-closed default applied",
      );
      expect(result.firewallResult?.policy.reasoning).toContain("Human confirmation required");

      // Gateway must NOT be called
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Firewall Response Timeout", () => {
    it("aborts on timeout and applies fail-closed behavior rather than hanging indefinitely", async () => {
      // Start a hanging mock server that never responds
      await new Promise<void>((resolve) => {
        mockServer = http.createServer(() => {
          // Intentionally do not respond
        });
        mockServer.listen(0, "127.0.0.1", () => {
          const addr = mockServer!.address() as { port: number };
          mockServerPort = addr.port;
          resolve();
        });
      });

      const hangingUrl = `http://127.0.0.1:${mockServerPort}/api/firewall/check`;

      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "timeout_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const startTime = Date.now();

      // Pass an aggressive 100ms timeout
      const result = await runAgentTask(
        {
          task: "Create database with timeout",
          userAuthorized: true,
          firewallUrl: hangingUrl,
          firewallTimeoutMs: 100,
        },
        getDatabase(),
      );

      const durationMs = Date.now() - startTime;

      // Completed quickly around timeout threshold without hanging indefinitely
      expect(durationMs).toBeLessThan(1500);

      // Returned fail-closed BLOCK
      expect(result.status).toBe("BLOCKED");
      expect(result.firewallResult?.policy.decision).toBe("BLOCK");
      expect(result.firewallResult?.policy.reasoning).toContain(
        "AgentShield unreachable — fail-closed default applied",
      );
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Malformed Firewall Response Handling", () => {
    it("fails closed on missing 'decision' field, never crashing or silently ALLOWing", async () => {
      // Mock server returning malformed JSON (missing decision)
      await new Promise<void>((resolve) => {
        mockServer = http.createServer((_req, res) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ toolName: "create_database", message: "invalid payload" }));
        });
        mockServer.listen(0, "127.0.0.1", () => {
          const addr = mockServer!.address() as { port: number };
          mockServerPort = addr.port;
          resolve();
        });
      });

      const malformedUrl = `http://127.0.0.1:${mockServerPort}/api/firewall/check`;

      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "malformed_test_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Create database with malformed firewall response",
          userAuthorized: true,
          firewallUrl: malformedUrl,
        },
        getDatabase(),
      );

      // Fails closed to BLOCK, Gateway not called
      expect(result.status).toBe("BLOCKED");
      expect(result.firewallResult?.policy.decision).toBe("BLOCK");
      expect(result.firewallResult?.policy.reasoning).toContain(
        "AgentShield unreachable — fail-closed default applied",
      );
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Audit Trail Verification for Fail-Closed Events", () => {
    it("produces a security event with reasoning that clearly identifies it as a fallback decision", async () => {
      const DEAD_FIREWALL_URL = "http://127.0.0.1:59998/api/firewall/check";

      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "audit_fallback_db" },
      });
      _setClient(mock);

      const result = await runAgentTask(
        {
          task: "Audit test for fallback decision",
          userAuthorized: true,
          firewallUrl: DEAD_FIREWALL_URL,
        },
        getDatabase(),
      );

      expect(result.requestId).toBeDefined();
      const events = getSecurityEvents({ requestId: result.requestId! }, getDatabase());

      expect(events).toHaveLength(1);
      const event = events[0];

      expect(event.eventType).toBe("BLOCK");
      expect(event.matchedRule).toContain("Fail-Closed Fallback");
      expect(event.reasoning).toContain("AgentShield unreachable — fail-closed default applied");
      expect(event.reasoning).toContain("create_database carries HIGH risk");
    });
  });

  describe("SIMULATE_FIREWALL_DOWN Failure-Injection Mechanism", () => {
    it("triggers fail-closed fallback end-to-end when SIMULATE_FIREWALL_DOWN flag is active", async () => {
      // 1. Verify flag helper
      expect(isSimulateFirewallDown()).toBe(false);
      setSimulateFirewallDown(true);
      expect(isSimulateFirewallDown()).toBe(true);

      const mock = createMockGroqClient({
        name: "create_database",
        arguments: { name: "simulated_down_db" },
      });
      _setClient(mock);

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      // 2. Run agent task in in-process mode
      const result = await runAgentTask(
        {
          task: "Provision database during simulated security layer outage",
          userAuthorized: true,
        },
        getDatabase(),
      );

      // 3. Verify fail-closed BLOCK is applied end-to-end
      expect(result.status).toBe("BLOCKED");
      expect(result.firewallResult?.policy.decision).toBe("BLOCK");
      expect(result.firewallResult?.policy.reasoning).toContain(
        "AgentShield unreachable (SIMULATE_FIREWALL_DOWN active)",
      );
      expect(executeSpy).not.toHaveBeenCalled();

      // 4. Verify audit event
      const events = getSecurityEvents({ requestId: result.requestId! }, getDatabase());
      expect(events).toHaveLength(1);
      expect(events[0].reasoning).toContain("SIMULATE_FIREWALL_DOWN active");

      // 5. Turn off flag and verify normal operation resumes
      setSimulateFirewallDown(false);
      expect(isSimulateFirewallDown()).toBe(false);
    });
  });
});
