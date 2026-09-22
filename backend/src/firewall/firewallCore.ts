import { checkTaint, ProvenanceRecord, TaintResult } from "../services/taintEngine";
import { getRisk, RiskResult } from "../services/riskEngine";
import { evaluatePolicy, PolicyDecision, PolicyTrustLevel } from "../services/policyEngine";
import { getFailClosedDecision, isSimulateFirewallDown } from "./failClosed";

export interface RawToolRequest {
  toolName: string;
  args: Record<string, unknown>;
  sessionContent: ProvenanceRecord[]; // docs the agent has read so far
  userAuthorized: boolean;
}

export interface FirewallResult {
  toolName: string;
  provenance: ProvenanceRecord[]; // relevant source(s) for this call
  taint: TaintResult; // from Phase 10
  risk: RiskResult; // from Phase 11
  policy: PolicyDecision; // from Phase 12
  timestamp: string;
}

/**
 * Orchestrates the 4 pure security engines in sequence:
 * Provenance -> Taint -> Risk -> Policy
 *
 * Implements straight-line pipeline execution with fail-closed error handling.
 * If any engine throws or unexpected errors occur, execution is blocked immediately.
 */
export async function runFirewallCheck(request: RawToolRequest): Promise<FirewallResult> {
  const timestamp = new Date().toISOString();
  const toolName = request?.toolName ?? "unknown";

  // Check manual failure injection simulation flag (Phase 19)
  if (isSimulateFirewallDown()) {
    const fallbackPolicy = getFailClosedDecision(
      toolName,
      "AgentShield unreachable (SIMULATE_FIREWALL_DOWN active)",
    );
    return {
      toolName,
      provenance: request?.sessionContent ?? [],
      taint: { tainted: false, matchedSources: [], matchedTerms: [] },
      risk: getRisk(toolName),
      policy: fallbackPolicy,
      timestamp,
    };
  }

  let provenance: ProvenanceRecord[] = [];
  let taint: TaintResult = { tainted: false, matchedSources: [], matchedTerms: [] };
  let risk: RiskResult = { risk: "CRITICAL", known: false };

  try {
    // 1. Provenance extraction from sessionContent
    const sessionContent = Array.isArray(request?.sessionContent) ? request.sessionContent : [];

    // 2. Taint Evaluation (Phase 10)
    taint = checkTaint(request?.args ?? {}, sessionContent);

    // Isolate relevant matched sources; fallback to session content if no taint matched
    const matchedSources = sessionContent.filter((source) =>
      taint.matchedSources.includes(source.sourceId),
    );
    provenance = matchedSources.length > 0 ? matchedSources : sessionContent;

    // 3. Risk Evaluation (Phase 11)
    risk = getRisk(request?.toolName);

    // 4. Trust level derivation
    // Untrusted if any matched source is untrusted, else trusted
    const hasUntrustedMatchedSource = matchedSources.some((source) => {
      const trust = String(source.trustLevel ?? "")
        .trim()
        .toLowerCase();
      return trust === "untrusted";
    });

    const trustLevel: PolicyTrustLevel =
      hasUntrustedMatchedSource || (taint.tainted && matchedSources.length > 0)
        ? "untrusted"
        : "trusted";

    // 5. Policy Decision (Phase 12)
    const policy = evaluatePolicy({
      trustLevel,
      tainted: taint.tainted,
      risk: risk.risk,
      riskKnown: risk.known,
      userAuthorized: Boolean(request?.userAuthorized),
    });

    return {
      toolName: request?.toolName ?? "",
      provenance,
      taint,
      risk,
      policy,
      timestamp,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      toolName: request?.toolName ?? "unknown",
      provenance,
      taint,
      risk,
      policy: {
        decision: "BLOCK",
        matchedRule: "Fail-Closed: Internal Pipeline Error",
        reasoning: `Internal firewall check failure: ${errorMessage}. Execution blocked for safety.`,
      },
      timestamp,
    };
  }
}
