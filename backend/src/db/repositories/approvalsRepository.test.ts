import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createTool } from "./toolsRepository";
import { createToolRequest } from "./toolRequestsRepository";
import {
  createApproval,
  getApprovalById,
  getPendingApprovals,
  resolveApproval,
} from "./approvalsRepository";

describe("approvalsRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
    createTool(
      {
        id: "delete_database",
        name: "Delete Database",
        risk_level: "CRITICAL",
        description: "Drop databases",
        enabled: true,
      },
      db,
    );
  });

  it("creates an approval with PENDING status and fetches it by id", () => {
    const req = createToolRequest(
      {
        tool_id: "delete_database",
        arguments: { db: "users_prod" },
        tainted: true,
        risk_level: "CRITICAL",
      },
      db,
    );

    const approval = createApproval(req.id, db);

    expect(approval.id).toBeDefined();
    expect(approval.id.startsWith("appr_")).toBe(true);
    expect(approval.request_id).toBe(req.id);
    expect(approval.status).toBe("PENDING");
    expect(approval.approved_by).toBeNull();
    expect(approval.resolved_at).toBeNull();
    expect(approval.created_at).toBeDefined();

    const fetched = getApprovalById(approval.id, db);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(approval.id);
    expect(fetched?.status).toBe("PENDING");
  });

  it("lists pending approvals and filters out resolved ones", () => {
    const req1 = createToolRequest(
      { tool_id: "delete_database", arguments: { id: 1 }, tainted: false, risk_level: "CRITICAL" },
      db,
    );
    const req2 = createToolRequest(
      { tool_id: "delete_database", arguments: { id: 2 }, tainted: false, risk_level: "CRITICAL" },
      db,
    );

    const app1 = createApproval(req1.id, db);
    const app2 = createApproval(req2.id, db);

    let pending = getPendingApprovals(db);
    expect(pending).toHaveLength(2);

    resolveApproval(app1.id, "APPROVED", "admin_alice", db);

    pending = getPendingApprovals(db);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(app2.id);
  });

  it("correctly resolves an approval with status, approved_by, and resolved_at timestamp", () => {
    const req = createToolRequest(
      { tool_id: "delete_database", arguments: {}, tainted: false, risk_level: "CRITICAL" },
      db,
    );

    const approval = createApproval(req.id, db);

    resolveApproval(approval.id, "DENIED", "security_officer_bob", db);

    const resolved = getApprovalById(approval.id, db);
    expect(resolved?.status).toBe("DENIED");
    expect(resolved?.approved_by).toBe("security_officer_bob");
    expect(resolved?.resolved_at).toBeDefined();
    expect(new Date(resolved!.resolved_at!).getTime()).toBeGreaterThan(0);
  });
});
