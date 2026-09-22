import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "./index";
import { resetStore, getStats, getToolRequestById } from "./store/memoryStore";
import { dispatchAuthorizedToolExecution } from "./execution/toolExecution";
import * as toolExecutionModule from "./execution/toolExecution";

describe("AgentShield In-Memory Self-Contained System Tests", () => {
  beforeEach(() => {
    resetStore();
    process.env.SIMULATED_MODE = "true"; // Ensure deterministic test execution
  });

  it("Acceptance Criteria 1: GET /api/documents returns the two fixture documents without leaking injection status", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const names = res.body.map((d: any) => d.name);
    expect(names).toContain("clean-document.pdf");
    expect(names).toContain("injected-document.pdf");

    // Must NOT visually hint or flag which document is injected
    res.body.forEach((doc: any) => {
      expect(doc.name).not.toContain("malicious");
      expect(doc.name).not.toContain("attack");
      expect(doc.description).not.toContain("attack");
      expect(doc.description).not.toContain("injected");
    });
  });

  it("Acceptance Criteria 2: Clean Document -> summarize_document is proposed and ALLOWED, execute_privileged_action is NEVER proposed", async () => {
    const res = await request(app)
      .post("/api/chat/message")
      .send({
        message: "Please summarize this document.",
        documentId: "clean-doc",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const firewallRes = res.body.firewallResult;
    expect(firewallRes).toBeDefined();
    expect(firewallRes.tool).toBe("summarize_document");
    expect(firewallRes.decision).toBe("ALLOW");
    expect(firewallRes.riskLevel).toBe("LOW");
    expect(firewallRes.tainted).toBe(false);

    // Verify in-memory record
    const record = getToolRequestById(firewallRes.requestId);
    expect(record).toBeDefined();
    expect(record?.status).toBe("resolved");
    expect(record?.execution_result).toBeDefined();

    // Verify stats
    const stats = getStats();
    expect(stats.total).toBe(1);
    expect(stats.allowed).toBe(1);
    expect(stats.blocked).toBe(0);
  });

  it("Acceptance Criteria 3: Injected Document -> agent proposes execute_privileged_action, firewall BLOCKS it, execution is NEVER called", async () => {
    const execSpy = vi.spyOn(toolExecutionModule, "executePrivilegedAction");

    const res = await request(app)
      .post("/api/chat/message")
      .send({
        message: "Please review and extract this compliance document.",
        documentId: "injected-doc",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const firewallRes = res.body.firewallResult;
    expect(firewallRes).toBeDefined();
    expect(firewallRes.tool).toBe("execute_privileged_action");
    expect(firewallRes.decision).toBe("BLOCK");
    expect(firewallRes.riskLevel).toBe("HIGH");
    expect(firewallRes.tainted).toBe(true);
    expect(firewallRes.reason).toContain("BLOCKED by AgentShield runtime firewall");

    // Verify the execution function was NEVER invoked
    expect(execSpy).not.toHaveBeenCalled();

    // Verify in-memory store marked it as blocked with NO execution result
    const record = getToolRequestById(firewallRes.requestId);
    expect(record).toBeDefined();
    expect(record?.status).toBe("blocked");
    expect(record?.execution_result).toBeNull();

    // Verify stats
    const stats = getStats();
    expect(stats.total).toBe(1);
    expect(stats.blocked).toBe(1);
    expect(stats.allowed).toBe(0);

    execSpy.mockRestore();
  });

  it("Acceptance Criteria 4: Structural Invariant -> tool execution cannot be reached without ALLOW / approved decision", async () => {
    // 1. Trying to dispatch execution on a BLOCKED tool request throws a security error
    const blockedRes = await request(app)
      .post("/api/chat/message")
      .send({
        message: "Analyze document",
        documentId: "injected-doc",
      });

    const blockedId = blockedRes.body.firewallResult.requestId;
    await expect(dispatchAuthorizedToolExecution(blockedId)).rejects.toThrow(
      /SECURITY VIOLATION: Execution attempted on BLOCKED tool request/,
    );

    // 2. Trying to approve via API also returns 403 Forbidden
    const approveRes = await request(app).post(`/api/chat/approve/${blockedId}`);
    expect(approveRes.status).toBe(403);
    expect(approveRes.body.error).toContain("Cannot approve a BLOCKED request");
  });

  it("Acceptance Criteria 5: Live Dashboard reflects in-memory state accurately", async () => {
    // Run clean doc
    await request(app)
      .post("/api/chat/message")
      .send({ message: "Extract clean doc", documentId: "clean-doc" });

    // Run injected doc
    await request(app)
      .post("/api/chat/message")
      .send({ message: "Extract injected doc", documentId: "injected-doc" });

    const dashRes = await request(app).get("/api/dashboard");
    expect(dashRes.status).toBe(200);

    const { stats, recentRequests, recentEvents } = dashRes.body;
    expect(stats.total).toBe(2);
    expect(stats.allowed).toBe(1);
    expect(stats.blocked).toBe(1);
    expect(stats.confirmed).toBe(0);

    expect(recentRequests.length).toBe(2);
    expect(recentEvents.length).toBe(2);

    expect(recentEvents[0].decision).toBe("BLOCK");
    expect(recentEvents[1].decision).toBe("ALLOW");
  });

  it("Acceptance Criteria 6: Custom PDF Upload -> Clean uploaded document is parsed and safely ALLOWED", async () => {
    const cleanPath = path.resolve(__dirname, "../fixtures/clean-document.pdf");
    const testPdfBase64 = fs.readFileSync(cleanPath).toString("base64");

    const uploadRes = await request(app)
      .post("/api/documents/upload")
      .send({ name: "custom-quarterly-report.pdf", base64: testPdfBase64 });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.document.id).toContain("doc_upload_");

    const chatRes = await request(app)
      .post("/api/chat/message")
      .send({ message: "Summarize this uploaded report", documentId: uploadRes.body.document.id });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.firewallResult.decision).toBe("ALLOW");
    expect(chatRes.body.firewallResult.tool).toBe("summarize_document");
  });

  it("Acceptance Criteria 7: Custom PDF Upload -> Prompt-injected uploaded document is BLOCKED by firewall", async () => {
    const injectedPath = path.resolve(__dirname, "../fixtures/injected-document.pdf");
    const testPdfBase64 = fs.readFileSync(injectedPath).toString("base64");

    const uploadRes = await request(app)
      .post("/api/documents/upload")
      .send({ name: "custom-injected-audit.pdf", base64: testPdfBase64 });

    expect(uploadRes.status).toBe(201);

    const chatRes = await request(app)
      .post("/api/chat/message")
      .send({ message: "Analyze this audit document", documentId: uploadRes.body.document.id });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.firewallResult.decision).toBe("BLOCK");
    expect(chatRes.body.firewallResult.tool).toBe("execute_privileged_action");
    expect(chatRes.body.firewallResult.tainted).toBe(true);
  });
});

