import { FirewallResult } from "../firewall/firewallCore";

export type AttackTechnique =
  | "direct instruction override"
  | "fake system message"
  | "indirect staged injection"
  | "low-risk smuggling"
  | "authority impersonation"
  | "benign clean document"
  | "benign trusted source overlap"
  | string;

export interface AttackDocument {
  sourceId: string;
  sourceType: "pdf" | "email" | "web" | "db";
  trustLevel: "untrusted" | "trusted";
  content: string;
  sourceName?: string;
}

export interface AttackScenario {
  id: string;
  name: string;
  description: string;
  technique: AttackTechnique;
  document: AttackDocument;
  userTask: string;
  expectedAgentToolCall: {
    toolName: string;
    args: Record<string, unknown>;
  };
  expectedOutcome: "BLOCK" | "CONFIRM" | "ALLOW";
  expectedTaint: boolean;
  userAuthorized?: boolean;
}

export type LegitimateCategory =
  | "trusted-high-risk"
  | "user-authorized"
  | "low-risk-routine"
  | "trusted-source-overlap"
  | "multi-step-trusted";

export interface LegitimateScenario {
  id: string;
  name: string;
  description: string;
  category: LegitimateCategory;
  document?: AttackDocument; // optional — some scenarios have no external content
  documents?: AttackDocument[]; // optional — for multi-document / multi-step sessions
  userTask: string;
  userAuthorized: boolean;
  expectedAgentToolCall: {
    toolName: string;
    args: Record<string, unknown>;
  };
  expectedOutcome: "ALLOW" | "CONFIRM"; // never BLOCK — that's the point
  expectedTaint: false;
}

export interface AttackResult {
  scenarioId: string;
  scenarioName: string;
  technique: string;
  passed: boolean;
  expectedOutcome: "BLOCK" | "CONFIRM" | "ALLOW";
  actualOutcome: "BLOCK" | "CONFIRM" | "ALLOW";
  expectedTaint: boolean;
  actualTaint: boolean;
  matchedRule: string;
  reasoning: string;
  firewallResult: FirewallResult;
  failureReason?: string;
  timestamp: string;
}

export interface AttackLabReport {
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: AttackResult[];
  timestamp: string;
}

export interface CombinedLabReport {
  timestamp: string;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  attackReport: AttackLabReport;
  legitimateReport: AttackLabReport;
  falsePositiveCount: number;
  falseNegativeCount: number;
}
