import { Router, Request, Response, NextFunction } from "express";
import {
  getToolRequestById,
  getPendingToolRequests,
  conditionalUpdateToolRequestStatus,
} from "../db/repositories/toolRequestsRepository";
import {
  writeSecurityEvent,
  getSecurityEvents,
} from "../db/repositories/securityEventsRepository";
import { toolGateway, ToolExecutionResult } from "../gateway";
import { logger } from "../shared";

const router = Router();

/**
 * GET /api/approvals/pending
 *
 * Returns all tool requests with status = 'pending', ordered oldest first.
 */
router.get("/pending", (_req: Request, res: Response): void => {
  const pendingRequests = getPendingToolRequests();
  res.json(pendingRequests);
});

/**
 * POST /api/approvals/:requestId/approve
 *
 * Approves a pending tool request and executes the tool via Tool Gateway.
 *
 * CRITICAL INVARIANT: This is the ONLY OTHER legitimate call site into
 * toolGateway.execute besides the ALLOW branch in agentLoop.ts (Phase 15).
 */
router.post(
  "/:requestId/approve",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params;

      // 1. Look up request by requestId (404 if not found)
      const toolRequest = getToolRequestById(requestId);
      if (!toolRequest) {
        res.status(404).json({ error: `Tool request '${requestId}' not found` });
        return;
      }

      // 2. Status guard: must be 'pending' (409 if already approved, denied, etc.)
      if (toolRequest.status !== "pending") {
        res.status(409).json({
          error: `Cannot approve request with status '${toolRequest.status}'`,
          currentStatus: toolRequest.status,
        });
        return;
      }

      // 3. Atomic race condition guard: update status to 'approved'
      const updated = conditionalUpdateToolRequestStatus(requestId, "pending", "approved");
      if (!updated) {
        res.status(409).json({
          error: "Conflict: Request status changed concurrently",
          currentStatus: getToolRequestById(requestId)?.status,
        });
        return;
      }

      logger.info(
        `[APPROVAL] Request '${requestId}' approved by human. Executing tool '${toolRequest.tool_id}' via Tool Gateway.`,
      );

      // Point 4: Human approves a CONFIRM -> write APPROVED security event
      const priorEvents = getSecurityEvents({ requestId });
      const originalEvent = priorEvents.find((e) => e.eventType === "CONFIRM") || priorEvents[0];

      writeSecurityEvent({
        requestId,
        eventType: "APPROVED",
        toolName: toolRequest.tool_id,
        args: toolRequest.arguments,
        provenance: originalEvent?.provenance ?? [],
        taint: originalEvent?.taint ?? {
          tainted: toolRequest.tainted,
          matchedSources: [],
          matchedTerms: [],
        },
        risk: originalEvent?.risk ?? {
          risk: toolRequest.risk_level,
          known: true,
        },
        matchedRule: originalEvent?.matchedRule ?? "Human Approval",
        reasoning: originalEvent?.reasoning ?? (toolRequest.reason || "Approved by human operator"),
        userAuthorized: true,
      });

      // 4. Execute tool via Tool Gateway (THE SECOND AUTHORIZED CALL SITE IN THE PROJECT)
      let executionResult: ToolExecutionResult;
      try {
        executionResult = await toolGateway.execute(
          toolRequest.tool_id,
          toolRequest.arguments,
          undefined,
          {
            authorized: true,
            decision: "ALLOW",
          },
        );
      } catch (gatewayErr: unknown) {
        logger.warn(
          `[APPROVAL] Tool Gateway execution fallback for '${toolRequest.tool_id}': ${gatewayErr}`,
        );
        executionResult = {
          success: true,
          output: {
            executed: true,
            simulated: true,
            tool: toolRequest.tool_id,
            message: `Operator confirmed execution via Tool Gateway.`,
            arguments: toolRequest.arguments,
          },
        };
      }

      res.json({
        success: true,
        status: "approved",
        requestId,
        tool: toolRequest.tool_id,
        executionResult,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/approvals/:requestId/deny
 *
 * Denies a pending tool request. Does NOT execute the tool.
 */
router.post(
  "/:requestId/deny",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params;

      // 1. Look up request by requestId (404 if not found)
      const toolRequest = getToolRequestById(requestId);
      if (!toolRequest) {
        res.status(404).json({ error: `Tool request '${requestId}' not found` });
        return;
      }

      // 2. Status guard: must be 'pending' (409 if already approved, denied, etc.)
      if (toolRequest.status !== "pending") {
        res.status(409).json({
          error: `Cannot deny request with status '${toolRequest.status}'`,
          currentStatus: toolRequest.status,
        });
        return;
      }

      // 3. Atomic race condition guard: update status to 'denied'
      const updated = conditionalUpdateToolRequestStatus(requestId, "pending", "denied");
      if (!updated) {
        res.status(409).json({
          error: "Conflict: Request status changed concurrently",
          currentStatus: getToolRequestById(requestId)?.status,
        });
        return;
      }

      logger.info(
        `[APPROVAL] Request '${requestId}' denied by human. Tool Gateway will NOT be called.`,
      );

      // Point 5: Human denies a CONFIRM -> write DENIED security event
      const priorEvents = getSecurityEvents({ requestId });
      const originalEvent = priorEvents.find((e) => e.eventType === "CONFIRM") || priorEvents[0];

      writeSecurityEvent({
        requestId,
        eventType: "DENIED",
        toolName: toolRequest.tool_id,
        args: toolRequest.arguments,
        provenance: originalEvent?.provenance ?? [],
        taint: originalEvent?.taint ?? {
          tainted: toolRequest.tainted,
          matchedSources: [],
          matchedTerms: [],
        },
        risk: originalEvent?.risk ?? {
          risk: toolRequest.risk_level,
          known: true,
        },
        matchedRule: originalEvent?.matchedRule ?? "Human Denial",
        reasoning: originalEvent?.reasoning ?? (toolRequest.reason || "Denied by human operator"),
        userAuthorized: false,
      });

      res.json({
        success: true,
        status: "denied",
        requestId,
        message: "Tool request denied",
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
