import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import {
  SecurityEvent,
  RawSecurityEventRow,
  Severity,
  SecurityEventType,
} from "../../shared/types";
import { execute, generateId, nowISOString, queryAll, safeParseJson } from "./helpers";

export interface WriteSecurityEventInput {
  requestId: string;
  eventType: SecurityEventType | string;
  toolName: string;
  args: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  provenance: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  taint: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  risk: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  matchedRule: string;
  reasoning: string;
  userAuthorized?: boolean;
  timestamp?: string;

  // Optional legacy fields for backward compatibility
  id?: string;
  request_id?: string;
  event_type?: string;
  severity?: Severity;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type CreateSecurityEventInput = WriteSecurityEventInput;

function mapSecurityEventRow(row: RawSecurityEventRow): SecurityEvent {
  const reqId = row.request_id || "";
  const evtType = (row.event_type || "") as SecurityEventType;
  const toolName = row.tool_name || "";
  const args = safeParseJson<Record<string, any>>(row.args, {}); // eslint-disable-line @typescript-eslint/no-explicit-any
  const provenance = safeParseJson<any[]>(row.provenance, []); // eslint-disable-line @typescript-eslint/no-explicit-any
  const taint = safeParseJson<any>(row.taint, { // eslint-disable-line @typescript-eslint/no-explicit-any
    tainted: false,
    matchedSources: [],
    matchedTerms: [],
  });
  const risk = safeParseJson<any>(row.risk, { risk: "LOW", known: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const matchedRule = row.matched_rule || "";
  const reasoning = row.reasoning || row.reason || "";
  const userAuthorized = Boolean(row.user_authorized);
  const timestamp = row.timestamp || row.created_at;

  return {
    id: row.id,
    requestId: reqId,
    eventType: evtType,
    toolName,
    args,
    provenance,
    taint,
    risk,
    matchedRule,
    reasoning,
    userAuthorized,
    timestamp,

    // Legacy fields
    request_id: row.request_id,
    event_type: row.event_type,
    severity: row.severity ?? "INFO",
    reason: row.reason || reasoning,
    metadata: safeParseJson<Record<string, unknown> | null>(row.metadata, null),
    created_at: row.created_at,
    tool_name: toolName,
    arguments: args,
    tainted: Boolean(taint?.tainted),
    risk_level: risk?.risk || "LOW",
    matched_rule: matchedRule,
  };
}

/**
 * Creates and logs a security event entry directly into SQLite.
 * Handles both rich Phase 17 fields and backward-compatible fields.
 */
export function createSecurityEvent(
  data: Partial<WriteSecurityEventInput> & { event_type?: string; reason?: string },
  db?: SqlJsDatabase,
): SecurityEvent {
  const targetDb = db ?? getDatabase();
  const id = data.id ?? generateId("evt");
  const timestamp = data.timestamp ?? nowISOString();
  const requestId = data.requestId ?? data.request_id ?? null;
  const eventType = data.eventType ?? data.event_type ?? "ALLOW";
  const toolName = data.toolName ?? "";
  const argsStr = JSON.stringify(data.args ?? {});
  const provenanceStr = JSON.stringify(data.provenance ?? []);
  const taintStr = JSON.stringify(data.taint ?? {});
  const riskStr = JSON.stringify(data.risk ?? {});
  const matchedRule = data.matchedRule ?? "";
  const reasoning = data.reasoning ?? data.reason ?? "";
  const userAuthorizedInt = data.userAuthorized ? 1 : 0;
  const severity: Severity =
    data.severity ?? (data.risk?.risk as Severity) ?? "INFO";
  const reason = data.reason ?? reasoning;
  const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;

  execute(
    targetDb,
    `INSERT INTO security_events (
      id, request_id, event_type, tool_name, args, provenance, taint, risk,
      matched_rule, reasoning, user_authorized, severity, reason, metadata,
      timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      requestId,
      eventType,
      toolName,
      argsStr,
      provenanceStr,
      taintStr,
      riskStr,
      matchedRule,
      reasoning,
      userAuthorizedInt,
      severity,
      reason,
      metadataStr,
      timestamp,
      timestamp,
    ],
  );

  saveDatabase();

  return mapSecurityEventRow({
    id,
    request_id: requestId,
    event_type: eventType,
    tool_name: toolName,
    args: argsStr,
    provenance: provenanceStr,
    taint: taintStr,
    risk: riskStr,
    matched_rule: matchedRule,
    reasoning,
    user_authorized: userAuthorizedInt,
    severity,
    reason,
    metadata: metadataStr,
    timestamp,
    created_at: timestamp,
  });
}

/**
 * Standard audit logger for AgentShield (FR-11).
 *
 * Guaranteed fail-safe: Best-effort fire-and-forget write with console.error
 * logging on failure so the firewall decision and gateway execution are NEVER
 * blocked or aborted if the audit log persistence fails.
 */
export function writeSecurityEvent(
  data: WriteSecurityEventInput,
  db?: SqlJsDatabase,
): SecurityEvent | null {
  try {
    return createSecurityEvent(data, db);
  } catch (err) {
    console.error(
      `[AUDIT] Best-effort security event write failed for request '${data.requestId || data.request_id}':`,
      err,
    );
    return null;
  }
}

export interface SecurityEventFilter {
  limit?: number;
  eventType?: string;
  requestId?: string;
  toolName?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Retrieves security events ordered newest first, with optional filters:
 * - eventType ('ALLOW' | 'CONFIRM' | 'BLOCK' | 'APPROVED' | 'DENIED')
 * - requestId (FK to tool_requests)
 * - toolName
 * - startDate / endDate date range
 */
export function getSecurityEvents(
  filters: SecurityEventFilter = {},
  db?: SqlJsDatabase,
): SecurityEvent[] {
  const targetDb = db ?? getDatabase();
  let sql = "SELECT * FROM security_events WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters.eventType) {
    sql += " AND event_type = ?";
    params.push(filters.eventType);
  }
  if (filters.requestId) {
    sql += " AND request_id = ?";
    params.push(filters.requestId);
  }
  if (filters.toolName) {
    sql += " AND tool_name = ?";
    params.push(filters.toolName);
  }
  if (filters.startDate) {
    sql += " AND (timestamp >= ? OR created_at >= ?)";
    params.push(filters.startDate, filters.startDate);
  }
  if (filters.endDate) {
    sql += " AND (timestamp <= ? OR created_at <= ?)";
    params.push(filters.endDate, filters.endDate);
  }

  sql += " ORDER BY timestamp DESC, created_at DESC, rowid DESC LIMIT ?;";
  const limit = typeof filters.limit === "number" && filters.limit > 0 ? filters.limit : 50;
  params.push(limit);

  const rows = queryAll<RawSecurityEventRow>(targetDb, sql, params);
  return rows.map(mapSecurityEventRow);
}

/**
 * Backward compatibility helper for fetching recent security events.
 */
export function getRecentSecurityEvents(limit: number = 50, db?: SqlJsDatabase): SecurityEvent[] {
  return getSecurityEvents({ limit }, db);
}
