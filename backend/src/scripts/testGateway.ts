import { initDatabase } from "../db";
import { seedTools } from "../db/seed";
import { executeInterceptedTool } from "../agent";
import { logger } from "../shared";

async function main() {
  logger.info("Initializing database for Gateway smoke test...");
  await initDatabase();
  await seedTools();

  // Smoke Test: Intercepted tool execution flows through firewall to Gateway
  logger.info("Executing sample tool via Intercepted Pipeline: search_web({ query: 'AgentShield security' })...");
  const result = await executeInterceptedTool(
    "search_web",
    { query: "AgentShield security" },
    [],
    true,
  );

  console.log("\n─── Intercepted Tool Execution Result ───");
  console.log(JSON.stringify(result, null, 2));
  console.log("─────────────────────────────────────────\n");

  if (result.status === "EXECUTED" && result.toolExecutionResult.success) {
    logger.info("Gateway smoke test passed successfully via secure interception path.");
    process.exit(0);
  } else {
    logger.error("Gateway smoke test failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error("Smoke test error:", err);
  process.exit(1);
});
