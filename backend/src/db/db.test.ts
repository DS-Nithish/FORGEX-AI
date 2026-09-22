import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { initDatabase } from "./init";
import { seedTools, MVP_TOOLS } from "./seed";

describe("Database Schema & Seed", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    // Initialize a fresh in-memory database for each test
    db = await initDatabase(":memory:");
  });

  it("creates all 6 tables on initialization", () => {
    const res = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
    );
    const tableNames = res[0]?.values.map((row) => row[0]) ?? [];

    const expectedTables = [
      "approvals",
      "provenance_links",
      "security_events",
      "sources",
      "tool_requests",
      "tools",
    ];

    expect(tableNames.sort()).toEqual(expectedTables.sort());
  });

  it("seeds exactly 10 MVP tools and running it twice is idempotent", async () => {
    const firstRun = await seedTools(db);
    expect(firstRun.seeded).toBe(10);
    expect(firstRun.total).toBe(10);

    const countRes1 = db.exec("SELECT COUNT(*) FROM tools;");
    expect(countRes1[0].values[0][0]).toBe(10);

    // Running second time should not duplicate rows
    const secondRun = await seedTools(db);
    expect(secondRun.seeded).toBe(0);
    expect(secondRun.total).toBe(10);

    const countRes2 = db.exec("SELECT COUNT(*) FROM tools;");
    expect(countRes2[0].values[0][0]).toBe(10);

    // Verify MVP tools exist with correct risk levels
    const toolsRes = db.exec("SELECT id, risk_level FROM tools ORDER BY id;");
    const dbToolsMap = new Map(
      toolsRes[0].values.map((row) => [row[0] as string, row[1] as string]),
    );

    for (const tool of MVP_TOOLS) {
      expect(dbToolsMap.get(tool.id)).toBe(tool.risk_level);
    }
  });

  it("supports insert and select for tool_requests", async () => {
    await seedTools(db);

    const insertStmt = db.prepare(
      "INSERT INTO tool_requests (id, agent_id, tool_id, arguments, tainted, risk_level, decision, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
    );
    insertStmt.run([
      "req_test_01",
      "default-agent",
      "search_web",
      JSON.stringify({ query: "artificial intelligence" }),
      0,
      "LOW",
      "ALLOW",
      "Safe read-only search",
    ]);
    insertStmt.free();

    const selectRes = db.exec("SELECT * FROM tool_requests WHERE id = 'req_test_01';");
    expect(selectRes).toHaveLength(1);

    const columns = selectRes[0].columns;
    const row = selectRes[0].values[0];

    const getVal = (col: string) => row[columns.indexOf(col)];

    expect(getVal("id")).toBe("req_test_01");
    expect(getVal("agent_id")).toBe("default-agent");
    expect(getVal("tool_id")).toBe("search_web");
    expect(getVal("tainted")).toBe(0);
    expect(getVal("risk_level")).toBe("LOW");
    expect(getVal("decision")).toBe("ALLOW");
    expect(getVal("reason")).toBe("Safe read-only search");
    expect(JSON.parse(getVal("arguments") as string)).toEqual({ query: "artificial intelligence" });
  });

  it("supports insert and select for security_events", async () => {
    await seedTools(db);

    // First insert a tool_request
    db.run(
      "INSERT INTO tool_requests (id, tool_id, arguments, risk_level, decision) VALUES ('req_sec_01', 'delete_file', '{}', 'CRITICAL', 'BLOCK');",
    );

    // Insert security_event linked to tool_request
    const secStmt = db.prepare(
      "INSERT INTO security_events (id, request_id, event_type, severity, reason, metadata) VALUES (?, ?, ?, ?, ?, ?);",
    );
    secStmt.run([
      "evt_001",
      "req_sec_01",
      "REQUEST_BLOCKED",
      "CRITICAL",
      "Critical tool call attempted without required approval",
      JSON.stringify({ path: "/etc/passwd" }),
    ]);
    secStmt.free();

    const selectRes = db.exec("SELECT * FROM security_events WHERE id = 'evt_001';");
    expect(selectRes).toHaveLength(1);

    const columns = selectRes[0].columns;
    const row = selectRes[0].values[0];
    const getVal = (col: string) => row[columns.indexOf(col)];

    expect(getVal("id")).toBe("evt_001");
    expect(getVal("request_id")).toBe("req_sec_01");
    expect(getVal("event_type")).toBe("REQUEST_BLOCKED");
    expect(getVal("severity")).toBe("CRITICAL");
    expect(getVal("reason")).toBe("Critical tool call attempted without required approval");
    expect(JSON.parse(getVal("metadata") as string)).toEqual({ path: "/etc/passwd" });
  });

  it("enforces schema CHECK constraints on enums", () => {
    // Attempting invalid risk level should fail check constraint
    expect(() => {
      db.run(
        "INSERT INTO tools (id, name, risk_level) VALUES ('invalid_tool', 'Invalid', 'ULTRA_HIGH');",
      );
    }).toThrow();

    // Attempting invalid decision should fail check constraint
    expect(() => {
      db.run(
        "INSERT INTO tool_requests (id, tool_id, risk_level, decision) VALUES ('req_bad', 'search_web', 'LOW', 'MAYBE');",
      );
    }).toThrow();
  });
});
