import { Router, Request, Response } from "express";
import { z } from "zod";
import { runFirewallCheck } from "../firewall/firewallCore";
import { ProvenanceRecord } from "../services/taintEngine";
import { getFailClosedDecision, isSimulateFirewallDown } from "../firewall/failClosed";
import { getRisk } from "../services/riskEngine";

const router = Router();

const firewallCheckSchema = z
  .object({
    toolName: z.string().min(1, "toolName cannot be empty").optional(),
    toolId: z.string().min(1, "toolId cannot be empty").optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    arguments: z.record(z.string(), z.unknown()).optional(),
    sessionContent: z
      .array(
        z.object({
          sourceId: z.string().min(1, "sourceId is required"),
          sourceType: z.string().optional(),
          trustLevel: z.string(),
          content: z.string(),
        }),
      )
      .optional()
      .default([]),
    userAuthorized: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const hasName = typeof data.toolName === "string" && data.toolName.trim().length > 0;
    const hasId = typeof data.toolId === "string" && data.toolId.trim().length > 0;

    if (!hasName && !hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "toolName is required",
        path: ["toolName"],
      });
    }
  });

/**
 * POST /api/firewall/check
 *
 * Evaluates a tool execution request against the 4 pure security engines:
 * Provenance -> Taint -> Risk -> Policy
 *
 * Stateless: No database reads or writes (handled in Phase 17).
 * Fail-closed: Invalid requests return 400; unexpected crashes return 500 with decision: BLOCK.
 */
router.post("/check", async (req: Request, res: Response): Promise<void> => {
  try {
    // Failure-injection simulation check for live demo testing
    if (isSimulateFirewallDown()) {
      const rawToolName = (req.body?.toolName || req.body?.toolId || "unknown") as string;
      const fallbackPolicy = getFailClosedDecision(
        rawToolName,
        "AgentShield unreachable (SIMULATE_FIREWALL_DOWN active)",
      );
      res.status(503).json({
        error: "Firewall simulated down (SIMULATE_FIREWALL_DOWN=true)",
        toolName: rawToolName,
        decision: fallbackPolicy.decision,
        reasoning: fallbackPolicy.reasoning,
        matchedRule: fallbackPolicy.matchedRule,
        provenance: [],
        taint: { tainted: false, matchedSources: [], matchedTerms: [] },
        risk: getRisk(rawToolName),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const parseResult = firewallCheckSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.format(),
      });
      return;
    }

    const {
      toolName: rawToolName,
      toolId: rawToolId,
      args: rawArgs,
      arguments: rawArguments,
      sessionContent,
      userAuthorized,
    } = parseResult.data;

    const toolName = (rawToolName || rawToolId) as string;
    const args = (rawArgs ?? rawArguments ?? {}) as Record<string, unknown>;

    const firewallResult = await runFirewallCheck({
      toolName,
      args,
      sessionContent: sessionContent as ProvenanceRecord[],
      userAuthorized: userAuthorized ?? false,
    });

    res.status(200).json({
      toolName: firewallResult.toolName,
      decision: firewallResult.policy.decision,
      reasoning: firewallResult.policy.reasoning,
      matchedRule: firewallResult.policy.matchedRule,
      provenance: firewallResult.provenance,
      taint: firewallResult.taint,
      risk: firewallResult.risk,
      timestamp: firewallResult.timestamp,
      // Backwards compatibility fields for earlier phase tests
      toolId: firewallResult.toolName,
      arguments: args,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const toolName = (req.body?.toolName || req.body?.toolId || "unknown") as string;

    res.status(500).json({
      toolName,
      decision: "BLOCK",
      reasoning: `Internal firewall error: ${errorMessage}. Request failed closed.`,
      matchedRule: "Fail-Closed: Internal Server Error",
      provenance: [],
      taint: { tainted: false, matchedSources: [], matchedTerms: [] },
      risk: { risk: "CRITICAL", known: false },
      timestamp: new Date().toISOString(),
      error: "Internal server error",
    });
  }
});

export default router;
