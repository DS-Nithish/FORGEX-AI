import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { createTestDatabase } from "../testUtils";
import { createSource, getSourceById, getAllSources } from "./sourcesRepository";

describe("sourcesRepository", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  it("creates a source with custom ID and fetches it by id", () => {
    const source = createSource(
      {
        id: "src_custom_001",
        type: "EMAIL",
        name: "invoice.eml",
        trust_level: "UNTRUSTED",
        metadata: { sender: "supplier@example.com", subject: "Urgent Payment" },
      },
      db,
    );

    expect(source.id).toBe("src_custom_001");
    expect(source.type).toBe("EMAIL");
    expect(source.name).toBe("invoice.eml");
    expect(source.trust_level).toBe("UNTRUSTED");
    expect(source.created_at).toBeDefined();

    const fetched = getSourceById("src_custom_001", db);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe("src_custom_001");
    expect(fetched?.name).toBe("invoice.eml");
    expect(fetched?.trust_level).toBe("UNTRUSTED");
  });

  it("generates a UUID id if none is provided", () => {
    const source = createSource(
      {
        type: "PDF",
        name: "confidential_brief.pdf",
        trust_level: "TRUSTED",
        metadata: null,
      },
      db,
    );

    expect(source.id).toBeDefined();
    expect(source.id.startsWith("src_")).toBe(true);

    const fetched = getSourceById(source.id, db);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("confidential_brief.pdf");
  });

  it("round-trips JSON metadata correctly (object in → object out, not string)", () => {
    const complexMeta = {
      nested: { key: "value", score: 42 },
      tags: ["urgent", "external"],
      active: true,
    };

    const source = createSource(
      {
        type: "WEB",
        name: "https://example.com/api/data",
        trust_level: "UNTRUSTED",
        metadata: complexMeta,
      },
      db,
    );

    const fetched = getSourceById(source.id, db);
    expect(fetched?.metadata).not.toBeNull();
    expect(typeof fetched?.metadata).toBe("object");
    expect(fetched?.metadata).toEqual(complexMeta);
  });

  it("handles null metadata gracefully", () => {
    const source = createSource(
      {
        type: "USER",
        name: "direct_prompt",
        trust_level: "TRUSTED",
        metadata: null,
      },
      db,
    );

    const fetched = getSourceById(source.id, db);
    expect(fetched?.metadata).toBeNull();
  });

  it("returns all sources ordered by created_at DESC", () => {
    createSource({ type: "EMAIL", name: "email1", trust_level: "UNTRUSTED", metadata: null }, db);
    createSource({ type: "PDF", name: "pdf1", trust_level: "TRUSTED", metadata: null }, db);

    const all = getAllSources(db);
    expect(all).toHaveLength(2);
  });
});
