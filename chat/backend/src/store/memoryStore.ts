export type Decision = "ALLOW" | "CONFIRM" | "BLOCK";
export type TrustLevel = "TRUSTED" | "UNTRUSTED";
export type RiskLevel = "LOW" | "HIGH";
export type ToolRequestStatus = "pending" | "resolved" | "blocked" | "denied";

export interface ToolRequestRecord {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  source_type: "USER" | "PDF";
  trust_level: TrustLevel;
  tainted: boolean;
  risk_level: RiskLevel;
  decision: Decision;
  reason: string;
  status: ToolRequestStatus;
  execution_result: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  tool_request_id?: string | null;
  tool_request?: ToolRequestRecord | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  allowed: number;
  confirmed: number;
  blocked: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  tool: string;
  decision: Decision;
  source: "USER" | "PDF";
  risk: RiskLevel;
  tainted: boolean;
  reason: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: string;
  buffer: Buffer;
  extractedText?: string;
  created_at: string;
}

// Module-level in-memory state
let toolRequests: ToolRequestRecord[] = [];
let chatMessages: ChatMessage[] = [];
const uploadedDocuments = new Map<string, UploadedDocument>();

export function saveUploadedDocument(doc: UploadedDocument): UploadedDocument {
  uploadedDocuments.set(doc.id, doc);
  return doc;
}

export function getUploadedDocument(id: string): UploadedDocument | undefined {
  return uploadedDocuments.get(id);
}

export function getAllUploadedDocuments(): UploadedDocument[] {
  return Array.from(uploadedDocuments.values());
}

export function addToolRequest(record: ToolRequestRecord): ToolRequestRecord {
  toolRequests.push(record);
  return record;
}

export function getRecentToolRequests(limit = 20): ToolRequestRecord[] {
  return [...toolRequests].reverse().slice(0, limit);
}

export function getToolRequestById(id: string): ToolRequestRecord | undefined {
  return toolRequests.find((req) => req.id === id);
}

export function updateToolRequest(
  id: string,
  updates: Partial<ToolRequestRecord>,
): ToolRequestRecord | undefined {
  const req = toolRequests.find((r) => r.id === id);
  if (!req) return undefined;
  Object.assign(req, updates);
  return req;
}

export function addChatMessage(message: ChatMessage): ChatMessage {
  chatMessages.push(message);
  return message;
}

export function getChatMessages(): ChatMessage[] {
  return [...chatMessages];
}

export function getStats(): DashboardStats {
  const total = toolRequests.length;
  const allowed = toolRequests.filter((r) => r.decision === "ALLOW").length;
  const confirmed = toolRequests.filter((r) => r.decision === "CONFIRM").length;
  const blocked = toolRequests.filter((r) => r.decision === "BLOCK").length;
  return { total, allowed, confirmed, blocked };
}

export function getSecurityEvents(limit = 20): SecurityEvent[] {
  return [...toolRequests].reverse().slice(0, limit).map((req) => ({
    id: req.id,
    timestamp: req.created_at,
    tool: req.tool_name,
    decision: req.decision,
    source: req.source_type,
    risk: req.risk_level,
    tainted: req.tainted,
    reason: req.reason,
  }));
}

export function resetStore(): void {
  toolRequests = [];
  chatMessages = [];
  uploadedDocuments.clear();
}
