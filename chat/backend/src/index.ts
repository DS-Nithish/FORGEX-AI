import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { runAgentLoop } from "./agent/agentLoop";
import {
  getChatMessages,
  getRecentToolRequests,
  getSecurityEvents,
  getStats,
  getToolRequestById,
  updateToolRequest,
  resetStore,
  addChatMessage,
  saveUploadedDocument,
  getUploadedDocument,
  getAllUploadedDocuments,
} from "./store/memoryStore";
import { dispatchAuthorizedToolExecution } from "./execution/toolExecution";
import { generateFixturePdfs } from "./fixtures/generateFixtures";
import { extractDocument } from "./tools/extraction";

// Load environment variables
dotenv.config();
if (!process.env.GROQ_API_KEY && fs.existsSync(path.resolve(__dirname, "../../.env"))) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Ensure fixtures exist on startup
const fixturesDir = path.resolve(__dirname, "../fixtures");
const cleanPdfPath = path.join(fixturesDir, "clean-document.pdf");
const injectedPdfPath = path.join(fixturesDir, "injected-document.pdf");
const sampleCleanPath = path.join(fixturesDir, "sample-clean.pdf");
const sampleInjectedPath = path.join(fixturesDir, "sample-injected.pdf");

if (!fs.existsSync(cleanPdfPath) || !fs.existsSync(injectedPdfPath) || !fs.existsSync(sampleCleanPath) || !fs.existsSync(sampleInjectedPath)) {
  generateFixturePdfs(fixturesDir).catch((err) =>
    console.warn("[STARTUP] Error generating fixtures:", err),
  );
}

/**
 * Health check
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AgentShield Self-Contained In-Memory Security Engine",
    groqApiKeyConfigured: Boolean(process.env.GROQ_API_KEY),
    stats: getStats(),
  });
});

/**
 * GET /api/documents
 * Returns the fixture documents (without leaking injection status) plus any
 * uploaded custom documents.
 */
app.get("/api/documents", (_req: Request, res: Response) => {
  const customDocs = getAllUploadedDocuments().map((d) => ({
    id: d.id,
    name: d.name,
    description: "Custom User Uploaded PDF",
    size: d.size,
    uploaded: true,
  }));

  res.json([
    {
      id: "clean-doc",
      name: "clean-document.pdf",
      description: "Quarterly Operations & Infrastructure Review (Q3 2026)",
      size: "24 KB",
    },
    {
      id: "injected-doc",
      name: "injected-document.pdf",
      description: "Quarterly Security & Compliance Audit (Q3 2026)",
      size: "26 KB",
    },
    ...customDocs,
  ]);
});

/**
 * GET /api/documents/samples
 * Returns the test sample documents available for download.
 */
app.get("/api/documents/samples", (_req: Request, res: Response) => {
  res.json([
    {
      id: "sample-clean",
      name: "sample-clean.pdf",
      description: "Sample Clean PDF — Quarterly Operations Review (Safe)",
      size: "24 KB",
      downloadUrl: "/api/documents/sample-clean.pdf/download",
    },
    {
      id: "sample-injected",
      name: "sample-injected.pdf",
      description: "Sample Injected PDF — Security Audit with Prompt Injection",
      size: "26 KB",
      downloadUrl: "/api/documents/sample-injected.pdf/download",
    },
  ]);
});

/**
 * POST /api/documents/upload
 * Accepts a PDF file via base64 JSON payload: { name: string, base64: string }
 * Extracts text immediately to validate and caches for the agent loop.
 */
app.post("/api/documents/upload", async (req: Request, res: Response) => {
  const { name, base64 } = req.body;
  if (!name || !base64) {
    res.status(400).json({ error: "Missing document 'name' or 'base64' payload" });
    return;
  }

  try {
    // Strip data URI prefix if present (e.g. data:application/pdf;base64,...)
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.length === 0) {
      res.status(400).json({ error: "Uploaded file is empty" });
      return;
    }

    // Validate that it can be parsed as a PDF
    let extractedText = "";
    try {
      const extraction = await extractDocument(buffer);
      extractedText = extraction.text;
    } catch (parseErr: any) {
      console.warn("[UPLOAD] PDF parsing warning:", parseErr.message);
      // Still accept valid buffers
    }

    const docId = `doc_upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sizeKb = Math.round(buffer.length / 1024) || 1;
    const size = `${sizeKb} KB`;

    const uploadedDoc = saveUploadedDocument({
      id: docId,
      name: name.endsWith(".pdf") ? name : `${name}.pdf`,
      size,
      buffer,
      extractedText,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      document: {
        id: uploadedDoc.id,
        name: uploadedDoc.name,
        size: uploadedDoc.size,
        description: "Custom User Uploaded PDF",
        uploaded: true,
      },
    });
  } catch (err: any) {
    console.error("[UPLOAD ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to process uploaded document" });
  }
});

/**
 * GET /api/documents/:id/download
 * Serves the requested raw PDF file (sample, fixture, or user-uploaded).
 */
app.get("/api/documents/:id/download", (req: Request, res: Response) => {
  const { id } = req.params;
  const lower = id.toLowerCase();

  // Check if it's an uploaded document in memory
  const uploaded = getUploadedDocument(id);
  if (uploaded) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${uploaded.name}"`);
    res.send(uploaded.buffer);
    return;
  }

  // Check fixture/sample paths
  let filePath = cleanPdfPath;
  if (lower.includes("injected")) {
    filePath = fs.existsSync(sampleInjectedPath) ? sampleInjectedPath : injectedPdfPath;
  } else if (lower.includes("sample-clean") || lower.includes("clean")) {
    filePath = fs.existsSync(sampleCleanPath) ? sampleCleanPath : cleanPdfPath;
  }

  if (fs.existsSync(filePath)) {
    const filename = lower.includes("injected") ? "sample-injected.pdf" : "sample-clean.pdf";
    res.download(filePath, filename);
  } else {
    res.status(404).json({ error: "Document fixture not found" });
  }
});

/**
 * GET /api/chat/messages
 * Returns full conversation history for the active session.
 */
app.get("/api/chat/messages", (_req: Request, res: Response) => {
  const messages = getChatMessages();
  res.json({ messages });
});

/**
 * POST /api/chat/message
 * { message: string, documentId?: string }
 * Core chat interaction endpoint.
 */
app.post("/api/chat/message", async (req: Request, res: Response) => {
  const { message, documentId, enableWebSearch } = req.body;
  if (!message && !documentId) {
    res.status(400).json({ error: "Message or documentId required" });
    return;
  }

  try {
    const result = await runAgentLoop({
      message: message || "Please analyze this document and summarize its findings.",
      documentId,
      enableWebSearch: enableWebSearch !== false,
    });

    const messages = getChatMessages();
    res.json({
      success: true,
      messages,
      lastAgentMessage: result.agentMessage,
      firewallResult: result.firewallResult,
    });
  } catch (err: any) {
    console.error("[CHAT API ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to process message" });
  }
});

/**
 * POST /api/chat/approve/:requestId
 * Operator approves a pending CONFIRM tool call -> executes tool via isolated executor.
 */
app.post("/api/chat/approve/:requestId", async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const record = getToolRequestById(requestId);

  if (!record) {
    res.status(404).json({ error: `Tool request ${requestId} not found` });
    return;
  }

  if (record.decision === "BLOCK") {
    res.status(403).json({ error: "Cannot approve a BLOCKED request" });
    return;
  }

  try {
    // Mark record as resolved before execution
    updateToolRequest(requestId, { status: "resolved" });
    const execResult = await dispatchAuthorizedToolExecution(requestId);

    addChatMessage({
      id: `msg_${Date.now()}_approve`,
      role: "agent",
      content: `Tool '${record.tool_name}' was approved and executed successfully.\n\n${execResult.message}`,
      created_at: new Date().toISOString(),
    });

    // Sync approval to core backend
    const coreUrl = process.env.CORE_BACKEND_URL || "http://localhost:4000";
    fetch(`${coreUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        eventType: "APPROVED",
        toolName: record.tool_name,
        args: record.arguments,
        reasoning: `Approved by operator: ${record.tool_name}`,
        userAuthorized: true,
      }),
    }).catch(() => {});

    const messages = getChatMessages();
    res.json({
      success: true,
      executionResult: execResult,
      messages,
    });
  } catch (err: any) {
    console.error("[APPROVE ERROR]", err);
    res.status(500).json({ error: err.message || "Failed to approve tool request" });
  }
});

/**
 * POST /api/chat/deny/:requestId
 * Operator denies a pending CONFIRM tool call.
 */
app.post("/api/chat/deny/:requestId", (req: Request, res: Response) => {
  const { requestId } = req.params;
  const record = getToolRequestById(requestId);

  if (!record) {
    res.status(404).json({ error: `Tool request ${requestId} not found` });
    return;
  }

  updateToolRequest(requestId, { status: "denied" });

  addChatMessage({
    id: `msg_${Date.now()}_deny`,
    role: "agent",
    content: `Tool '${record.tool_name}' execution was denied by operator.`,
    created_at: new Date().toISOString(),
  });

  // Sync denial to core backend
  const coreUrl = process.env.CORE_BACKEND_URL || "http://localhost:4000";
  fetch(`${coreUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId,
      eventType: "DENIED",
      toolName: record.tool_name,
      args: record.arguments,
      reasoning: `Denied by operator: ${record.tool_name}`,
      userAuthorized: false,
    }),
  }).catch(() => {});

  const messages = getChatMessages();
  res.json({
    success: true,
    messages,
  });
});

/**
 * GET /api/dashboard
 * Live dashboard endpoint showing stats, recent requests, and security events.
 */
app.get("/api/dashboard", (_req: Request, res: Response) => {
  res.json({
    stats: getStats(),
    recentRequests: getRecentToolRequests(15),
    recentEvents: getSecurityEvents(20),
  });
});

/**
 * Sync all existing in-memory requests to the core backend
 */
export function syncExistingRequestsToCore(): void {
  const requests = getRecentToolRequests(100);
  if (requests.length === 0) return;
  const coreUrl = process.env.CORE_BACKEND_URL || "http://localhost:4000";
  const events = requests.map((req) => ({
    requestId: req.id,
    eventType: req.decision,
    toolName: req.tool_name,
    args: req.arguments,
    provenance: [{ source: req.source_type, trust: req.trust_level, type: req.source_type }],
    taint: {
      tainted: req.tainted,
      matchedSources: req.tainted ? ["uploaded_document.pdf"] : [],
      matchedTerms: req.tainted ? ["indirect_prompt_injection"] : [],
    },
    risk: { risk: req.risk_level, known: true },
    matchedRule:
      req.decision === "BLOCK"
        ? "Prompt Injection Defense (Blocked Tainted High-Risk Tool)"
        : req.decision === "CONFIRM"
        ? "Human Confirmation Required (High-Risk Action)"
        : "Standard Safe Execution (Low-Risk Tool)",
    reasoning: req.reason,
    userAuthorized: req.decision === "ALLOW" && req.trust_level === "TRUSTED",
    timestamp: req.created_at,
  }));

  fetch(`${coreUrl}/api/events/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  }).catch(() => {});
}

/**
 * POST /api/chat/reset or POST /api/chat/new
 * Resets the in-memory state for a clean demo run.
 */
app.post(["/api/chat/reset", "/api/chat/new"], (_req: Request, res: Response) => {
  resetStore();
  res.json({
    success: true,
    message: "In-memory session reset successfully.",
    messages: [],
    stats: getStats(),
  });
});

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`AgentShield In-Memory Backend running on http://localhost:${PORT}`);
    console.log(`[FIREWALL] Active middleware: firewallMiddleware`);
    console.log(`[STORAGE] 100% in-memory store (no database, no ORM, no external dependencies)`);
    console.log(`[GROQ] API Key: ${process.env.GROQ_API_KEY ? "Configured" : "Simulated Fallback Mode"}`);

    // Initial sync
    setTimeout(syncExistingRequestsToCore, 1000);
  });
}

export { app };
