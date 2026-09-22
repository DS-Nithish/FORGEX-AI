import { Router, Request, Response, NextFunction } from "express";
import {
  getSecurityEvents,
  createSecurityEvent,
  SecurityEventFilter,
} from "../db/repositories/securityEventsRepository";
import {
  getToolRequestById,
  createToolRequest,
  updateToolRequestStatus,
} from "../db/repositories/toolRequestsRepository";
import { getToolById, createTool } from "../db/repositories/toolsRepository";
import { getDatabase, saveDatabase } from "../db/init";
import { execute } from "../db/repositories/helpers";
import { explainDecision, formatExplanationAsText } from "../services/explainability";

const router = Router();

/**
 * GET /api/events
 *
 * Query security audit events ordered newest first.
 * Supports filtering by eventType, requestId, toolName, limit, and date range.
 *
 * Query params:
 * - limit: number (default 50)
 * - eventType: 'ALLOW' | 'CONFIRM' | 'BLOCK' | 'APPROVED' | 'DENIED'
 * - requestId: string
 * - toolName: string
 * - startDate / from / since: ISO date string
 * - endDate / to / until: ISO date string
 */
router.get("/", (req: Request, res: Response, next: NextFunction): void => {
  try {
    const {
      limit,
      eventType,
      requestId,
      toolName,
      startDate,
      from,
      since,
      endDate,
      to,
      until,
    } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;

    const filters: SecurityEventFilter = {
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
      eventType: typeof eventType === "string" ? eventType : undefined,
      requestId: typeof requestId === "string" ? requestId : undefined,
      toolName: typeof toolName === "string" ? toolName : undefined,
      startDate: (startDate || from || since) as string | undefined,
      endDate: (endDate || to || until) as string | undefined,
    };

    const events = getSecurityEvents(filters);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/:requestId/explain
 *
 * Fetches the event(s) for the specified requestId, generates structured
 * explainability objects via explainDecision(), and returns them.
 */
router.get("/:requestId/explain", (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { requestId } = req.params;
    const events = getSecurityEvents({ requestId });

    if (!events || events.length === 0) {
      res.status(404).json({ error: `No security events found for requestId '${requestId}'` });
      return;
    }

    // Chronological order (oldest first) so CONFIRM comes before APPROVED/DENIED
    const chronologicalEvents = [...events].reverse();
    const explanations = chronologicalEvents.map((evt) => explainDecision(evt));

    // Support text/plain format
    if (req.query.format === "text" || req.headers.accept === "text/plain") {
      const text = explanations.map(formatExplanationAsText).join("\n\n---\n\n");
      res.type("text/plain").send(text);
      return;
    }

    if (explanations.length === 1 && req.query.all !== "true") {
      res.json(explanations[0]);
    } else {
      res.json(explanations);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to process and record a single security event into both tool_requests
 * and security_events repositories.
 */
function recordInboundEvent(input: any) {
  const finalRequestId = input.requestId || input.request_id || input.id || `req_${Date.now()}`;
  const finalEventType = input.eventType || input.event_type || input.decision || "ALLOW";
  const finalToolName = input.toolName || input.tool_name || input.tool || "unknown_tool";
  const finalArgs = input.args || input.arguments || {};
  const finalRiskLevel = input.risk?.risk || input.risk_level || input.risk || "LOW";
  const finalTainted = Boolean(input.tainted || input.taint?.tainted);
  const finalReason =
    input.reasoning || input.reason || input.matchedRule || input.matched_rule || "";
  const finalRule =
    input.matchedRule ||
    input.matched_rule ||
    (finalEventType === "BLOCK"
      ? "Prompt Injection Defense (Blocked Tainted High-Risk Tool)"
      : finalEventType === "CONFIRM"
      ? "Human Confirmation Required (High-Risk Action)"
      : "Standard Safe Execution (Low-Risk Tool)");

  // 1. Ensure tool is in tools repository
  if (!getToolById(finalToolName)) {
    try {
      createTool({
        id: finalToolName,
        name: finalToolName,
        risk_level: (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(finalRiskLevel)
          ? finalRiskLevel
          : "HIGH") as any,
        description: "Auto-registered tool",
        enabled: true,
      });
    } catch {
      // Ignored if already created
    }
  }

  // 2. Ensure tool request exists in tool_requests repository
  const existingReq = getToolRequestById(finalRequestId);
  if (!existingReq) {
    try {
      createToolRequest({
        id: finalRequestId,
        tool_id: finalToolName,
        arguments: finalArgs,
        tainted: finalTainted,
        risk_level: (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(finalRiskLevel)
          ? finalRiskLevel
          : "HIGH") as any,
        decision:
          finalEventType === "ALLOW"
            ? "ALLOW"
            : finalEventType === "BLOCK"
            ? "BLOCK"
            : "CONFIRM",
        reason: finalReason,
        status:
          finalEventType === "ALLOW"
            ? "allowed"
            : finalEventType === "BLOCK"
            ? "blocked"
            : finalEventType === "APPROVED"
            ? "approved"
            : finalEventType === "DENIED"
            ? "denied"
            : "pending",
      });
    } catch {
      // Ignored if insertion fails
    }
  } else {
    if (finalEventType === "APPROVED") {
      updateToolRequestStatus(finalRequestId, "approved");
    } else if (finalEventType === "DENIED") {
      updateToolRequestStatus(finalRequestId, "denied");
    }
  }

  // 3. Prevent duplicate security_events insertions
  const priorEvents = getSecurityEvents({ requestId: finalRequestId });
  const alreadyExists = priorEvents.some(
    (p) => (p.eventType === finalEventType || p.event_type === finalEventType),
  );

  if (alreadyExists) {
    return priorEvents.find(
      (p) => p.eventType === finalEventType || p.event_type === finalEventType,
    );
  }

  // 4. Create security event
  return createSecurityEvent({
    id: input.id,
    requestId: finalRequestId,
    eventType: finalEventType,
    toolName: finalToolName,
    args: finalArgs,
    provenance: input.provenance || [{ source: input.source || "PDF", trust: "UNTRUSTED", type: input.source || "PDF" }],
    taint: input.taint || { tainted: finalTainted, matchedSources: [], matchedTerms: [] },
    risk: typeof input.risk === "object" ? input.risk : { risk: finalRiskLevel, known: true },
    matchedRule: finalRule,
    reasoning: finalReason,
    userAuthorized: Boolean(input.userAuthorized || finalEventType === "APPROVED"),
    timestamp: input.timestamp || input.created_at || new Date().toISOString(),
  });
}

/**
 * POST /api/events and POST /api/events/record
 *
 * Records one or more security events and updates corresponding tool requests.
 */
router.post(["/", "/record", "/sync"], (req: Request, res: Response, next: NextFunction): void => {
  try {
    const body = req.body;
    if (Array.isArray(body)) {
      const recorded = body.map(recordInboundEvent);
      res.status(201).json({ success: true, count: recorded.length, events: recorded });
      return;
    }

    if (body && Array.isArray(body.events)) {
      const recorded = body.events.map(recordInboundEvent);
      res.status(201).json({ success: true, count: recorded.length, events: recorded });
      return;
    }

    const recorded = recordInboundEvent(body);
    res.status(201).json({ success: true, event: recorded });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events/reset
 *
 * Resets events and tool requests for clean testing runs.
 */
router.post("/reset", (_req: Request, res: Response, next: NextFunction): void => {
  try {
    const db = getDatabase();
    execute(db, "DELETE FROM security_events;");
    execute(db, "DELETE FROM approvals;");
    execute(db, "DELETE FROM provenance_links;");
    execute(db, "DELETE FROM tool_requests;");
    saveDatabase();
    res.json({ success: true, message: "Security events and tool requests cleared." });
  } catch (err) {
    next(err);
  }
});

export default router;

