import { runFirewallCheck } from "../firewall/firewallCore";
import { ProvenanceRecord } from "../services/taintEngine";
import {
  AttackLabReport,
  AttackResult,
  AttackScenario,
  CombinedLabReport,
  LegitimateScenario,
} from "./types";
import { ALL_ATTACK_SCENARIOS, LEGITIMATE_SCENARIOS } from "./scenarios";

/**
 * Runs a single attack or benign scenario through the full AgentShield firewall pipeline:
 * Provenance -> Taint Engine -> Risk Engine -> Policy Engine.
 *
 * Compares the pipeline's actual outcome and taint status against the scenario's ground truth expectations.
 */
export async function runAttackScenario(scenario: AttackScenario): Promise<AttackResult> {
  const timestamp = new Date().toISOString();

  const firewallResult = await runFirewallCheck({
    toolName: scenario.expectedAgentToolCall.toolName,
    args: scenario.expectedAgentToolCall.args,
    sessionContent: [
      {
        sourceId: scenario.document.sourceId,
        sourceType: scenario.document.sourceType.toUpperCase(),
        trustLevel: scenario.document.trustLevel.toUpperCase(),
        content: scenario.document.content,
        sourceName: scenario.name,
      },
    ],
    userAuthorized: scenario.userAuthorized ?? false,
  });

  const actualOutcome = firewallResult.policy.decision;
  const actualTaint = firewallResult.taint.tainted;

  const outcomeMatches = actualOutcome === scenario.expectedOutcome;
  const taintMatches = actualTaint === scenario.expectedTaint;
  const passed = outcomeMatches && taintMatches;

  let failureReason: string | undefined;
  if (!passed) {
    const reasons: string[] = [];
    if (!outcomeMatches) {
      reasons.push(
        `Decision mismatch: expected ${scenario.expectedOutcome}, got ${actualOutcome}`,
      );
    }
    if (!taintMatches) {
      reasons.push(
        `Taint mismatch: expected ${scenario.expectedTaint}, got ${actualTaint}`,
      );
    }
    failureReason = reasons.join("; ");
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    technique: scenario.technique,
    passed,
    expectedOutcome: scenario.expectedOutcome,
    actualOutcome,
    expectedTaint: scenario.expectedTaint,
    actualTaint,
    matchedRule: firewallResult.policy.matchedRule,
    reasoning: firewallResult.policy.reasoning,
    firewallResult,
    failureReason,
    timestamp,
  };
}

/**
 * Runs a single legitimate scenario through the AgentShield firewall pipeline.
 * Asserts that legitimate actions are NEVER blocked (outcomes: ALLOW or CONFIRM)
 * and that taint is always strictly false.
 */
export async function runLegitimateScenario(
  scenario: LegitimateScenario,
): Promise<AttackResult> {
  const timestamp = new Date().toISOString();

  // Populate session content from either multi-document array, single document, or empty
  let sessionContent: ProvenanceRecord[] = [];
  if (Array.isArray(scenario.documents) && scenario.documents.length > 0) {
    sessionContent = scenario.documents.map((doc) => ({
      sourceId: doc.sourceId,
      sourceType: doc.sourceType.toUpperCase(),
      trustLevel: doc.trustLevel.toUpperCase(),
      content: doc.content,
      sourceName: doc.sourceName ?? scenario.name,
    }));
  } else if (scenario.document) {
    sessionContent = [
      {
        sourceId: scenario.document.sourceId,
        sourceType: scenario.document.sourceType.toUpperCase(),
        trustLevel: scenario.document.trustLevel.toUpperCase(),
        content: scenario.document.content,
        sourceName: scenario.document.sourceName ?? scenario.name,
      },
    ];
  }

  const firewallResult = await runFirewallCheck({
    toolName: scenario.expectedAgentToolCall.toolName,
    args: scenario.expectedAgentToolCall.args,
    sessionContent,
    userAuthorized: scenario.userAuthorized,
  });

  const actualOutcome = firewallResult.policy.decision;
  const actualTaint = firewallResult.taint.tainted;

  const outcomeMatches = actualOutcome === scenario.expectedOutcome;
  const taintMatches = actualTaint === scenario.expectedTaint;
  const notBlocked = actualOutcome !== "BLOCK";
  const passed = outcomeMatches && taintMatches && notBlocked;

  let failureReason: string | undefined;
  if (!passed) {
    const reasons: string[] = [];
    if (actualOutcome === "BLOCK") {
      reasons.push(
        `FALSE POSITIVE: Legitimate action was BLOCKED by rule '${firewallResult.policy.matchedRule}'`,
      );
    } else if (!outcomeMatches) {
      reasons.push(
        `Decision mismatch: expected ${scenario.expectedOutcome}, got ${actualOutcome}`,
      );
    }
    if (!taintMatches) {
      reasons.push(
        `FALSE TAINT: Expected untainted (false), but got tainted (true) via sources [${firewallResult.taint.matchedSources.join(
          ", ",
        )}]`,
      );
    }
    failureReason = reasons.join("; ");
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    technique: scenario.category,
    passed,
    expectedOutcome: scenario.expectedOutcome,
    actualOutcome,
    expectedTaint: scenario.expectedTaint,
    actualTaint,
    matchedRule: firewallResult.policy.matchedRule,
    reasoning: firewallResult.policy.reasoning,
    firewallResult,
    failureReason,
    timestamp,
  };
}

/**
 * Executes all registered attack and benign scenarios sequentially through the security pipeline.
 */
export async function runAllScenarios(
  scenarios: AttackScenario[] = ALL_ATTACK_SCENARIOS,
): Promise<AttackResult[]> {
  const results: AttackResult[] = [];

  for (const scenario of scenarios) {
    const result = await runAttackScenario(scenario);
    results.push(result);
  }

  return results;
}

/**
 * Executes all registered legitimate scenarios sequentially.
 */
export async function runAllLegitimateScenarios(
  scenarios: LegitimateScenario[] = LEGITIMATE_SCENARIOS,
): Promise<AttackResult[]> {
  const results: AttackResult[] = [];

  for (const scenario of scenarios) {
    const result = await runLegitimateScenario(scenario);
    results.push(result);
  }

  return results;
}

/**
 * Executes all attack scenarios and aggregates a formatted summary report.
 */
export async function runAllScenariosWithReport(
  scenarios: AttackScenario[] = ALL_ATTACK_SCENARIOS,
): Promise<AttackLabReport> {
  const timestamp = new Date().toISOString();
  const results = await runAllScenarios(scenarios);

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    totalScenarios: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results,
    timestamp,
  };
}

/**
 * Executes all legitimate scenarios and aggregates a formatted summary report.
 */
export async function runAllLegitimateScenariosWithReport(
  scenarios: LegitimateScenario[] = LEGITIMATE_SCENARIOS,
): Promise<AttackLabReport> {
  const timestamp = new Date().toISOString();
  const results = await runAllLegitimateScenarios(scenarios);

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    totalScenarios: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results,
    timestamp,
  };
}

/**
 * Executes both attack and legitimate scenario suites together, providing complete
 * evaluation data including false-positive and false-negative metrics for Phase 24.
 */
export async function runCombinedLabReport(): Promise<CombinedLabReport> {
  const timestamp = new Date().toISOString();
  const attackReport = await runAllScenariosWithReport();
  const legitimateReport = await runAllLegitimateScenariosWithReport();

  // False positive: legitimate scenario that got blocked or tainted
  const falsePositiveCount = legitimateReport.results.filter(
    (r) => r.actualOutcome === "BLOCK" || r.actualTaint === true,
  ).length;

  // False negative: malicious scenario that was permitted (ALLOW)
  const falseNegativeCount = attackReport.results.filter(
    (r) => r.expectedOutcome === "BLOCK" && r.actualOutcome === "ALLOW",
  ).length;

  const totalScenarios = attackReport.totalScenarios + legitimateReport.totalScenarios;
  const passedCount = attackReport.passedCount + legitimateReport.passedCount;
  const failedCount = attackReport.failedCount + legitimateReport.failedCount;

  return {
    timestamp,
    totalScenarios,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    attackReport,
    legitimateReport,
    falsePositiveCount,
    falseNegativeCount,
  };
}
