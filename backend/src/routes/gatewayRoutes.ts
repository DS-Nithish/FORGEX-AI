import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { getTool } from "../services/toolRegistry";
import { executeInterceptedTool } from "../agent";
import { getAllDocuments, getDocumentById } from "../content";

const router = Router();

const executeRequestSchema = z.object({
  toolId: z.string().min(1, "toolId is required"),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

/**
 * POST /api/tool/execute
 *
 * Gated tool execution endpoint.
 * In Phase 15, this endpoint routes through AgentShield's intercepted execution pipeline.
 */
router.post(
  "/tool/execute",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = executeRequestSchema.parse(req.body);

      // 1. Verify tool existence in registry (throws ToolNotFoundError -> 404)
      getTool(parsed.toolId);

      // 2. Route through Intercepted Tool Execution (sole path to Tool Gateway)
      const { toolExecutionResult, firewallResult, status } = await executeInterceptedTool(
        parsed.toolId,
        parsed.arguments,
        [],
        true,
      );

      if (status !== "EXECUTED") {
        res.status(403).json({
          success: false,
          error: `Tool execution blocked by firewall: ${firewallResult.policy.reasoning}`,
          decision: firewallResult.policy.decision,
        });
        return;
      }

      res.json(toolExecutionResult);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/content/documents
 *
 * Returns all fake documents, strictly omitting `isMalicious` to ensure
 * ground truth is not leaked to callers or agents.
 */
router.get("/content/documents", (_req: Request, res: Response): void => {
  const documents = getAllDocuments().map((doc) => {
    const safeDoc = { ...doc };
    delete (safeDoc as { isMalicious?: boolean }).isMalicious;
    return safeDoc;
  });
  res.json(documents);
});

/**
 * GET /api/content/documents/:id
 *
 * Returns a specific document by ID (excluding `isMalicious`).
 */
router.get("/content/documents/:id", (req: Request, res: Response): void => {
  const document = getDocumentById(req.params.id);
  if (!document) {
    res.status(404).json({ error: `Document '${req.params.id}' not found` });
    return;
  }
  const safeDoc = { ...document };
  delete (safeDoc as { isMalicious?: boolean }).isMalicious;
  res.json(safeDoc);
});

export default router;
