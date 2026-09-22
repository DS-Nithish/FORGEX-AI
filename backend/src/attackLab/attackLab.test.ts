import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase } from "../db";
import {
  ALL_ATTACK_SCENARIOS,
  LEGITIMATE_SCENARIOS,
  MALICIOUS_SCENARIOS,
  BENIGN_SCENARIOS,
  getScenarioById,
  runAttackScenario,
  runAllScenarios,
  runAllScenariosWithReport,
} from "./index";
import { scenario3IndirectStaged } from "./scenarios/scenario3_indirectStaged";
import { scenario4LowRiskSmuggling } from "./scenarios/scenario4_lowRiskSmuggling";

describe("Phase 20: Attack Lab Suite", () => {
  beforeEach(async () => {
    await initDatabase(":memory:");
  });

  describe("Malicious Scenarios Verification", () => {
    it.each(MALICIOUS_SCENARIOS.map((s) => [s.name, s]))(
      "%s matches expected outcome and confirms taint",
      async (_name, scenario) => {
        const result = await runAttackScenario(scenario);

        expect(result.passed).toBe(true);
        expect(result.actualOutcome).toBe(scenario.expectedOutcome);
        expect(result.actualTaint).toBe(true);
        expect(result.actualTaint).toBe(scenario.expectedTaint);
        expect(result.firewallResult.taint.matchedSources).toContain(
          scenario.document.sourceId,
        );
      },
    );
  });

  describe("Benign Scenarios Verification", () => {
    it.each(BENIGN_SCENARIOS.map((s) => [s.name, s]))(
      "%s matches expected non-tainted outcome",
      async (_name, scenario) => {
        const result = await runAttackScenario(scenario);

        expect(result.passed).toBe(true);
        expect(result.actualOutcome).toBe(scenario.expectedOutcome);
        expect(result.actualTaint).toBe(false);
        expect(result.actualTaint).toBe(scenario.expectedTaint);
        expect(result.firewallResult.taint.matchedSources).toHaveLength(0);
      },
    );
  });

  describe("Specific Technique Verifications", () => {
    it("Scenario 3 (Indirect/Staged) detects taint from planted assertions without explicit tool syntax", async () => {
      const result = await runAttackScenario(scenario3IndirectStaged);

      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(true);
      expect(result.actualOutcome).toBe("BLOCK");
      expect(result.matchedRule).toContain("Rule 1");
      expect(result.firewallResult.taint.matchedTerms).toContain("old_records.db");
    });

    it("Scenario 4 (Low-Risk Smuggling) routes tainted low-risk tool to CONFIRM (Rule 2) instead of BLOCK (Rule 1)", async () => {
      const result = await runAttackScenario(scenario4LowRiskSmuggling);

      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(true);
      expect(result.actualOutcome).toBe("CONFIRM");
      expect(result.matchedRule).toContain("Rule 2");
      expect(result.firewallResult.risk.risk).toBe("LOW");
    });

    it("Benign 2 proves trust level—not textual overlap—determines taint", async () => {
      const scenario = getScenarioById("benign-2-trusted-overlap");
      expect(scenario).toBeDefined();

      const result = await runAttackScenario(scenario!);
      expect(result.passed).toBe(true);
      expect(result.actualTaint).toBe(false);
      expect(result.actualOutcome).toBe("ALLOW");
      expect(result.firewallResult.taint.tainted).toBe(false);
    });
  });

  describe("Attack Runner Integration", () => {
    it("runAllScenarios executes all registered scenarios with 100% pass rate", async () => {
      const results = await runAllScenarios();

      expect(results.length).toBe(ALL_ATTACK_SCENARIOS.length);
      expect(results.every((r) => r.passed)).toBe(true);
    });

    it("runAllScenariosWithReport generates an aggregated report with allPassed = true", async () => {
      const report = await runAllScenariosWithReport();

      expect(report.totalScenarios).toBe(ALL_ATTACK_SCENARIOS.length);
      expect(report.passedCount).toBe(ALL_ATTACK_SCENARIOS.length);
      expect(report.failedCount).toBe(0);
      expect(report.allPassed).toBe(true);
      expect(report.results.length).toBe(ALL_ATTACK_SCENARIOS.length);
    });
  });

  describe("HTTP API Endpoints", () => {
    it("GET /api/attack-lab/scenarios returns metadata for all scenarios", async () => {
      const res = await request(app).get("/api/attack-lab/scenarios");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(ALL_ATTACK_SCENARIOS.length);
      expect(Array.isArray(res.body.scenarios)).toBe(true);
      expect(res.body.scenarios[0]).toHaveProperty("id");
      expect(res.body.scenarios[0]).toHaveProperty("technique");
      expect(res.body.scenarios[0]).toHaveProperty("expectedOutcome");
    });

    it("GET /api/attack-lab/run executes all scenarios live and returns summary report", async () => {
      const res = await request(app).get("/api/attack-lab/run");

      expect(res.status).toBe(200);
      expect(res.body.allPassed).toBe(true);
      expect(res.body.totalScenarios).toBe(
        ALL_ATTACK_SCENARIOS.length + LEGITIMATE_SCENARIOS.length,
      );
      expect(res.body.passedCount).toBe(
        ALL_ATTACK_SCENARIOS.length + LEGITIMATE_SCENARIOS.length,
      );
      expect(res.body.failedCount).toBe(0);
    });

    it("GET /api/attack-lab/run/:id runs a single scenario by ID", async () => {
      const res = await request(app).get(
        "/api/attack-lab/run/scenario-1-direct-override",
      );

      expect(res.status).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.scenarioId).toBe("scenario-1-direct-override");
      expect(res.body.actualOutcome).toBe("BLOCK");
    });

    it("GET /api/attack-lab/run/:id returns 404 for unknown scenario ID", async () => {
      const res = await request(app).get("/api/attack-lab/run/non-existent-scenario");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("not found");
    });
  });
});
