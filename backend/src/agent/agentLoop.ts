/**
 * AGENT LOOP WITH SECURE FIREWALL INTERCEPTION (PHASE 15)
 *
 * All tool calls emitted by the AI Agent are intercepted and routed through
 * AgentShield Firewall before reaching the Tool Gateway.
 *
 * Flow:
 * Agent LLM ──> Tool Request ──> Firewall Check (/api/firewall/check) ──>
 *   ├── 'ALLOW'   ──> Tool Gateway executeTool()
 *   ├── 'CONFIRM' ──> pendingApproval() [halted, awaiting human approval]
 *   └── 'BLOCK'   ──> blocked() [halted, tool never touches Gateway]
 */

import { Database as SqlJsDatabase } from "sql.js";
import { FakeDocument, getDocumentById } from "../content";
import { getAgentTools } from "./toolDefinitions";
import { callLLMWithTools } from "./llmClient";
import { toolGateway, ToolExecutionResult, enableFirewallEnforcement } from "../gateway";
import { logger, TrustLevel } from "../shared";
import {
  registerSource,
  registerUserSource,
  TaintResult,
  ProvenanceRecord,
  RiskResult,
  getRisk,
} from "../services";
import { runFirewallCheck, FirewallResult, RawToolRequest } from "../firewall/firewallCore";
import { getFailClosedDecision, isSimulateFirewallDown } from "../firewall/failClosed";
import { createToolRequest } from "../db/repositories/toolRequestsRepository";
import { writeSecurityEvent } from "../db/repositories/securityEventsRepository";
import { generateId } from "../db/repositories/helpers";

export const DEFAULT_FIREWALL_TIMEOUT_MS = 5000;

export interface AgentRunInput {
  task: string;
  documentId?: string;
  sessionContent?: ProvenanceRecord[];
  userAuthorized?: boolean;
  firewallUrl?: string;
  firewallTimeoutMs?: number;
}

export type AgentExecutionStatus = "EXECUTED" | "BLOCKED" | "PENDING_APPROVAL" | "TEXT_ONLY";

export interface AgentRunResult {
  task: string;
  documentRead: FakeDocument | null;
  llmResponseText: string;
  toolCallRequested: { tool: string; arguments: Record<string, unknown> } | null;
  toolExecutionResult: ToolExecutionResult | null;
  sourceId: string;
  sourceTrustLevel: TrustLevel;
  sessionContent: ProvenanceRecord[];
  taint?: TaintResult | null;
  risk?: RiskResult | null;
  firewallResult?: FirewallResult | null;
  status: AgentExecutionStatus;
  requestId?: string;
}

/**
 * Handles 'CONFIRM' decision: persists tool request with status 'pending' (Phase 16)
 * and halts tool execution pending human approval.
 */
export function pendingApproval(
  firewallResult: FirewallResult,
  args: Record<string, unknown> = {},
  db?: SqlJsDatabase,
): ToolExecutionResult & { requestId: string } {
  let requestId = `req_${Date.now()}`;
  try {
    const record = createToolRequest(
      {
        tool_id: firewallResult.toolName,
        arguments: args,
        tainted: firewallResult.taint.tainted,
        risk_level: firewallResult.risk.risk,
        decision: "CONFIRM",
        reason: firewallResult.policy.reasoning,
        status: "pending",
      },
      db,
    );
    requestId = record.id;
  } catch (err) {
    logger.warn(`[FIREWALL] Failed to persist tool_request row for CONFIRM: ${err}`);
  }

  logger.warn(
    `[FIREWALL] CONFIRM required, awaiting human approval for tool '${firewallResult.toolName}' (requestId: ${requestId}). Matched: ${firewallResult.policy.matchedRule}`,
  );

  return {
    success: false,
    requestId,
    output: {
      requestId,
      status: "PENDING_APPROVAL",
      message: `CONFIRM required, awaiting human approval: ${firewallResult.policy.reasoning}`,
      matchedRule: firewallResult.policy.matchedRule,
      firewall: firewallResult,
    },
  };
}

/**
 * Handles 'BLOCK' decision: informs agent that tool action was blocked and terminates turn.
 */
export function blocked(firewallResult: FirewallResult): ToolExecutionResult {
  logger.warn(
    `[FIREWALL] Action blocked: ${firewallResult.policy.reasoning}. Matched: ${firewallResult.policy.matchedRule}`,
  );
  return {
    success: false,
    output: {
      status: "BLOCKED",
      message: `Action blocked: ${firewallResult.policy.reasoning}`,
      matchedRule: firewallResult.policy.matchedRule,
      firewall: firewallResult,
    },
  };
}

/**
 * Dispatches a tool request to the Firewall check (via HTTP route or pure in-process core).
 */
export async function checkFirewallInterception(
  request: RawToolRequest,
  endpointUrl?: string,
  timeoutMs: number = DEFAULT_FIREWALL_TIMEOUT_MS,
): Promise<FirewallResult> {
  const url = endpointUrl ?? process.env.FIREWALL_API_URL;
  const toolName = request.toolName;
  const riskResult = getRisk(toolName);

  // Failure-injection simulation check for live demo testing (Phase 19)
  if (isSimulateFirewallDown()) {
    logger.warn(
      `[FIREWALL FAIL-CLOSED] SIMULATE_FIREWALL_DOWN active. Triggering fail-closed fallback.`,
    );
    const fallbackPolicy = getFailClosedDecision(
      toolName,
      "AgentShield unreachable (SIMULATE_FIREWALL_DOWN active)",
    );
    return {
      toolName,
      provenance: request.sessionContent,
      taint: { tainted: false, matchedSources: [], matchedTerms: [] },
      risk: riskResult,
      policy: fallbackPolicy,
      timestamp: new Date().toISOString(),
    };
  }

  if (url) {
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller?.abort();
      }, timeoutMs);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: request.toolName,
          args: request.args,
          sessionContent: request.sessionContent,
          userAuthorized: request.userAuthorized,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;

      // Malformed/unexpected response shape check: must have valid string decision
      if (
        !data ||
        typeof data !== "object" ||
        !data.decision ||
        !["ALLOW", "CONFIRM", "BLOCK"].includes(data.decision)
      ) {
        throw new Error("Malformed firewall response: missing or invalid 'decision' field");
      }

      return {
        toolName: data.toolName || request.toolName,
        provenance: data.provenance ?? request.sessionContent,
        taint: data.taint ?? { tainted: false, matchedSources: [], matchedTerms: [] },
        risk: data.risk ?? riskResult,
        policy: {
          decision: data.decision,
          matchedRule: data.matchedRule || "Firewall Policy Evaluation",
          reasoning: data.reasoning || "Standard policy decision.",
        },
        timestamp: data.timestamp ?? new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const isTimeout =
        err?.name === "AbortError" ||
        err?.name === "TimeoutError" ||
        err?.message?.includes("aborted") ||
        err?.message?.includes("timed out");

      const errorMessage = isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);

      logger.error(
        `[FIREWALL ERROR] Failed to evaluate firewall check at '${url}': ${errorMessage}. Applying fail-closed fallback.`,
      );

      const fallbackPolicy = getFailClosedDecision(
        toolName,
        `AgentShield unreachable (${errorMessage})`,
      );

      return {
        toolName,
        provenance: request.sessionContent,
        taint: { tainted: false, matchedSources: [], matchedTerms: [] },
        risk: riskResult,
        policy: fallbackPolicy,
        timestamp: new Date().toISOString(),
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Pure in-process execution through Firewall Core
  return runFirewallCheck(request);
}

/**
 * THE SOLE AUTHORIZED CALL SITE FOR TOOL GATEWAY EXECUTION.
 *
 * Rewires tool execution so that NO tool call ever reaches the Gateway directly.
 * Flow:
 * Request ──> Firewall check (/api/firewall/check) ──>
 *   ├── 'ALLOW'   ──> toolGateway.execute(toolName, args)
 *   ├── 'CONFIRM' ──> pendingApproval(firewallResult) [halted, awaiting human approval]
 *   └── 'BLOCK'   ──> blocked(firewallResult) [halted, tool never touches Gateway]
 */
export async function executeInterceptedTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionContent: ProvenanceRecord[] = [],
  userAuthorized: boolean = false,
  db?: SqlJsDatabase,
  endpointUrl?: string,
  timeoutMs: number = DEFAULT_FIREWALL_TIMEOUT_MS,
): Promise<{
  toolExecutionResult: ToolExecutionResult;
  firewallResult: FirewallResult;
  status: AgentExecutionStatus;
  requestId?: string;
}> {
  // Step 1: Intercept tool request and send to firewall check
  const firewallResult = await checkFirewallInterception(
    {
      toolName,
      args,
      sessionContent,
      userAuthorized,
    },
    endpointUrl,
    timeoutMs,
  );

  let toolExecutionResult: ToolExecutionResult;
  let status: AgentExecutionStatus;
  let requestId: string | undefined;

  // Step 2: Route based on Firewall Decision
  // CRITICAL INVARIANT: EXACTLY ONE call site to toolGateway.execute exists in the agent loop,
  // and it is only reachable from this 'ALLOW' branch!
  switch (firewallResult.policy.decision) {
    case "ALLOW": {
      logger.info(
        `[FIREWALL] ALLOW decision granted for tool '${toolName}'. Routing to Tool Gateway.`,
      );
      if (!requestId) {
        requestId = generateId("req");
      }
      try {
        const record = createToolRequest(
          {
            id: requestId,
            tool_id: toolName,
            arguments: args,
            tainted: firewallResult.taint.tainted,
            risk_level: firewallResult.risk.risk,
            decision: "ALLOW",
            reason: firewallResult.policy.reasoning,
            status: "allowed",
          },
          db,
        );
        requestId = record.id;
      } catch (err) {
        logger.warn(`[FIREWALL] Failed to record allowed tool_request: ${err}`);
      }

      // Point 1: Firewall returns ALLOW -> write event immediately
      writeSecurityEvent(
        {
          requestId,
          eventType: "ALLOW",
          toolName,
          args,
          provenance: firewallResult.provenance,
          taint: firewallResult.taint,
          risk: firewallResult.risk,
          matchedRule: firewallResult.policy.matchedRule,
          reasoning: firewallResult.policy.reasoning,
          userAuthorized: Boolean(userAuthorized),
        },
        db,
      );

      toolExecutionResult = await toolGateway.execute(toolName, args, db, {
        authorized: true,
        decision: "ALLOW",
      });
      status = "EXECUTED";
      break;
    }

    case "CONFIRM": {
      logger.warn(
        `[FIREWALL] CONFIRM decision for tool '${toolName}'. Halting execution pending approval.`,
      );
      const pendingResult = pendingApproval(firewallResult, args, db);
      toolExecutionResult = pendingResult;
      requestId = pendingResult.requestId;
      status = "PENDING_APPROVAL";

      // Point 2: Firewall returns CONFIRM -> write event immediately
      writeSecurityEvent(
        {
          requestId: requestId || generateId("req"),
          eventType: "CONFIRM",
          toolName,
          args,
          provenance: firewallResult.provenance,
          taint: firewallResult.taint,
          risk: firewallResult.risk,
          matchedRule: firewallResult.policy.matchedRule,
          reasoning: firewallResult.policy.reasoning,
          userAuthorized: Boolean(userAuthorized),
        },
        db,
      );
      break;
    }

    case "BLOCK": {
      logger.warn(
        `[FIREWALL] BLOCK decision for tool '${toolName}'. Execution blocked fail-closed.`,
      );
      if (!requestId) {
        requestId = generateId("req");
      }
      try {
        const record = createToolRequest(
          {
            id: requestId,
            tool_id: toolName,
            arguments: args,
            tainted: firewallResult.taint.tainted,
            risk_level: firewallResult.risk.risk,
            decision: "BLOCK",
            reason: firewallResult.policy.reasoning,
            status: "blocked",
          },
          db,
        );
        requestId = record.id;
      } catch (err) {
        logger.warn(`[FIREWALL] Failed to record blocked tool_request: ${err}`);
      }

      // Point 3: Firewall returns BLOCK -> write event immediately
      writeSecurityEvent(
        {
          requestId,
          eventType: "BLOCK",
          toolName,
          args,
          provenance: firewallResult.provenance,
          taint: firewallResult.taint,
          risk: firewallResult.risk,
          matchedRule: firewallResult.policy.matchedRule,
          reasoning: firewallResult.policy.reasoning,
          userAuthorized: Boolean(userAuthorized),
        },
        db,
      );

      toolExecutionResult = blocked(firewallResult);
      status = "BLOCKED";
      break;
    }
  }

  return { toolExecutionResult, firewallResult, status, requestId };
}

/**
 * Runs an agent task end-to-end with full firewall interception.
 */
export async function runAgentTask(
  input: AgentRunInput,
  db?: SqlJsDatabase,
): Promise<AgentRunResult> {
  // Activate firewall enforcement at the Gateway boundary
  enableFirewallEnforcement();

  logger.info(`[AGENT] Starting task: "${input.task}" (document: ${input.documentId || "none"})`);

  // 1. Initialize and accumulate session content across steps
  const sessionContent: ProvenanceRecord[] = input.sessionContent ? [...input.sessionContent] : [];

  // Register user prompt provenance
  const userSource = registerUserSource({ task: input.task }, db);
  sessionContent.push({
    sourceId: userSource.id,
    sourceType: "USER",
    sourceName: "User Request",
    trustLevel: userSource.trust_level,
    content: input.task,
  });

  let documentRead: FakeDocument | null = null;
  let sourceId = userSource.id;
  let sourceTrustLevel = userSource.trust_level;

  // 2. Fetch document if specified and register provenance
  if (input.documentId) {
    documentRead = getDocumentById(input.documentId);
    if (!documentRead) {
      logger.warn(`[AGENT] Document '${input.documentId}' not found in content store.`);
    } else {
      const docSource = registerSource({ type: documentRead.type, name: documentRead.name }, db);
      sourceId = docSource.id;
      sourceTrustLevel = docSource.trust_level;

      sessionContent.push({
        sourceId: docSource.id,
        sourceType: documentRead.type,
        sourceName: documentRead.name,
        trustLevel: docSource.trust_level,
        content: documentRead.content,
      });
    }
  }

  // 3. Build user prompt
  let userMessage = input.task;
  if (documentRead) {
    userMessage = `Task: ${input.task}

Here is the document you were asked to read:
<document id="${documentRead.id}" name="${documentRead.name}" type="${documentRead.type}">
${documentRead.content}
</document>`;
  }

  // 4. Send task and enabled tools to LLM
  const tools = getAgentTools(db);
  const llmResponse = await callLLMWithTools({
    systemPrompt:
      "You are an automated deployment agent. Parse the migration document and invoke create_database as instructed.",
    userMessage,
    tools,
  });

  // 5. Intercept tool execution if requested
  if (llmResponse.toolCalls.length > 0) {
    const requested = llmResponse.toolCalls[0];
    const toolCallRequested = {
      tool: requested.name,
      arguments: requested.arguments,
    };

    logger.info(
      `[AGENT] LLM requested tool execution: ${requested.name}(${JSON.stringify(requested.arguments)})`,
    );

    const { toolExecutionResult, firewallResult, status, requestId } =
      await executeInterceptedTool(
        requested.name,
        requested.arguments,
        sessionContent,
        input.userAuthorized ?? false,
        db,
        input.firewallUrl,
        input.firewallTimeoutMs,
      );

    return {
      task: input.task,
      documentRead,
      llmResponseText: llmResponse.text,
      toolCallRequested,
      toolExecutionResult,
      sourceId,
      sourceTrustLevel,
      sessionContent,
      taint: firewallResult.taint,
      risk: firewallResult.risk,
      firewallResult,
      status,
      requestId,
    };
  }

  // 6. Text-only response
  logger.info("[AGENT] LLM produced text-only response (no tools requested).");
  return {
    task: input.task,
    documentRead,
    llmResponseText: llmResponse.text,
    toolCallRequested: null,
    toolExecutionResult: null,
    sourceId,
    sourceTrustLevel,
    sessionContent,
    taint: null,
    risk: null,
    firewallResult: null,
    status: "TEXT_ONLY",
  };
}
