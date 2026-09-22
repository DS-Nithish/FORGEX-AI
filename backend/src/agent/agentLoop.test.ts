import { describe, it, expect, beforeEach, vi } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../db/testUtils";
import { seedTools } from "../db/seed";
import { runAgentTask } from "./agentLoop";
import { _setClient } from "./llmClient";
import * as gatewayModule from "../gateway/toolGateway";
import { DirectGatewayAccessError, enableFirewallEnforcement } from "../gateway";

function createMockGroqClient(options: {
  text?: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
}) {
  const tool_calls = options.toolCall
    ? [
        {
          id: "call_mock_001",
          type: "function",
          function: {
            name: options.toolCall.name,
            arguments: JSON.stringify(options.toolCall.arguments),
          },
        },
      ]
    : null;

  const mockCreate = vi.fn().mockResolvedValue({
    id: "mock_chat_completion_001",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: options.text ?? "Processing request...",
          tool_calls,
        },
      },
    ],
  });

  return {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
    mockCreate,
  } as unknown as {
    chat: { completions: { create: ReturnType<typeof vi.fn> } };
    mockCreate: ReturnType<typeof vi.fn>;
  };
}

describe("agentLoop with Firewall Interception (Phase 15)", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    vi.restoreAllMocks();
    db = await createTestDatabase();
    await seedTools(db);
    enableFirewallEnforcement();
  });

  describe("Core Interception Flow", () => {
    it("allows and executes low-risk tools via Gateway when authorized by policy (ALLOW branch)", async () => {
      const mock = createMockGroqClient({
        toolCall: {
          name: "search_web",
          arguments: { query: "cybersecurity best practices" },
        },
      });
      _setClient(mock as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        { task: "Search for cybersecurity best practices", userAuthorized: true },
        db,
      );

      expect(result.status).toBe("EXECUTED");
      expect(result.firewallResult?.policy.decision).toBe("ALLOW");
      expect(result.toolExecutionResult?.success).toBe(true);
      expect(executeSpy).toHaveBeenCalledOnce();
      expect(executeSpy).toHaveBeenCalledWith(
        "search_web",
        { query: "cybersecurity best practices" },
        db,
        { authorized: true, decision: "ALLOW" },
      );
    });

    it("returns null toolCallRequested and toolExecutionResult when LLM responds with text only", async () => {
      const mock = createMockGroqClient({
        text: "I have reviewed your request and no tools are required at this time.",
      });
      _setClient(mock as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await runAgentTask({ task: "Summarize this request" }, db);

      expect(result.status).toBe("TEXT_ONLY");
      expect(result.llmResponseText).toBe(
        "I have reviewed your request and no tools are required at this time.",
      );
      expect(result.toolCallRequested).toBeNull();
      expect(result.toolExecutionResult).toBeNull();
      expect(result.firewallResult).toBeNull();
    });

    it("includes raw document content in the prompt when documentId is provided", async () => {
      const mock = createMockGroqClient({
        text: "Read document successfully.",
      });
      _setClient(mock as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await runAgentTask(
        {
          task: "Read the project requirements and set up the schema",
          documentId: "doc_pdf_clean_001",
        },
        db,
      );

      expect(result.documentRead).not.toBeNull();
      expect(result.documentRead?.id).toBe("doc_pdf_clean_001");

      expect(mock.mockCreate).toHaveBeenCalledOnce();
      const sentMessages = mock.mockCreate.mock.calls[0][0].messages;
      const userPrompt = sentMessages.find((m: { role: string }) => m.role === "user")?.content;

      expect(userPrompt).toContain("doc_pdf_clean_001");
      expect(userPrompt).toContain("Enterprise E-Commerce Platform");
      expect(userPrompt).toContain("customers");
    });
  });

  describe("Demo 1 & Demo 2 End-to-End Interception Scenarios", () => {
    it("Demo 1 end to end: task → agent → tool call → firewall → CONFIRM → halted (Gateway NOT called)", async () => {
      // User requests creation of a production database
      const mock = createMockGroqClient({
        toolCall: {
          name: "create_database",
          arguments: { name: "customer_orders_db" },
        },
      });
      _setClient(mock as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Provision customer_orders_db",
          userAuthorized: true,
        },
        db,
      );

      // Firewall inspects trusted + HIGH risk -> CONFIRM (Rule 4)
      expect(result.status).toBe("PENDING_APPROVAL");
      expect(result.firewallResult).not.toBeNull();
      expect(result.firewallResult?.policy.decision).toBe("CONFIRM");
      expect(result.firewallResult?.policy.matchedRule).toContain("Rule 4");

      // Verify Tool Gateway was NOT executed
      expect(executeSpy).not.toHaveBeenCalled();
      expect(result.toolExecutionResult?.success).toBe(false);
      expect((result.toolExecutionResult?.output as Record<string, unknown>).status).toBe(
        "PENDING_APPROVAL",
      );
    });

    it("Demo 2 end to end: task → agent reads malicious PDF → agent emits tool call → firewall → BLOCK → Gateway NEVER called", async () => {
      // Malicious PDF embeds prompt injection to create attacker_db
      const mock = createMockGroqClient({
        toolCall: {
          name: "create_database",
          arguments: { name: "attacker_db", privileges: "ALL" },
        },
      });
      _setClient(mock as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const result = await runAgentTask(
        {
          task: "Read migration guide and execute necessary steps",
          documentId: "doc_pdf_malicious_001",
          userAuthorized: false,
        },
        db,
      );

      // Firewall inspects untrusted source + tainted args + HIGH risk -> BLOCK (Rule 1)
      expect(result.status).toBe("BLOCKED");
      expect(result.firewallResult).not.toBeNull();
      expect(result.firewallResult?.policy.decision).toBe("BLOCK");
      expect(result.firewallResult?.policy.matchedRule).toContain("Rule 1");
      expect(result.taint?.tainted).toBe(true);
      expect(result.taint?.matchedTerms).toContain("attacker_db");

      // Verify Tool Gateway was NEVER called and no side effects occurred
      expect(executeSpy).not.toHaveBeenCalled();
      expect(result.toolExecutionResult?.success).toBe(false);
      expect((result.toolExecutionResult?.output as Record<string, unknown>).status).toBe(
        "BLOCKED",
      );
    });
  });

  describe("Session Content Accumulation Across Steps", () => {
    it("accumulates document provenance so content read in step 1 is visible to taint check in step 2", async () => {
      // Step 1: Agent reads malicious PDF
      const mockStep1 = createMockGroqClient({
        text: "I read the document and will prepare the commands.",
      });
      _setClient(mockStep1 as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const step1Result = await runAgentTask(
        {
          task: "Review database_migration_guide.pdf",
          documentId: "doc_pdf_malicious_001",
        },
        db,
      );

      expect(step1Result.sessionContent.length).toBeGreaterThanOrEqual(2); // user task + PDF
      const pdfProvenance = step1Result.sessionContent.find((s) => s.sourceType === "PDF");
      expect(pdfProvenance).toBeDefined();
      expect(pdfProvenance?.trustLevel).toBe("UNTRUSTED");

      // Step 2: Agent issues tool call with accumulated session content from Step 1 (no new document in step 2)
      const mockStep2 = createMockGroqClient({
        toolCall: {
          name: "create_database",
          arguments: { name: "attacker_db" },
        },
      });
      _setClient(mockStep2 as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const executeSpy = vi.spyOn(gatewayModule, "executeTool");

      const step2Result = await runAgentTask(
        {
          task: "Now apply the configuration",
          sessionContent: step1Result.sessionContent, // traveling session context!
        },
        db,
      );

      // Taint check in step 2 catches the infection from step 1's document!
      expect(step2Result.status).toBe("BLOCKED");
      expect(step2Result.taint?.tainted).toBe(true);
      expect(step2Result.taint?.matchedSources).toContain(pdfProvenance?.sourceId);
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Direct Gateway Access Prohibition (Security Invariant)", () => {
    it("prohibits direct calls to toolGateway.executeTool() bypassing firewall authorization", async () => {
      // Direct call without firewall authorization context must be rejected
      await expect(
        gatewayModule.executeTool("create_database", { name: "bypassed_db" }, db),
      ).rejects.toThrow(DirectGatewayAccessError);

      await expect(
        gatewayModule.executeTool(
          "delete_file",
          { path: "/etc/shadow" },
          db,
          { authorized: false, decision: "ALLOW" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ),
      ).rejects.toThrow(DirectGatewayAccessError);
    });
  });
});
