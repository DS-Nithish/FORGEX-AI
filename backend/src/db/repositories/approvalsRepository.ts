import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import { Approval, RawApprovalRow, ApprovalStatus } from "../../shared/types";
import { execute, generateId, nowISOString, queryAll, queryOne } from "./helpers";

function mapApprovalRow(row: RawApprovalRow): Approval {
  return {
    id: row.id,
    request_id: row.request_id,
    status: row.status,
    approved_by: row.approved_by,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
  };
}

/**
 * Creates a human-in-the-loop approval record initialized to 'PENDING'.
 */
export function createApproval(requestId: string, db?: SqlJsDatabase): Approval {
  const targetDb = db ?? getDatabase();
  const id = generateId("appr");
  const createdAt = nowISOString();
  const status: ApprovalStatus = "PENDING";

  execute(
    targetDb,
    "INSERT INTO approvals (id, request_id, status, approved_by, created_at, resolved_at) VALUES (?, ?, ?, NULL, ?, NULL);",
    [id, requestId, status, createdAt],
  );

  saveDatabase();

  return {
    id,
    request_id: requestId,
    status,
    approved_by: null,
    created_at: createdAt,
    resolved_at: null,
  };
}

/**
 * Fetches an approval by its unique ID.
 */
export function getApprovalById(id: string, db?: SqlJsDatabase): Approval | null {
  const targetDb = db ?? getDatabase();
  const row = queryOne<RawApprovalRow>(targetDb, "SELECT * FROM approvals WHERE id = ?;", [id]);
  return row ? mapApprovalRow(row) : null;
}

/**
 * Retrieves all currently pending approval requests ordered by creation time ASC.
 */
export function getPendingApprovals(db?: SqlJsDatabase): Approval[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawApprovalRow>(
    targetDb,
    "SELECT * FROM approvals WHERE status = 'PENDING' ORDER BY created_at ASC;",
  );
  return rows.map(mapApprovalRow);
}

/**
 * Resolves an approval, updating status, approved_by, and setting resolved_at to the current timestamp.
 */
export function resolveApproval(
  id: string,
  status: "APPROVED" | "DENIED",
  approvedBy?: string,
  db?: SqlJsDatabase,
): void {
  const targetDb = db ?? getDatabase();
  const resolvedAt = nowISOString();

  execute(
    targetDb,
    "UPDATE approvals SET status = ?, approved_by = ?, resolved_at = ? WHERE id = ?;",
    [status, approvedBy ?? null, resolvedAt, id],
  );

  saveDatabase();
}
