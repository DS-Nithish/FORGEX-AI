import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createTool } from "./toolsRepository";
import { createToolRequest } from "./toolRequestsRepository";
import { createSecurityEvent, getRecentSecurityEvents } from "./securityEventsRepository";

describe("securityEventsRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
    createTool(
      {
        id: "execute_command",
        name: "Execute Command",
        risk_level: "CRITICAL",
        description: "Executes shell commands",
        enabled: true,
      },
      db,
    );
  });

  it("creates a security event and verifies all fields match", () => {
    const meta = { command: "rm -rf /", clientIp: "192.168.1.100" };
    const event = createSecurityEvent(
      {
        event_type: "UNAUTHORIZED_COMMAND_BLOCKED",
        severity: "CRITICAL",
        reason: "Detected dangerous destructive command execution attempt",
        metadata: meta,
      },
      db,
    );

    expect(event.id).toBeDefined();
    expect(event.id.startsWith("evt_")).toBe(true);
    expect(event.event_type).toBe("UNAUTHORIZED_COMMAND_BLOCKED");
    expect(event.severity).toBe("CRITICAL");
    expect(event.reason).toBe("Detected dangerous destructive command execution attempt");
    expect(event.metadata).toEqual(meta);
    expect(event.created_at).toBeDefined();
    expect(event.request_id).toBeNull();
  });

  it("links security event to a tool request", () => {
    const req = createToolRequest(
      {
        tool_id: "execute_command",
        arguments: { cmd: "ls -la" },
        tainted: false,
        risk_level: "CRITICAL",
      },
      db,
    );

    const event = createSecurityEvent(
      {
        request_id: req.id,
        event_type: "REQUEST_CONFIRMED",
        severity: "INFO",
        reason: "User confirmed high risk command execution",
      },
      db,
    );

    expect(event.request_id).toBe(req.id);
  });

  it("round-trips JSON metadata correctly (object in → object out, not string)", () => {
    const complexMeta = {
      tainted_sources: ["src_001", "src_002"],
      heuristic_score: 0.98,
      details: { detected_pattern: "ignore previous instructions" },
    };

    createSecurityEvent(
      {
        event_type: "INJECTION_ATTEMPT_DETECTED",
        severity: "HIGH",
        reason: "Indirect prompt injection signature recognized",
        metadata: complexMeta,
      },
      db,
    );

    const events = getRecentSecurityEvents(1, db);
    expect(events).toHaveLength(1);
    expect(events[0].metadata).not.toBeNull();
    expect(typeof events[0].metadata).toBe("object");
    expect(events[0].metadata).toEqual(complexMeta);
  });

  it("returns recent events ordered by created_at DESC and respects limit", () => {
    for (let i = 1; i <= 5; i++) {
      createSecurityEvent(
        {
          event_type: `EVENT_${i}`,
          severity: "INFO",
          reason: `Event number ${i}`,
        },
        db,
      );
    }

    const recents = getRecentSecurityEvents(3, db);
    expect(recents).toHaveLength(3);
    expect(recents[0].event_type).toBe("EVENT_5");
    expect(recents[1].event_type).toBe("EVENT_4");
    expect(recents[2].event_type).toBe("EVENT_3");
  });
});
