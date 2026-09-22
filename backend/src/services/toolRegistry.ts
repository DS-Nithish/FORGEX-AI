/**
 * ARCHITECTURAL CONVENTION:
 * toolRegistry is the single source of truth for tool metadata, availability,
 * and risk assessment across AgentShield.
 *
 * All other modules (Firewall, Policy Engine, Tool Gateway, Evaluators)
 * must query this service rather than querying toolsRepository or the tools table directly.
 */

import { z } from "zod";
import { Database as SqlJsDatabase } from "sql.js";
import {
  createTool,
  getAllTools,
  getEnabledTools,
  getToolById,
} from "../db/repositories/toolsRepository";
import { Tool, RiskLevel } from "../shared/types";
import { RISK_LEVELS } from "../shared/riskLevels";
import { ToolNotFoundError } from "../shared/errors";

export const toolRegistrationSchema = z.object({
  id: z.string().min(1, "Tool id is required"),
  name: z.string().min(1, "Tool name is required"),
  risk_level: z.enum(RISK_LEVELS),
  description: z.string().optional().default(""),
  enabled: z.union([z.boolean(), z.number()]).optional(),
});

export type RegisterToolInput = z.input<typeof toolRegistrationSchema>;

/**
 * Retrieves a tool by ID. Throws ToolNotFoundError if the tool does not exist.
 * This typed error allows callers (e.g. firewall) to treat unknown tools as a distinct case.
 */
export function getTool(toolId: string, db?: SqlJsDatabase): Tool {
  const tool = getToolById(toolId, db);
  if (!tool) {
    throw new ToolNotFoundError(toolId);
  }
  return tool;
}

/**
 * Checks whether a tool is enabled. Returns false if disabled OR if the tool does not exist.
 * Safe for fast boolean gating without throwing errors.
 */
export function isToolEnabled(toolId: string, db?: SqlJsDatabase): boolean {
  const tool = getToolById(toolId, db);
  if (!tool) {
    return false;
  }
  return Boolean(tool.enabled);
}

/**
 * Returns the static risk level of a tool ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL').
 * Throws ToolNotFoundError if the tool is not found, ensuring unknown tools cannot be evaluated.
 */
export function getToolRiskLevel(toolId: string, db?: SqlJsDatabase): RiskLevel {
  const tool = getTool(toolId, db);
  return tool.risk_level;
}

/**
 * Returns all tools registered in the system.
 */
export function listAllTools(db?: SqlJsDatabase): Tool[] {
  return getAllTools(db);
}

/**
 * Returns only tools that are currently enabled.
 */
export function listEnabledTools(db?: SqlJsDatabase): Tool[] {
  return getEnabledTools(db);
}

/**
 * Validates and registers a new tool in the database.
 * Throws a ZodError if fields or risk_level fail validation.
 */
export function registerTool(tool: RegisterToolInput, db?: SqlJsDatabase): Tool {
  const validated = toolRegistrationSchema.parse(tool);
  return createTool(
    {
      id: validated.id,
      name: validated.name,
      risk_level: validated.risk_level,
      description: validated.description,
      enabled: validated.enabled ?? true,
    },
    db,
  );
}
