import { getRisk, RiskResult } from "../services/riskEngine";
import { PolicyDecision } from "../services/policyEngine";

let _simulateFirewallDown = false;

/**
 * Checks if the manual failure injection flag is active.
 * Checked via process.env.SIMULATE_FIREWALL_DOWN or programmatic toggle.
 */
export function isSimulateFirewallDown(): boolean {
  return (
    _simulateFirewallDown ||
    process.env.SIMULATE_FIREWALL_DOWN === "true" ||
    process.env.SIMULATE_FIREWALL_DOWN === "1"
  );
}

/**
 * Programmatically enable or disable failure injection simulation for testing/demo.
 */
export function setSimulateFirewallDown(value: boolean): void {
  _simulateFirewallDown = value;
  if (value) {
    process.env.SIMULATE_FIREWALL_DOWN = "true";
  } else {
    delete process.env.SIMULATE_FIREWALL_DOWN;
  }
}

/**
 * FAIL-CLOSED POLICY FALLBACK (PRD Section 3.4 / Phase 19)
 *
 * Formally defines fallback decisions when AgentShield is unreachable or an error occurs:
 * - Is the tool HIGH or CRITICAL risk (or unrecognized)?
 *     YES → BLOCK by default
 *     NO  → Policy-defined fallback: CONFIRM (softer default for LOW/MEDIUM risk,
 *           NEVER auto-ALLOW on failure!)
 *
 * Reuses Phase 11's risk lookup (getRisk) without calling the full Policy Engine.
 */
export function getFailClosedDecision(toolName: string, errorReason?: string): PolicyDecision {
  const riskResult: RiskResult = getRisk(toolName);
  const isHighOrCritical =
    !riskResult.known || riskResult.risk === "HIGH" || riskResult.risk === "CRITICAL";

  const contextPrefix = errorReason ? `${errorReason} — ` : "";

  if (isHighOrCritical) {
    return {
      decision: "BLOCK",
      matchedRule: "Fail-Closed Fallback: Risk [HIGH, CRITICAL]",
      reasoning: `${contextPrefix}AgentShield unreachable — fail-closed default applied: ${toolName} carries ${riskResult.risk} risk. Blocked by default.`,
    };
  }

  // LOW or MEDIUM risk fallback: CONFIRM (Never auto-ALLOW!)
  return {
    decision: "CONFIRM",
    matchedRule: "Fail-Closed Fallback: Risk [LOW, MEDIUM]",
    reasoning: `${contextPrefix}AgentShield unreachable — fail-closed default applied: ${toolName} carries ${riskResult.risk} risk. Human confirmation required before execution.`,
  };
}
