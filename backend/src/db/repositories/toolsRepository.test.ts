import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createTool, getAllTools, getToolById, getEnabledTools } from "./toolsRepository";

describe("toolsRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  it("creates a tool and immediately fetches it by id with matching data", () => {
    const created = createTool(
      {
        id: "web_search",
        name: "Web Search",
        risk_level: "LOW",
        description: "Search external web sources",
        enabled: true,
      },
      db,
    );

    expect(created.id).toBe("web_search");
    expect(created.name).toBe("Web Search");
    expect(created.risk_level).toBe("LOW");
    expect(created.created_at).toBeDefined();

    const fetched = getToolById("web_search", db);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe("web_search");
    expect(fetched?.name).toBe("Web Search");
    expect(fetched?.risk_level).toBe("LOW");
    expect(fetched?.description).toBe("Search external web sources");
    expect(fetched?.enabled).toBe(true);
  });

  it("returns null when fetching a non-existent tool id", () => {
    const fetched = getToolById("non_existent_tool", db);
    expect(fetched).toBeNull();
  });

  it("returns all tools and filters enabled tools correctly", () => {
    createTool(
      {
        id: "tool_enabled",
        name: "Tool Enabled",
        risk_level: "LOW",
        description: "Enabled tool",
        enabled: true,
      },
      db,
    );

    createTool(
      {
        id: "tool_disabled",
        name: "Tool Disabled",
        risk_level: "HIGH",
        description: "Disabled tool",
        enabled: false,
      },
      db,
    );

    const all = getAllTools(db);
    expect(all).toHaveLength(2);

    const enabled = getEnabledTools(db);
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("tool_enabled");
  });

  it("is idempotent when creating the same tool twice", () => {
    createTool(
      {
        id: "idempotent_tool",
        name: "Idempotent Tool",
        risk_level: "MEDIUM",
        description: "Testing idempotency",
        enabled: true,
      },
      db,
    );

    const second = createTool(
      {
        id: "idempotent_tool",
        name: "Idempotent Tool Modified",
        risk_level: "MEDIUM",
        description: "Should return existing",
        enabled: true,
      },
      db,
    );

    expect(second.id).toBe("idempotent_tool");
    expect(second.name).toBe("Idempotent Tool");

    const all = getAllTools(db);
    expect(all.filter((t) => t.id === "idempotent_tool")).toHaveLength(1);
  });
});
