import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import {
  ToolRequest,
  RawToolRequestRow,
  RiskLevel,
  Decision,
  ToolRequestStatus,
} from "../../shared/types";
import { execute, generateId, nowISOString, queryAll, queryOne, safeParseJson } from "./helpers";

export interface CreateToolRequestInput {
  id?: string;
  agent_id?: string;
  tool_id: string;
  arguments: Record<string, unknown>;
  tainted: boolean;
  risk_level: RiskLevel;
  decision?: Decision;
  reason?: string | null;
  status?: ToolRequestStatus;
}

function mapToolRequestRow(row: RawToolRequestRow): ToolRequest {
  const status = (row.status ??
    (row.decision === "ALLOW"
      ? "allowed"
      : row.decision === "BLOCK"
        ? "blocked"
        : "pending")) as ToolRequestStatus;

  return {
    id: row.id,
    agent_id: row.agent_id,
    tool_id: row.tool_id,
    arguments: safeParseJson<Record<string, unknown>>(row.arguments, {}),
    tainted: row.tainted === 1,
    risk_level: row.risk_level,
    decision: row.decision,
    reason: row.reason,
    status,
    created_at: row.created_at,
  };
}

/**
 * Creates a tool request entry with status and decision tracking.
 * Generates an ID if not provided, stringifies arguments for storage, and returns parsed arguments.
 */
export function createToolRequest(data: CreateToolRequestInput, db?: SqlJsDatabase): ToolRequest {
  const targetDb = db ?? getDatabase();
  const id = data.id ?? generateId("req");
  const createdAt = nowISOString();
  const agentId = data.agent_id ?? null;
  const argumentsStr = JSON.stringify(data.arguments ?? {});
  const taintedInt = data.tainted ? 1 : 0;
  const decision: Decision = data.decision ?? "PENDING";
  const reason = data.reason ?? null;
  const status: ToolRequestStatus =
    data.status ??
    (decision === "ALLOW" ? "allowed" : decision === "BLOCK" ? "blocked" : "pending");

  execute(
    targetDb,
    "INSERT INTO tool_requests (id, agent_id, tool_id, arguments, tainted, risk_level, decision, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
    [
      id,
      agentId,
      data.tool_id,
      argumentsStr,
      taintedInt,
      data.risk_level,
      decision,
      reason,
      status,
      createdAt,
    ],
  );

  saveDatabase();

  return {
    id,
    agent_id: agentId,
    tool_id: data.tool_id,
    arguments: data.arguments,
    tainted: data.tainted,
    risk_level: data.risk_level,
    decision,
    reason,
    status,
    created_at: createdAt,
  };
}

/**
 * Fetches a tool request by its unique ID.
 * Parses the arguments JSON back into an object before returning.
 */
export function getToolRequestById(id: string, db?: SqlJsDatabase): ToolRequest | null {
  const targetDb = db ?? getDatabase();
  const row = queryOne<RawToolRequestRow>(targetDb, "SELECT * FROM tool_requests WHERE id = ?;", [
    id,
  ]);
  return row ? mapToolRequestRow(row) : null;
}

/**
 * Returns all tool requests with status = 'pending', ordered oldest first (created_at ASC).
 */
export function getPendingToolRequests(db?: SqlJsDatabase): ToolRequest[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawToolRequestRow>(
    targetDb,
    "SELECT * FROM tool_requests WHERE status = 'pending' ORDER BY created_at ASC, rowid ASC;",
  );
  return rows.map(mapToolRequestRow);
}

/**
 * Updates the decision and reason for a specific tool request.
 */
export function updateToolRequestDecision(
  id: string,
  decision: "ALLOW" | "CONFIRM" | "BLOCK",
  reason: string,
  db?: SqlJsDatabase,
): void {
  const targetDb = db ?? getDatabase();
  execute(targetDb, "UPDATE tool_requests SET decision = ?, reason = ? WHERE id = ?;", [
    decision,
    reason,
    id,
  ]);
  saveDatabase();
}

/**
 * Updates the status for a specific tool request.
 */
export function updateToolRequestStatus(
  id: string,
  status: ToolRequestStatus,
  db?: SqlJsDatabase,
): void {
  const targetDb = db ?? getDatabase();
  execute(targetDb, "UPDATE tool_requests SET status = ? WHERE id = ?;", [status, id]);
  saveDatabase();
}

/**
 * Atomically updates status from fromStatus to toStatus.
 * Returns true if exactly one row was updated, false if row was not in fromStatus or not found.
 * Provides a database-level race condition guard against concurrent approve/deny attempts.
 */
export function conditionalUpdateToolRequestStatus(
  id: string,
  fromStatus: ToolRequestStatus,
  toStatus: ToolRequestStatus,
  db?: SqlJsDatabase,
): boolean {
  const targetDb = db ?? getDatabase();
  execute(targetDb, "UPDATE tool_requests SET status = ? WHERE id = ? AND status = ?;", [
    toStatus,
    id,
    fromStatus,
  ]);
  const modified = targetDb.getRowsModified();
  saveDatabase();
  return modified > 0;
}

/**
 * Returns recent tool requests ordered by created_at DESC with parsed arguments.
 */
export function getRecentToolRequests(limit: number = 50, db?: SqlJsDatabase): ToolRequest[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawToolRequestRow>(
    targetDb,
    "SELECT * FROM tool_requests ORDER BY created_at DESC, rowid DESC LIMIT ?;",
    [limit],
  );
  return rows.map(mapToolRequestRow);
}
