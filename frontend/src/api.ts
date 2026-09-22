export interface ToolRequest {
  id: string;
  agent_id: string | null;
  tool_id: string;
  arguments: Record<string, unknown>;
  tainted: boolean;
  risk_level: string;
  decision: string;
  reason: string | null;
  status: "pending" | "approved" | "denied" | "allowed" | "blocked";
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  request_id: string;
  event_type: "ALLOW" | "CONFIRM" | "BLOCK" | "APPROVED" | "DENIED";
  tool_name: string;
  arguments: Record<string, unknown>;
  tainted: boolean;
  risk_level: string;
  matched_rule: string;
  reasoning: string;
  provenance_summary: string | null;
  created_at: string;
}

export interface DecisionExplanation {
  eventId: string;
  requestId: string;
  timestamp: string;
  summary: string;
  verdict: {
    decision: string;
    matchedRule: string;
    humanMeaning: string;
  };
  provenanceEvidence: {
    sourceCount: number;
    untrustedSources: string[];
    trustedSources: string[];
  };
  taintEvidence: {
    tainted: boolean;
    matchedTerms: string[];
    explanation: string;
  };
  riskEvidence: {
    toolName: string;
    riskLevel: string;
    isKnownTool: boolean;
  };
}

export interface AttackScenarioResult {
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
  timestamp: string;
}

export interface CombinedReport {
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  falsePositiveCount: number;
  falseNegativeCount: number;
  attackReport: {
    results: AttackScenarioResult[];
  };
  legitimateReport: {
    results: AttackScenarioResult[];
  };
  results: AttackScenarioResult[];
}

const BASE_URL = "";

export async function fetchPendingApprovals(): Promise<ToolRequest[]> {
  const res = await fetch(`${BASE_URL}/api/approvals/pending`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pending approvals: ${res.statusText}`);
  }
  return res.json();
}

export async function approveRequest(requestId: string): Promise<{ success: boolean; result?: unknown }> {
  const res = await fetch(`${BASE_URL}/api/approvals/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Approval failed with status ${res.status}`);
  }
  return res.json();
}

export async function denyRequest(requestId: string, reason?: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${BASE_URL}/api/approvals/${encodeURIComponent(requestId)}/deny`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "Denied by operator" }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Denial failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
  const res = await fetch(`${BASE_URL}/api/events?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch security events: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchEventExplanation(requestId: string): Promise<DecisionExplanation> {
  const res = await fetch(`${BASE_URL}/api/events/${encodeURIComponent(requestId)}/explain`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to fetch explanation for ${requestId}`);
  }
  const data = await res.json();
  // Handle single object or array
  return Array.isArray(data) ? data[data.length - 1] : data;
}

export async function runAttackLab(): Promise<CombinedReport> {
  const res = await fetch(`${BASE_URL}/api/attack-lab/run`);
  if (!res.ok) {
    throw new Error(`Failed to run attack lab: ${res.statusText}`);
  }
  return res.json();
}
