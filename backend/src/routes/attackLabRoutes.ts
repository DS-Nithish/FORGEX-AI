import { Router, Request, Response } from "express";
import {
  ALL_ATTACK_SCENARIOS,
  LEGITIMATE_SCENARIOS,
  getScenarioById,
  getLegitimateScenarioById,
  runAllScenariosWithReport,
  runAllLegitimateScenariosWithReport,
  runCombinedLabReport,
  runAttackScenario,
  runLegitimateScenario,
} from "../attackLab";

const router = Router();

/**
 * GET /api/attack-lab/scenarios
 * Returns all configured attack and benign baseline scenarios metadata.
 */
router.get("/scenarios", (_req: Request, res: Response): void => {
  const scenarios = ALL_ATTACK_SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    technique: s.technique,
    userTask: s.userTask,
    expectedAgentToolCall: s.expectedAgentToolCall,
    expectedOutcome: s.expectedOutcome,
    expectedTaint: s.expectedTaint,
    document: {
      sourceId: s.document.sourceId,
      sourceType: s.document.sourceType,
      trustLevel: s.document.trustLevel,
    },
  }));

  res.status(200).json({
    total: scenarios.length,
    scenarios,
  });
});

/**
 * GET /api/attack-lab/legitimate
 * Returns all configured legitimate and sensitive-authorized scenarios metadata.
 */
router.get("/legitimate", (_req: Request, res: Response): void => {
  const scenarios = LEGITIMATE_SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    userTask: s.userTask,
    userAuthorized: s.userAuthorized,
    expectedAgentToolCall: s.expectedAgentToolCall,
    expectedOutcome: s.expectedOutcome,
    expectedTaint: s.expectedTaint,
    hasDocuments: Boolean(s.document || (s.documents && s.documents.length > 0)),
  }));

  res.status(200).json({
    total: scenarios.length,
    scenarios,
  });
});

/**
 * GET /api/attack-lab/run
 * Runs attack scenarios, legitimate scenarios, or both combined.
 * Query param: ?type=attack | ?type=legitimate | default=combined
 */
router.get("/run", async (req: Request, res: Response): Promise<void> => {
  try {
    const type = String(req.query.type || "").toLowerCase();

    if (type === "attack") {
      const report = await runAllScenariosWithReport();
      res.status(200).json(report);
      return;
    }

    if (type === "legitimate") {
      const report = await runAllLegitimateScenariosWithReport();
      res.status(200).json(report);
      return;
    }

    // Default: Combined report (both attack and legitimate, with false-positive analysis)
    const combinedReport = await runCombinedLabReport();
    res.status(200).json({
      ...combinedReport,
      // Top-level aliases for backwards compatibility with earlier consumers
      results: [
        ...combinedReport.attackReport.results,
        ...combinedReport.legitimateReport.results,
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Failed to execute Attack Lab scenarios",
      details: message,
    });
  }
});

/**
 * GET /api/attack-lab/run-legitimate
 * Dedicated endpoint to run all legitimate scenarios.
 */
router.get("/run-legitimate", async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await runAllLegitimateScenariosWithReport();
    res.status(200).json(report);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Failed to execute legitimate scenarios",
      details: message,
    });
  }
});

/**
 * GET /api/attack-lab/run/:id
 * Executes a single attack or legitimate scenario by its ID.
 */
router.get("/run/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const attackScenario = getScenarioById(req.params.id);
    if (attackScenario) {
      const result = await runAttackScenario(attackScenario);
      res.status(200).json(result);
      return;
    }

    const legitScenario = getLegitimateScenarioById(req.params.id);
    if (legitScenario) {
      const result = await runLegitimateScenario(legitScenario);
      res.status(200).json(result);
      return;
    }

    res.status(404).json({
      error: `Scenario with id '${req.params.id}' not found in attack or legitimate suites`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: `Failed to execute scenario '${req.params.id}'`,
      details: message,
    });
  }
});

export default router;
