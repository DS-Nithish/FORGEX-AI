import { RiskLevel } from "../shared/riskLevels";

export type PolicyTrustLevel = "trusted" | "untrusted" | "TRUSTED" | "UNTRUSTED";

export interface PolicyInput {
  trustLevel: PolicyTrustLevel;
  tainted: boolean;
  risk: RiskLevel;
  riskKnown: boolean;
  userAuthorized: boolean;
}

export type PolicyDecisionType = "ALLOW" | "CONFIRM" | "BLOCK";

export interface PolicyDecision {
  decision: PolicyDecisionType;
  matchedRule: string; // e.g. "Rule 1: tainted + high risk"
  reasoning: string; // human-readable, for the audit log (FR-11)
}

export const POLICY_RULES = {
  RULE_1: "Rule 1: tainted === true AND risk in [HIGH, CRITICAL]",
  RULE_2: "Rule 2: tainted === true AND risk in [LOW, MEDIUM]",
  RULE_3: "Rule 3: trustLevel === 'untrusted' AND risk === 'CRITICAL'",
  RULE_4: "Rule 4: trustLevel === 'trusted' AND risk in [HIGH, CRITICAL]",
  RULE_5: "Rule 5: userAuthorized === true AND risk in [LOW, MEDIUM]",
  RULE_6: "Rule 6: risk === 'LOW' AND tainted === false",
  RULE_7: "Rule 7: risk.known === false (unrecognized tool)",
  RULE_8: "Rule 8: default fallback",
} as const;

/**
 * Pure, deterministic evaluation of the AgentShield security policy matrix (PRD Section 3.4).
 *
 * Rules are evaluated strictly top-to-bottom in priority order; first match wins.
 * No database queries, no async operations, and no LLM calls.
 * Given identical inputs, always yields the exact same decision and explainability payload.
 */
export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const isTainted = Boolean(input.tainted);
  const isRiskKnown = Boolean(input.riskKnown);
  const isUserAuthorized = Boolean(input.userAuthorized);

  const normalizedTrust = String(input.trustLevel ?? "")
    .trim()
    .toLowerCase();
  const isTrusted = normalizedTrust === "trusted";
  const isUntrusted = normalizedTrust === "untrusted";

  const normalizedRisk = String(input.risk ?? "")
    .trim()
    .toUpperCase() as RiskLevel;
  const isHighOrCriticalRisk = normalizedRisk === "HIGH" || normalizedRisk === "CRITICAL";
  const isLowOrMediumRisk = normalizedRisk === "LOW" || normalizedRisk === "MEDIUM";

  // Rule 1: Tainted request with HIGH or CRITICAL risk -> BLOCK
  if (isRiskKnown && isTainted && isHighOrCriticalRisk) {
    return {
      decision: "BLOCK",
      matchedRule: POLICY_RULES.RULE_1,
      reasoning: `Tool request is tainted by untrusted content and has ${normalizedRisk} risk level. Blocked to prevent prompt injection.`,
    };
  }

  // Rule 2: Tainted request with LOW or MEDIUM risk -> CONFIRM
  if (isRiskKnown && isTainted && isLowOrMediumRisk) {
    return {
      decision: "CONFIRM",
      matchedRule: POLICY_RULES.RULE_2,
      reasoning: `Tool request is tainted by untrusted content but carries ${normalizedRisk} risk level. Human confirmation required before execution.`,
    };
  }

  // Rule 3: Untrusted source requesting CRITICAL risk tool -> BLOCK
  if (isRiskKnown && isUntrusted && normalizedRisk === "CRITICAL") {
    return {
      decision: "BLOCK",
      matchedRule: POLICY_RULES.RULE_3,
      reasoning:
        "Tool request originates from an untrusted source and attempts a CRITICAL risk action. Blocked for safety.",
    };
  }

  // Rule 4: Trusted source requesting HIGH or CRITICAL risk tool -> CONFIRM
  if (isRiskKnown && isTrusted && isHighOrCriticalRisk) {
    return {
      decision: "CONFIRM",
      matchedRule: POLICY_RULES.RULE_4,
      reasoning: `Tool request originates from a trusted source but carries ${normalizedRisk} risk. Human confirmation required.`,
    };
  }

  // Rule 5: User-authorized request with LOW or MEDIUM risk -> ALLOW
  if (isRiskKnown && isUserAuthorized && isLowOrMediumRisk) {
    return {
      decision: "ALLOW",
      matchedRule: POLICY_RULES.RULE_5,
      reasoning: `Tool request is explicitly user-authorized and carries ${normalizedRisk} risk. Allowed without confirmation.`,
    };
  }

  // Rule 6: Untainted request with LOW risk -> ALLOW
  if (isRiskKnown && normalizedRisk === "LOW" && !isTainted) {
    return {
      decision: "ALLOW",
      matchedRule: POLICY_RULES.RULE_6,
      reasoning:
        "Tool request is low risk and not tainted by untrusted content. Allowed to execute.",
    };
  }

  // Rule 7: Unrecognized tool (risk.known === false) -> BLOCK regardless of other inputs
  if (!isRiskKnown) {
    return {
      decision: "BLOCK",
      matchedRule: POLICY_RULES.RULE_7,
      reasoning:
        "Unrecognized or unregistered tool. Blocked by fail-closed policy because tool risk is unknown.",
    };
  }

  // Rule 8: Default fallback -> CONFIRM
  return {
    decision: "CONFIRM",
    matchedRule: POLICY_RULES.RULE_8,
    reasoning:
      "Request did not match any higher-priority rule. Defaulting to safe fallback: human confirmation required.",
  };
}
