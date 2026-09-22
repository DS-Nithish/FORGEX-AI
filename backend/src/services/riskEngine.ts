import { RiskLevel } from "../shared/riskLevels";

export { RiskLevel };

export interface RiskResult {
  risk: RiskLevel;
  known: boolean; // false if tool isn't in the table
}

/**
 * Static tool risk classification table per PRD Section 8.3.
 * Static and deterministic: No scoring functions, weighting by args, or ML.
 */
export const TOOL_RISK_TABLE: Record<string, RiskLevel> = {
  // 5 core tools specified in MVP
  search_web: "LOW",
  read_pdf: "LOW",
  send_email: "MEDIUM",
  create_database: "HIGH",
  delete_file: "CRITICAL",

  // Extended MVP tools
  read_email: "LOW",
  query_database: "MEDIUM",
  write_database: "HIGH",
  delete_database: "CRITICAL",
  execute_command: "CRITICAL",
};

/**
 * Pure function: Looks up the static risk level for a given tool name.
 *
 * Fail-safe default (PRD Section 8.3 & Section 19):
 * If a tool name is not recognized, defaults to 'CRITICAL' with known: false.
 * An unrecognized tool is a bigger red flag than a known dangerous one.
 */
export function getRisk(toolName: string): RiskResult {
  if (!toolName || typeof toolName !== "string") {
    return { risk: "CRITICAL", known: false };
  }

  const normalized = toolName.trim().toLowerCase();
  const matchedRisk = TOOL_RISK_TABLE[normalized];

  if (matchedRisk) {
    return {
      risk: matchedRisk,
      known: true,
    };
  }

  // Fail-closed for unknown tools
  return {
    risk: "CRITICAL",
    known: false,
  };
}
