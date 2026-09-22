export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

const RISK_RANKS: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * Returns numeric rank for a given RiskLevel (0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL).
 * Enables clean comparison of risk levels (e.g. `riskLevelRank(toolRisk) >= riskLevelRank('HIGH')`).
 */
export function riskLevelRank(level: RiskLevel): number {
  return RISK_RANKS[level];
}
