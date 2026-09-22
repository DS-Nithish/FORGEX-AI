/**
 * TypeScript interfaces for AgentShield data models.
 * Used across repositories, agents, firewall, gateway, and tests.
 */

// ── Enum-like unions ──

import { RiskLevel } from "./riskLevels";
export { RiskLevel };
export type SourceType = "EMAIL" | "PDF" | "WEB" | "DATABASE" | "USER" | "SYSTEM";
export type TrustLevel = "TRUSTED" | "UNTRUSTED";
export type Decision = "ALLOW" | "CONFIRM" | "BLOCK" | "PENDING";
export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED";
export type ToolRequestStatus = "pending" | "approved" | "denied" | "allowed" | "blocked";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ── Model interfaces (returned by repositories) ──

export interface Tool {
  id: string;
  name: string;
  risk_level: RiskLevel;
  description: string;
  enabled: boolean | number;
  created_at: string;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  trust_level: TrustLevel;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ToolRequest {
  id: string;
  agent_id: string | null;
  tool_id: string;
  arguments: Record<string, unknown>;
  tainted: boolean;
  risk_level: RiskLevel;
  decision: Decision;
  reason: string | null;
  status: ToolRequestStatus;
  created_at: string;
}

export interface ProvenanceLink {
  id: string;
  request_id: string;
  source_id: string;
  relationship: string;
  created_at: string;
}

export interface Approval {
  id: string;
  request_id: string;
  status: ApprovalStatus;
  approved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type SecurityEventType = "ALLOW" | "CONFIRM" | "BLOCK" | "APPROVED" | "DENIED";

export interface SecurityEvent {
  id: string;
  requestId: string;
  eventType: SecurityEventType | string;
  toolName: string;
  args: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  provenance: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  taint: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  risk: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  matchedRule: string;
  reasoning: string;
  userAuthorized: boolean;
  timestamp: string;

  // Legacy / DB compatibility fields
  request_id?: string | null;
  event_type?: string;
  severity?: Severity;
  reason?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  tool_name?: string;
  arguments?: Record<string, any>;
  tainted?: boolean;
  risk_level?: string;
  matched_rule?: string;
}

// ── Raw SQLite row representations (internal to repository layer) ──

export interface RawToolRow {
  id: string;
  name: string;
  risk_level: RiskLevel;
  description: string;
  enabled: number;
  created_at: string;
}

export interface RawSourceRow {
  id: string;
  type: SourceType;
  name: string;
  trust_level: TrustLevel;
  metadata: string | null;
  created_at: string;
}

export interface RawToolRequestRow {
  id: string;
  agent_id: string | null;
  tool_id: string;
  arguments: string;
  tainted: number;
  risk_level: RiskLevel;
  decision: Decision;
  reason: string | null;
  status?: string;
  created_at: string;
}

export interface RawProvenanceLinkRow {
  id: string;
  request_id: string;
  source_id: string;
  relationship: string;
  created_at: string;
}

export interface RawApprovalRow {
  id: string;
  request_id: string;
  status: ApprovalStatus;
  approved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface RawSecurityEventRow {
  id: string;
  request_id: string | null;
  event_type: string;
  tool_name?: string | null;
  args?: string | null;
  provenance?: string | null;
  taint?: string | null;
  risk?: string | null;
  matched_rule?: string | null;
  reasoning?: string | null;
  user_authorized?: number | null;
  severity?: Severity | null;
  reason?: string | null;
  metadata?: string | null;
  timestamp?: string | null;
  created_at: string;
}

