import { describe, it, expect, beforeEach } from "vitest";
import { firewallMiddleware, evaluatePolicy } from "./middleware";
import { resetStore, getStats, getToolRequestById } from "../store/memoryStore";
import { dispatchAuthorizedToolExecution } from "../execution/toolExecution";

describe("Firewall Middleware & Policy Engine Isolation Tests", () => {
  beforeEach(() => {
    resetStore();
  });

  it("LOW risk tool (summarize_document) is ALWAYS allowed regardless of source", async () => {
    const res = await firewallMiddleware(
      {
        tool: "summarize_document",
        arguments: { title: "Q3 Report", summary: "All systems nominal." },
      },
      { sourceType: "PDF", documentIsAttached: true },
    );

    expect(res.decision).toBe("ALLOW");
    expect(res.riskLevel).toBe("LOW");
    expect(res.trustLevel).toBe("UNTRUSTED");
    expect(res.tainted).toBe(false);

    // Can be executed safely
    const execRes = await dispatchAuthorizedToolExecution(res.requestId);
    expect(execRes.success).toBe(true);

    const updated = getToolRequestById(res.requestId);
    expect(updated?.status).toBe("resolved");
    expect(updated?.execution_result).toBeDefined();
  });

  it("LOW risk tool (search_web) is ALLOWED and returns verified web search results", async () => {
    const res = await firewallMiddleware(
      {
        tool: "search_web",
        arguments: { query: "AgentShield security architecture" },
      },
      { sourceType: "USER", documentIsAttached: false },
    );

    expect(res.decision).toBe("ALLOW");
    expect(res.riskLevel).toBe("LOW");
    expect(res.trustLevel).toBe("TRUSTED");
    expect(res.tainted).toBe(false);

    // Can be executed safely
    const execRes = await dispatchAuthorizedToolExecution(res.requestId);
    expect(execRes.success).toBe(true);
    expect(execRes.message).toContain("AgentShield");
    expect((execRes.output as { results: unknown[] }).results.length).toBeGreaterThan(0);

    const updated = getToolRequestById(res.requestId);
    expect(updated?.status).toBe("resolved");
    expect(updated?.execution_result).toBeDefined();
  });

  it("HIGH risk tool (execute_privileged_action) from PDF is TAINTED and BLOCKED", async () => {
    const res = await firewallMiddleware(
      {
        tool: "execute_privileged_action",
        arguments: { action: "export_all_data", target: "external" },
      },
      { sourceType: "PDF", documentIsAttached: true },
    );

    expect(res.decision).toBe("BLOCK");
    expect(res.riskLevel).toBe("HIGH");
    expect(res.trustLevel).toBe("UNTRUSTED");
    expect(res.tainted).toBe(true);
    expect(res.reason).toContain("BLOCKED by AgentShield runtime firewall");

    // Structural invariant check: MUST THROW if execution is attempted on BLOCKED request
    await expect(dispatchAuthorizedToolExecution(res.requestId)).rejects.toThrow(
      /SECURITY VIOLATION: Execution attempted on BLOCKED tool request/,
    );
  });

  it("HIGH risk tool directly requested by USER requires human CONFIRM", async () => {
    const res = await firewallMiddleware(
      {
        tool: "execute_privileged_action",
        arguments: { action: "rotate_keys", target: "auth_service" },
      },
      { sourceType: "USER", documentIsAttached: false },
    );

    expect(res.decision).toBe("CONFIRM");
    expect(res.riskLevel).toBe("HIGH");
    expect(res.trustLevel).toBe("TRUSTED");
    expect(res.tainted).toBe(false);

    // Cannot execute before approval
    await expect(dispatchAuthorizedToolExecution(res.requestId)).rejects.toThrow(
      /SECURITY VIOLATION: Execution attempted on unapproved pending request/,
    );
  });

  it("Records all decisions into in-memory store and updates stats accurately", async () => {
    await firewallMiddleware(
      { tool: "summarize_document", arguments: { title: "Doc 1", summary: "Summary" } },
      { sourceType: "PDF", documentIsAttached: true },
    );

    await firewallMiddleware(
      { tool: "execute_privileged_action", arguments: { action: "export", target: "external" } },
      { sourceType: "PDF", documentIsAttached: true },
    );

    const stats = getStats();
    expect(stats.total).toBe(2);
    expect(stats.allowed).toBe(1);
    expect(stats.blocked).toBe(1);
    expect(stats.confirmed).toBe(0);
  });
});
