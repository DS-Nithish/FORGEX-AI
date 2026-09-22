import {
  addToolRequest,
  type Decision,
  type RiskLevel,
  type ToolRequestRecord,
  type TrustLevel,
} from "../store/memoryStore";

export interface ProposedToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface InvocationContext {
  sourceType: "USER" | "PDF";
  documentIsAttached: boolean;
  documentName?: string;
}

export interface FirewallDecisionResult {
  requestId: string;
  tool: string;
  arguments: Record<string, unknown>;
  decision: Decision;
  reason: string;
  trustLevel: TrustLevel;
  tainted: boolean;
  riskLevel: RiskLevel;
}

export const STATIC_RISK_MAP: Record<string, RiskLevel> = {
  summarize_document: "LOW",
  search_web: "LOW",
  web_search: "LOW",
  execute_privileged_action: "HIGH",
};

/**
 * Pure policy decision engine.
 */
export function evaluatePolicy(
  risk: RiskLevel,
  tainted: boolean,
  trustLevel: TrustLevel,
  toolName: string,
): { decision: Decision; reason: string } {
  // Policy rule 1: LOW risk tools are always ALLOWED
  if (risk === "LOW") {
    return {
      decision: "ALLOW",
      reason: `Tool '${toolName}' carries LOW operational risk and is permitted by default security policy.`,
    };
  }

  // Policy rule 2: HIGH risk tool from tainted context is BLOCKED
  if (risk === "HIGH" && tainted) {
    return {
      decision: "BLOCK",
      reason: `BLOCKED by AgentShield runtime firewall: tool '${toolName}' was triggered from an UNTRUSTED, TAINTED document context. This indicates an indirect prompt injection or unauthorized privilege escalation attempt.`,
    };
  }

  // Policy rule 3: HIGH risk tool requested cleanly by trusted user requires CONFIRM
  if (risk === "HIGH" && !tainted && trustLevel === "TRUSTED") {
    return {
      decision: "CONFIRM",
      reason: `Flagged for human confirmation: tool '${toolName}' carries HIGH risk. Action was directly requested by a verified USER and requires operator authorization.`,
    };
  }

  // Default fallback
  return {
    decision: "CONFIRM",
    reason: `Flagged for confirmation: tool '${toolName}' requires human operator review before execution.`,
  };
}

/**
 * ARCHITECTURAL CENTERPIECE: The Runtime Security Firewall Middleware.
 * Every proposed tool call from an AI agent MUST pass through this single checkpoint.
 * It enforces provenance, taint tracking, static risk lookup, policy gating,
 * and records the full audit record to the in-memory store.
 */
export async function firewallMiddleware(
  proposedCall: ProposedToolCall,
  context: InvocationContext,
): Promise<FirewallDecisionResult> {
  const toolName = proposedCall.tool;
  const toolArgs = proposedCall.arguments || {};

  // a. PROVENANCE: A PDF document is ALWAYS untrusted, regardless of text content
  const trustLevel: TrustLevel = context.sourceType === "USER" ? "TRUSTED" : "UNTRUSTED";

  // b. TAINT: Any privileged action proposal arising from an untrusted document task is tainted
  const tainted =
    toolName === "execute_privileged_action" &&
    (context.documentIsAttached || context.sourceType === "PDF");

  // c. RISK: Static risk level per tool
  const riskLevel: RiskLevel = STATIC_RISK_MAP[toolName] || "HIGH";

  // d. POLICY: Pure deterministic evaluation
  const { decision, reason } = evaluatePolicy(riskLevel, tainted, trustLevel, toolName);

  // Generate unique request record ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const record: ToolRequestRecord = {
    id: requestId,
    tool_name: toolName,
    arguments: toolArgs,
    source_type: context.sourceType,
    trust_level: trustLevel,
    tainted,
    risk_level: riskLevel,
    decision,
    reason,
    status: decision === "ALLOW" ? "resolved" : decision === "BLOCK" ? "blocked" : "pending",
    execution_result: null,
    created_at: new Date().toISOString(),
  };

  // e. Record full decision object into the in-memory store
  addToolRequest(record);

  // Sync to core AgentShield backend so main dashboard updates live
  syncToCoreBackend(record, context);

  // f. Return decision object to caller
  return {
    requestId,
    tool: toolName,
    arguments: toolArgs,
    decision,
    reason,
    trustLevel,
    tainted,
    riskLevel,
  };
}

/**
 * Non-blocking fire-and-forget sync to the core AgentShield backend (port 4000)
 */
export function syncToCoreBackend(
  record: ToolRequestRecord,
  context?: InvocationContext,
): void {
  const coreUrl = process.env.CORE_BACKEND_URL || "http://localhost:4000";
  const payload = {
    requestId: record.id,
    eventType: record.decision,
    toolName: record.tool_name,
    args: record.arguments,
    provenance: [
      {
        source:
          context?.documentName ||
          (record.source_type === "PDF" ? "uploaded_document.pdf" : "user_chat"),
        trust: record.trust_level,
        type: record.source_type,
      },
    ],
    taint: {
      tainted: record.tainted,
      matchedSources: record.tainted
        ? [context?.documentName || "uploaded_document.pdf"]
        : [],
      matchedTerms: record.tainted ? ["indirect_prompt_injection"] : [],
    },
    risk: {
      risk: record.risk_level,
      known: true,
    },
    matchedRule:
      record.decision === "BLOCK"
        ? "Prompt Injection Defense (Blocked Tainted High-Risk Tool)"
        : record.decision === "CONFIRM"
        ? "Human Confirmation Required (High-Risk Action)"
        : "Standard Safe Execution (Low-Risk Tool)",
    reasoning: record.reason,
    userAuthorized: record.decision === "ALLOW" && record.trust_level === "TRUSTED",
    timestamp: record.created_at,
  };

  fetch(`${coreUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Non-blocking fail-safe: main backend might be temporarily offline
  });
}

