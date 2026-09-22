/**
 * TOOL GATEWAY
 *
 * This module is the sole execution boundary for protected tools.
 * All tool actions must pass through executeTool. Direct calls to underlying
 * implementations are strictly prohibited (PRD Section 13).
 *
 * In Phase 15, all tool executions must be authorized by AgentShield Firewall
 * with decision 'ALLOW'.
 */

import { Database as SqlJsDatabase } from "sql.js";
import { getTool, isToolEnabled } from "../services/toolRegistry";
import { ToolDisabledError } from "../shared/errors";
import { toolImplementations } from "./toolImplementations";
import { logger } from "../shared";

export interface ToolExecutionResult {
  success: boolean;
  output: unknown;
}

export interface GatewayAuthContext {
  authorized: boolean;
  decision: "ALLOW";
}

export class DirectGatewayAccessError extends Error {
  constructor(toolId: string) {
    super(
      `[SECURITY VIOLATION] Direct execution of protected tool '${toolId}' bypassing AgentShield Firewall is prohibited. All executions must flow through the Firewall interception pipeline.`,
    );
    this.name = "DirectGatewayAccessError";
  }
}

let firewallEnforcementActive = true;

export function enableFirewallEnforcement(): void {
  firewallEnforcementActive = true;
}

export function disableFirewallEnforcement(): void {
  firewallEnforcementActive = false;
}

export function isFirewallEnforcementActive(): boolean {
  return firewallEnforcementActive;
}

import * as selfModule from "./toolGateway";

export const toolGateway = {
  execute(
    toolId: string,
    args: Record<string, unknown>,
    db?: SqlJsDatabase,
    auth?: GatewayAuthContext,
  ): Promise<ToolExecutionResult> {
    return (selfModule.executeTool || executeTool)(toolId, args, db, auth);
  },
  executeTool(
    toolId: string,
    args: Record<string, unknown>,
    db?: SqlJsDatabase,
    auth?: GatewayAuthContext,
  ): Promise<ToolExecutionResult> {
    return (selfModule.executeTool || executeTool)(toolId, args, db, auth);
  },
};

/**
 * Executes a protected tool action through the isolated Gateway boundary.
 *
 * Validation pipeline:
 * 1. Checks firewall authorization (throws DirectGatewayAccessError if enforcement active and unauthorized)
 * 2. Checks tool existence in Tool Registry (propagates ToolNotFoundError if missing)
 * 3. Verifies tool is enabled (throws ToolDisabledError if disabled)
 * 4. Finds implementation (throws Error if misconfigured/missing)
 * 5. Executes implementation with error isolation (catches runtime errors and returns failure)
 */
export async function executeTool(
  toolId: string,
  args: Record<string, unknown>,
  db?: SqlJsDatabase,
  auth?: GatewayAuthContext,
): Promise<ToolExecutionResult> {
  // 1. Check Firewall Authorization
  if (firewallEnforcementActive && (!auth || !auth.authorized || auth.decision !== "ALLOW")) {
    logger.error(
      `[GATEWAY SECURITY VIOLATION] Attempted direct execution of tool '${toolId}' without firewall authorization!`,
    );
    throw new DirectGatewayAccessError(toolId);
  }

  if (!auth || !auth.authorized) {
    logger.warn(
      `[GATEWAY WARNING] Direct execution of tool '${toolId}' called without explicit firewall authorization context.`,
    );
  }

  // 2. Verify existence in registry
  getTool(toolId, db);

  // 3. Check enabled status
  if (!isToolEnabled(toolId, db)) {
    throw new ToolDisabledError(toolId);
  }

  // 4. Locate registered implementation
  const implementation = toolImplementations[toolId];
  if (!implementation) {
    throw new Error(`No implementation registered for tool '${toolId}'`);
  }

  logger.info(`[GATEWAY] Executing tool '${toolId}'`);

  // 5. Safely execute implementation
  try {
    const result = await implementation(args);
    logger.info(`[GATEWAY] Tool '${toolId}' executed successfully`);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[GATEWAY] Tool '${toolId}' execution failed: ${errorMessage}`);
    return {
      success: false,
      output: { error: errorMessage },
    };
  }
}
