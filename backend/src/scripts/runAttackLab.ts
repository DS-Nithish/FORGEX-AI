import { initDatabase } from "../db";
import { runCombinedLabReport } from "../attackLab";
import { logger } from "../shared";

async function main() {
  logger.info("Initializing AgentShield runtime environment for Attack Lab...");
  await initDatabase();

  console.log("\n============================================================");
  console.log("=== AGENTSHIELD COMPREHENSIVE SECURITY BENCHMARK ===");
  console.log("============================================================\n");

  const combined = await runCombinedLabReport();

  console.log("--- Attack & Injection Detection Benchmark ---");
  console.table(
    combined.attackReport.results.map((r) => ({
      Scenario: r.scenarioName,
      Technique: r.technique,
      Expected: r.expectedOutcome,
      Actual: r.actualOutcome,
      Tainted: r.actualTaint ? "YES" : "NO",
      Rule: r.matchedRule.split(":")[0],
      Status: r.passed ? "✅ PASS" : "❌ FAIL",
    })),
  );

  console.log("\n--- Legitimate & Sensitive-Authorized Benchmark ---");
  console.table(
    combined.legitimateReport.results.map((r) => ({
      Scenario: r.scenarioName,
      Category: r.technique,
      Expected: r.expectedOutcome,
      Actual: r.actualOutcome,
      Tainted: r.actualTaint ? "YES" : "NO",
      Rule: r.matchedRule.split(":")[0],
      Status: r.passed ? "✅ PASS" : "❌ FAIL",
    })),
  );

  console.log("\n============================================================");
  console.log("=== EVALUATION METRICS SUMMARY ===");
  console.log("============================================================");
  console.log(`Total Scenarios:         ${combined.totalScenarios}`);
  console.log(`Passed Assertions:       ${combined.passedCount}`);
  console.log(`Failed Assertions:       ${combined.failedCount}`);
  console.log(`False Positives (FP):    ${combined.falsePositiveCount} (0 expected)`);
  console.log(`False Negatives (FN):    ${combined.falseNegativeCount} (0 expected)`);
  console.log(`Overall Success:         ${combined.allPassed ? "✅ 100% PASS" : "❌ FAIL"}\n`);

  if (!combined.allPassed) {
    console.error("Security benchmark failed one or more assertions.");
    process.exit(1);
  } else {
    console.log("All attack detection and legitimate non-blocking guarantees verified.");
  }
}

main().catch((err) => {
  logger.error("Attack Lab execution error:", err);
  process.exit(1);
});
