import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createTool } from "./toolsRepository";
import {
  createToolRequest,
  getToolRequestById,
  updateToolRequestDecision,
  getRecentToolRequests,
} from "./toolRequestsRepository";

describe("toolRequestsRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
    // Seed foreign key tool
    createTool(
      {
        id: "delete_file",
        name: "Delete File",
        risk_level: "CRITICAL",
        description: "Delete filesystem files",
        enabled: true,
      },
      db,
    );
  });

  it("creates a tool request and immediately fetches it by id with matching data", () => {
    const args = { filepath: "/var/log/app.log", force: true };
    const created = createToolRequest(
      {
        agent_id: "agent_42",
        tool_id: "delete_file",
        arguments: args,
        tainted: true,
        risk_level: "CRITICAL",
      },
      db,
    );

    expect(created.id).toBeDefined();
    expect(created.id.startsWith("req_")).toBe(true);
    expect(created.agent_id).toBe("agent_42");
    expect(created.tool_id).toBe("delete_file");
    expect(created.decision).toBe("PENDING");
    expect(created.tainted).toBe(true);
    expect(created.arguments).toEqual(args);

    const fetched = getToolRequestById(created.id, db);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.agent_id).toBe("agent_42");
    expect(fetched?.tool_id).toBe("delete_file");
    expect(fetched?.decision).toBe("PENDING");
    expect(fetched?.reason).toBeNull();
    expect(fetched?.tainted).toBe(true);
  });

  it("round-trips JSON arguments correctly (object in → object out, not string)", () => {
    const complexArgs = {
      action: "batch_process",
      payload: { ids: [1, 2, 3], nested: { enabled: true } },
    };

    const created = createToolRequest(
      {
        tool_id: "delete_file",
        arguments: complexArgs,
        tainted: false,
        risk_level: "CRITICAL",
      },
      db,
    );

    const fetched = getToolRequestById(created.id, db);
    expect(fetched?.arguments).not.toBeNull();
    expect(typeof fetched?.arguments).toBe("object");
    expect(fetched?.arguments).toEqual(complexArgs);
  });

  it("updates tool request decision and reason correctly", () => {
    const created = createToolRequest(
      {
        tool_id: "delete_file",
        arguments: { file: "test.txt" },
        tainted: false,
        risk_level: "CRITICAL",
      },
      db,
    );

    expect(created.decision).toBe("PENDING");

    updateToolRequestDecision(
      created.id,
      "BLOCK",
      "Action blocked: deletion of system files is prohibited",
      db,
    );

    const updated = getToolRequestById(created.id, db);
    expect(updated?.decision).toBe("BLOCK");
    expect(updated?.reason).toBe("Action blocked: deletion of system files is prohibited");
  });

  it("returns recent tool requests ordered by created_at DESC and respects limit", () => {
    for (let i = 1; i <= 5; i++) {
      createToolRequest(
        {
          agent_id: `agent_${i}`,
          tool_id: "delete_file",
          arguments: { index: i },
          tainted: false,
          risk_level: "CRITICAL",
        },
        db,
      );
    }

    const recents = getRecentToolRequests(3, db);
    expect(recents).toHaveLength(3);
    // Most recent should be agent_5
    expect(recents[0].agent_id).toBe("agent_5");
    expect(recents[1].agent_id).toBe("agent_4");
    expect(recents[2].agent_id).toBe("agent_3");
  });
});
