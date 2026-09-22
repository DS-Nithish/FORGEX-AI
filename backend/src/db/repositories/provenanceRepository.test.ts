import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createTool } from "./toolsRepository";
import { createSource } from "./sourcesRepository";
import { createToolRequest } from "./toolRequestsRepository";
import { linkProvenance, getProvenanceForRequest } from "./provenanceRepository";

describe("provenanceRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
    // Pre-populate tool, request, and sources
    createTool(
      {
        id: "send_email",
        name: "Send Email",
        risk_level: "HIGH",
        description: "Sends an email",
        enabled: true,
      },
      db,
    );
  });

  it("links provenance and retrieves it joined with complete source details", () => {
    const source1 = createSource(
      {
        id: "src_untrusted_mail",
        type: "EMAIL",
        name: "phishing.eml",
        trust_level: "UNTRUSTED",
        metadata: { attacker: "malicious@evil.com" },
      },
      db,
    );

    const source2 = createSource(
      {
        id: "src_user_prompt",
        type: "USER",
        name: "user_chat",
        trust_level: "TRUSTED",
        metadata: { user_id: "usr_123" },
      },
      db,
    );

    const req = createToolRequest(
      {
        tool_id: "send_email",
        arguments: { to: "victim@target.com", body: "Hello" },
        tainted: true,
        risk_level: "HIGH",
      },
      db,
    );

    const link1 = linkProvenance(req.id, source1.id, "tainted_by_content", db);
    const link2 = linkProvenance(req.id, source2.id, "commanded_by_user", db);

    expect(link1.id).toBeDefined();
    expect(link1.request_id).toBe(req.id);
    expect(link1.source_id).toBe(source1.id);

    const joinedList = getProvenanceForRequest(req.id, db);
    expect(joinedList).toHaveLength(2);

    // Verify first link joined source
    expect(joinedList[0].id).toBe(link1.id);
    expect(joinedList[0].relationship).toBe("tainted_by_content");
    expect(joinedList[0].source).toBeDefined();
    expect(joinedList[0].source.id).toBe("src_untrusted_mail");
    expect(joinedList[0].source.type).toBe("EMAIL");
    expect(joinedList[0].source.trust_level).toBe("UNTRUSTED");
    expect(joinedList[0].source.metadata).toEqual({ attacker: "malicious@evil.com" });

    // Verify second link joined source
    expect(joinedList[1].id).toBe(link2.id);
    expect(joinedList[1].relationship).toBe("commanded_by_user");
    expect(joinedList[1].source.id).toBe("src_user_prompt");
    expect(joinedList[1].source.type).toBe("USER");
    expect(joinedList[1].source.trust_level).toBe("TRUSTED");
    expect(joinedList[1].source.metadata).toEqual({ user_id: "usr_123" });
  });

  it("returns an empty array when no provenance exists for request", () => {
    const empty = getProvenanceForRequest("req_nonexistent", db);
    expect(empty).toEqual([]);
  });
});
