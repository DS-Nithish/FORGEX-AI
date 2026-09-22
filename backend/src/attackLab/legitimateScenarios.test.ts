import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase } from "../db";
import {
  LEGITIMATE_SCENARIOS,
  getLegitimateScenarioById,
  runLegitimateScenario,
  runAllLegitimateScenarios,
  runAllLegitimateScenariosWithReport,
  runCombinedLabReport,
} from "./index";
import { legit1DirectHighRisk } from "./scenarios/legit1_directHighRisk";
import { legit3TrustedOverlap } from "./scenarios/legit3_trustedOverlap";
import { legit4MultiStepTrusted } from "./scenarios/legit4_multiStepTrusted";
import { legit5UserAuthorizedMedium } from "./scenarios/legit5_userAuthorizedMedium";

describe("Phase 21: Legitimate & Sensitive-Authorized Scenarios", () => {
  beforeEach(async () => {
    await initDatabase(":memory:");
  });

  describe("Legitimate Scenarios Baseline Verification", () => {
    it.each(LEGITIMATE_SCENARIOS.map((s) => [s.name, s]))(
      "%s matches expected outcome without blocking or false taint",
      async (_name, scenario) => {
        const result = await runLegitimateScenario(scenario);

        // Core guarantee: NEVER BLOCK legitimate actions
        expect(result.actualOutcome).not.toBe("BLOCK");
        expect(result.actualOutcome).toBe(scenario.expectedOutcome);

        // Core guarantee: Taint is ALWAYS false for legitimate contexts
        expect(result.actualTaint).toBe(false);
        expect(result.actualTaint).toBe(scenario.expectedTaint);

        expect(result.passed).toBe(true);
        expect(result.firewallResult.taint.matchedSources).toHaveLength(0);
        expect(result.firewallResult.taint.matchedTerms).toHaveLength(0);
      },
    );
  });

  describe("Specific Credibility & Parity Guarantees", () => {
    it("Legit 1 matches Demo 1 canonical path byte-for-byte (Rule 4 CONFIRM)", async () => {
      const result = await runLegitimateScenario(legit1DirectHighRisk);

      expect(result.passed).toBe(true);
      expect(result.actualOutcome).toBe("CONFIRM");
      expect(result.actualTaint).toBe(false);
      expect(result.firewallResult.risk.risk).toBe("HIGH");
      expect(result.firewallResult.risk.known).toBe(true);
      expect(result.matchedRule).toBe(
        "Rule 4: trustLevel === 'trusted' AND risk in [HIGH, CRITICAL]",
      );
      expect(result.reasoning).toBe(
        "Tool request originates from a trusted source but carries HIGH risk. Human confirmation required.",
      );
    });

    it("Legit 3 confirms 100% textual overlap with trusted source does NOT taint", async () => {
      const result = await runLegitimateScenario(legit3TrustedOverlap);

      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(false);
      expect(result.actualOutcome).toBe("ALLOW");
      expect(result.matchedRule).toBe(
        "Rule 5: userAuthorized === true AND risk in [LOW, MEDIUM]",
      );
      expect(result.firewallResult.taint.tainted).toBe(false);
    });

    it("Legit 4 confirms multi-step session accumulation of trusted documents does NOT synthesize taint", async () => {
      const scenario = getLegitimateScenarioById("legit-4-multi-step-trusted");
      expect(scenario).toBeDefined();

      const result = await runLegitimateScenario(legit4MultiStepTrusted);

      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(false);
      expect(result.actualOutcome).toBe("ALLOW");
      expect(result.firewallResult.provenance).toHaveLength(2);
      expect(result.firewallResult.taint.tainted).toBe(false);
    });

    it("Legit 5 confirms user authorization unlocks medium-risk actions (Rule 5) without confirmation", async () => {
      const result = await runLegitimateScenario(legit5UserAuthorizedMedium);

      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(false);
      expect(result.actualOutcome).toBe("ALLOW");
      expect(result.matchedRule).toBe(
        "Rule 5: userAuthorized === true AND risk in [LOW, MEDIUM]",
      );
      expect(result.firewallResult.risk.risk).toBe("MEDIUM");
    });
  });

  describe("Legitimate Runner & Evaluation Metrics", () => {
    it("runAllLegitimateScenarios executes all legitimate scenarios with 100% pass rate", async () => {
      const results = await runAllLegitimateScenarios();

      expect(results.length).toBe(LEGITIMATE_SCENARIOS.length);
      expect(results.every((r) => r.passed)).toBe(true);
      expect(results.every((r) => r.actualOutcome !== "BLOCK")).toBe(true);
      expect(results.every((r) => !r.actualTaint)).toBe(true);
    });

    it("runAllLegitimateScenariosWithReport returns clean 0 failed count", async () => {
      const report = await runAllLegitimateScenariosWithReport();

      expect(report.totalScenarios).toBe(LEGITIMATE_SCENARIOS.length);
      expect(report.passedCount).toBe(LEGITIMATE_SCENARIOS.length);
      expect(report.failedCount).toBe(0);
      expect(report.allPassed).toBe(true);
    });

    it("runCombinedLabReport confirms ZERO false positives and ZERO false negatives", async () => {
      const combined = await runCombinedLabReport();

      expect(combined.falsePositiveCount).toBe(0);
      expect(combined.falseNegativeCount).toBe(0);
      expect(combined.allPassed).toBe(true);
      expect(combined.passedCount).toBe(combined.totalScenarios);
      expect(combined.failedCount).toBe(0);
    });
  });

  describe("HTTP API Endpoints for Legitimate Scenarios", () => {
    it("GET /api/attack-lab/legitimate returns all legitimate scenario metadata", async () => {
      const res = await request(app).get("/api/attack-lab/legitimate");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(LEGITIMATE_SCENARIOS.length);
      expect(Array.isArray(res.body.scenarios)).toBe(true);
      expect(res.body.scenarios[0]).toHaveProperty("id");
      expect(res.body.scenarios[0]).toHaveProperty("category");
      expect(res.body.scenarios[0].expectedOutcome).not.toBe("BLOCK");
    });

    it("GET /api/attack-lab/run-legitimate executes legitimate scenarios on-demand", async () => {
      const res = await request(app).get("/api/attack-lab/run-legitimate");

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(true);
      expect(res.body.totalScenarios).toBe(LEGITIMATE_SCENARIOS.length);
      expect(res.body.failedCount).toBe(0);
    });

    it("GET /api/attack-lab/run returns combined evaluation data by default", async () => {
      const res = await request(app).get("/api/attack-lab/run");

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(true);
      expect(res.body).toHaveProperty("attackReport");
      expect(res.body).toHaveProperty("legitimateReport");
      expect(res.body.falsePositiveCount).toBe(0);
      expect(res.body.falseNegativeCount).toBe(0);
    });

    it("GET /api/attack-lab/run/:id executes a single legitimate scenario by ID", async () => {
      const res = await request(app).get(
        "/api/attack-lab/run/legit-1-direct-high-risk",
      );

      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.scenarioId).toBe("legit-1-direct-high-risk");
      expect(res.body.actualOutcome).toBe("CONFIRM");
    });
  });
});
