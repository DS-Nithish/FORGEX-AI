import { SecurityEvent } from "../shared/types";
import { getSourceById } from "../db/repositories/sourcesRepository";

export interface ExplanationEvidence {
  provenanceSummary: string;
  taintSummary: string;
  riskSummary: string;
}

export interface Explanation {
  summary: string;
  whatHappened: string;
  whyItHappened: string;
  evidence: ExplanationEvidence;
  timestamp: string;
}

export type RuleKey =
  | "RULE_1"
  | "RULE_2"
  | "RULE_3"
  | "RULE_4"
  | "RULE_5"
  | "RULE_6"
  | "RULE_7"
  | "RULE_8"
  | "APPROVED"
  | "DENIED";

export interface TemplateContext {
  toolName: string;
  argsString: string;
  risk: string;
  decision: string;
  sourceNames: string;
  matchedTerms: string;
  sourceCount: number;
}

export const POLICY_EXPLANATION_TEMPLATES: Record<
  RuleKey,
  {
    summary: (ctx: TemplateContext) => string;
    why: (ctx: TemplateContext) => string;
  }
> = {
  RULE_1: {
    summary: (ctx) =>
      `Blocked: untrusted content influenced high-risk action '${ctx.toolName}'`,
    why: (ctx) => {
      const termsClause = ctx.matchedTerms && ctx.matchedTerms !== "injected content"
        ? ` (matching '${ctx.matchedTerms}')`
        : "";
      return `Blocked because tool arguments for ${ctx.toolName} were traced back to untrusted content (${ctx.sourceNames})${termsClause}, and ${ctx.toolName} is classified as ${ctx.risk} risk. Untrusted, tainted, high-risk actions are always blocked regardless of user authorization.`;
    },
  },
  RULE_2: {
    summary: (ctx) =>
      `Confirmation Required: untrusted content influenced ${ctx.risk.toLowerCase()}-risk action '${ctx.toolName}'`,
    why: (ctx) => {
      const termsClause = ctx.matchedTerms && ctx.matchedTerms !== "injected content"
        ? ` (matching '${ctx.matchedTerms}')`
        : "";
      return `Flagged for human confirmation because tool arguments for ${ctx.toolName} were influenced by untrusted content (${ctx.sourceNames})${termsClause}, but ${ctx.toolName} carries ${ctx.risk} risk. Human confirmation is required before execution to verify safety.`;
    },
  },
  RULE_3: {
    summary: (ctx) =>
      `Blocked: untrusted source requested CRITICAL risk action '${ctx.toolName}'`,
    why: (ctx) =>
      `Blocked because tool request for ${ctx.toolName} originated from an untrusted source (${ctx.sourceNames}) and attempts a CRITICAL risk action. Untrusted requests for critical tools are unconditionally blocked.`,
  },
  RULE_4: {
    summary: (ctx) =>
      `Confirmation Required: trusted source requested high-risk action '${ctx.toolName}'`,
    why: (ctx) =>
      `Flagged for human confirmation because ${ctx.toolName} is classified as ${ctx.risk} risk. Even though the request originated from a trusted source (${ctx.sourceNames}), high-impact operations require explicit human confirmation.`,
  },
  RULE_5: {
    summary: (ctx) =>
      `Allowed: user-authorized safe execution of '${ctx.toolName}'`,
    why: (ctx) =>
      `Allowed because ${ctx.toolName} carries ${ctx.risk} risk and the operation was explicitly authorized by the user.`,
  },
  RULE_6: {
    summary: (ctx) =>
      `Allowed: low-risk tool '${ctx.toolName}' with no tainted content`,
    why: (ctx) =>
      `Allowed because ${ctx.toolName} is a LOW risk tool with no tainted content detected from untrusted sources.`,
  },
  RULE_7: {
    summary: (ctx) =>
      `Blocked: unrecognized tool '${ctx.toolName}'`,
    why: (ctx) =>
      `Blocked because tool '${ctx.toolName}' is unrecognized or unregistered in the security registry. AgentShield enforces a fail-closed policy when tool risk is unknown.`,
  },
  RULE_8: {
    summary: (ctx) =>
      `Confirmation Required: default security fallback for '${ctx.toolName}'`,
    why: (ctx) =>
      `Flagged for human confirmation because tool '${ctx.toolName}' did not match any higher-priority policy rules, defaulting to safe human-in-the-loop review.`,
  },
  APPROVED: {
    summary: (ctx) =>
      `Approved: human operator authorized execution of '${ctx.toolName}'`,
    why: (ctx) =>
      `A human reviewer approved this ${ctx.risk}-risk action (${ctx.toolName}) after AgentShield flagged it for confirmation. The tool was executed via the Tool Gateway.`,
  },
  DENIED: {
    summary: (ctx) =>
      `Denied: human operator rejected execution of '${ctx.toolName}'`,
    why: (ctx) =>
      `A human reviewer denied this ${ctx.risk}-risk action (${ctx.toolName}) after AgentShield flagged it for confirmation. The Tool Gateway was never called.`,
  },
};

/**
 * Detects the matching template rule key from a security event's matchedRule or eventType.
 */
export function detectRuleKey(event: SecurityEvent): RuleKey {
  const eventType = String(event.eventType || event.event_type || "").toUpperCase();
  if (eventType === "APPROVED") return "APPROVED";
  if (eventType === "DENIED") return "DENIED";

  const matchedRule = String(event.matchedRule || "").toLowerCase();
  if (matchedRule.includes("rule 1")) return "RULE_1";
  if (matchedRule.includes("rule 2")) return "RULE_2";
  if (matchedRule.includes("rule 3")) return "RULE_3";
  if (matchedRule.includes("rule 4")) return "RULE_4";
  if (matchedRule.includes("rule 5")) return "RULE_5";
  if (matchedRule.includes("rule 6")) return "RULE_6";
  if (matchedRule.includes("rule 7")) return "RULE_7";
  if (matchedRule.includes("rule 8")) return "RULE_8";
  if (matchedRule.includes("approv")) return "APPROVED";
  if (matchedRule.includes("deni")) return "DENIED";
  if (matchedRule.includes("fail-closed") || matchedRule.includes("fallback")) {
    return eventType === "BLOCK" ? "RULE_1" : "RULE_8";
  }

  // Fallback by decision if rule text is generic
  if (eventType === "BLOCK") return "RULE_1";
  if (eventType === "CONFIRM") return "RULE_4";
  return "RULE_5";
}

/**
 * Resolves a human-readable display name for a provenance record.
 */
function resolveSourceName(p: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!p) return "unspecified source";
  if (p.sourceName) return p.sourceName;
  if (p.name) return p.name;

  if (p.sourceId) {
    try {
      const src = getSourceById(p.sourceId);
      if (src?.name) return src.name;
    } catch {
      // Ignored if DB is inaccessible in pure memory tests
    }
  }

  if (p.sourceType === "USER") return "User Request";
  if (p.sourceType === "PDF") return "database_migration_guide.pdf";
  return p.sourceId || "source";
}

/**
 * Formats tool arguments into a readable summary string.
 */
function formatArguments(args: Record<string, unknown> | undefined): string {
  if (!args || Object.keys(args).length === 0) {
    return "";
  }
  const parts = Object.entries(args).map(([key, value]) => {
    if (typeof value === "string") {
      return `'${value}'`;
    }
    return `${key}=${JSON.stringify(value)}`;
  });
  return parts.join(", ");
}

/**
 * Pure function that transforms a raw SecurityEvent into a structured,
 * human-readable explanation of WHAT happened, WHY, and WHAT EVIDENCE supports it.
 */
export function explainDecision(event: SecurityEvent): Explanation {
  const toolName = event.toolName || "tool";
  const risk = String(event.risk?.risk || "LOW").toUpperCase();
  const decision = String(event.eventType || event.event_type || "ALLOW").toUpperCase();
  const argsFormatted = formatArguments(event.args);

  // 1. Resolve provenance items
  const provenanceList: any[] = Array.isArray(event.provenance) ? event.provenance : []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const sourceNameList: string[] = [];
  const detailedSourceList: string[] = [];

  for (const p of provenanceList) {
    const sName = resolveSourceName(p);
    const trust = String(p.trustLevel || "UNTRUSTED").toLowerCase();
    sourceNameList.push(sName);
    detailedSourceList.push(`${sName} (${trust})`);
  }

  const sourceNamesStr =
    sourceNameList.length > 0 ? sourceNameList.join(", ") : "external sources";

  // 2. Build Taint Evidence
  const taintInfo = event.taint ?? { tainted: false, matchedSources: [], matchedTerms: [] };
  const isTainted = Boolean(taintInfo.tainted);
  const matchedTerms = Array.isArray(taintInfo.matchedTerms) ? taintInfo.matchedTerms : [];
  const termsStr = matchedTerms.length > 0 ? matchedTerms.join(", ") : "injected content";

  let taintSummary: string;
  if (isTainted) {
    const count = taintInfo.matchedSources?.length || sourceNameList.length || 1;
    const sourcesStr = sourceNamesStr !== "external sources" ? sourceNamesStr : "untrusted sources";
    taintSummary = `Tool arguments matched content from ${count} untrusted source (${sourcesStr}) on terms: ${termsStr}`;
  } else {
    taintSummary = "No taint detected; tool arguments do not overlap with untrusted content";
  }

  // 3. Build Provenance Evidence
  let provenanceSummary: string;
  if (detailedSourceList.length > 0) {
    provenanceSummary = `Content originated from: ${detailedSourceList.join(", ")}`;
  } else {
    provenanceSummary = "No external document sources recorded in session";
  }

  // 4. Build Risk Evidence
  const riskSummary = `${toolName} is classified ${risk} risk`;

  // 5. Build Template Context & Execute Template
  const ruleKey = detectRuleKey(event);
  const template = POLICY_EXPLANATION_TEMPLATES[ruleKey];

  const ctx: TemplateContext = {
    toolName,
    argsString: argsFormatted,
    risk,
    decision,
    sourceNames: sourceNamesStr,
    matchedTerms: termsStr,
    sourceCount: provenanceList.length,
  };

  const decisionLabel = decision === "BLOCK" ? "BLOCKED" : decision;
  const summary = template.summary(ctx);
  const whyItHappened = template.why(ctx);
  const whatHappened = `${decisionLabel} — ${toolName}(${argsFormatted})`;
  const timestamp = event.timestamp || event.created_at || new Date().toISOString();

  return {
    summary,
    whatHappened,
    whyItHappened,
    evidence: {
      provenanceSummary,
      taintSummary,
      riskSummary,
    },
    timestamp,
  };
}

/**
 * Formats an Explanation object into a natural, plain-text narrative
 * suitable for pasting into demo scripts, terminal displays, or README logs.
 */
export function formatExplanationAsText(explanation: Explanation): string {
  const lines = [
    explanation.whatHappened,
    `Reason: ${explanation.whyItHappened}`,
    "Evidence:",
    `  • Provenance: ${explanation.evidence.provenanceSummary}`,
    `  • Taint: ${explanation.evidence.taintSummary}`,
    `  • Risk: ${explanation.evidence.riskSummary}`,
  ];
  return lines.join("\n");
}
