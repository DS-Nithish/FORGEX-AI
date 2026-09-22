import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { runAgentTask } from "../agent";

const router = Router();

const agentRunSchema = z.object({
  task: z.string().min(1, "task is required"),
  documentId: z.string().optional(),
});

/**
 * POST /api/agent/run
 *
 * Runs an agent task end-to-end.
 * In this Phase 8 vulnerable baseline, the agent executes requested tools directly.
 */
router.post(
  "/agent/run",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = agentRunSchema.parse(req.body);
      const result = await runAgentTask(parsed);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
