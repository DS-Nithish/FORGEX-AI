import { describe, it, expect, beforeEach } from "vitest";
import { initDatabase } from "../db/init";
import { defaultTrustLevelForSourceType } from "../shared/trustLevels";
import {
  registerSource,
  registerUserSource,
  getSourceTrustLevel,
  linkSourceToRequest,
  getProvenanceForRequest,
  SourceNotFoundError,
} from "./provenanceEngine";
import { SourceType } from "../shared/types";
import { createToolRequest } from "../db/repositories/toolRequestsRepository";
import { seedTools } from "../db/seed";

describe("Provenance Engine & Trust Model (PRD Section 18)", () => {
  beforeEach(async () => {
    await initDatabase(":memory:");
    await seedTools();
  });

  describe("defaultTrustLevelForSourceType", () => {
    it("returns TRUSTED for USER and SYSTEM", () => {
      expect(defaultTrustLevelForSourceType("USER")).toBe("TRUSTED");
      expect(defaultTrustLevelForSourceType("SYSTEM")).toBe("TRUSTED");
    });

    it("returns UNTRUSTED for EMAIL, PDF, WEB, and DATABASE", () => {
      expect(defaultTrustLevelForSourceType("EMAIL")).toBe("UNTRUSTED");
      expect(defaultTrustLevelForSourceType("PDF")).toBe("UNTRUSTED");
      expect(defaultTrustLevelForSourceType("WEB")).toBe("UNTRUSTED");
      expect(defaultTrustLevelForSourceType("DATABASE")).toBe("UNTRUSTED");
    });

    it("throws a clear error for an unrecognized source type", () => {
      expect(() =>
        defaultTrustLevelForSourceType("UNKNOWN_EXTERNAL" as unknown as SourceType),
      ).toThrow("Unknown or unsupported source type: UNKNOWN_EXTERNAL");
    });
  });

  describe("registerSource", () => {
    it("creates a source with the deterministically derived trust level", () => {
      const source = registerSource({
        type: "PDF",
        name: "test_document.pdf",
        metadata: { pages: 5 },
      });

      expect(source.id).toMatch(/^src_/);
      expect(source.type).toBe("PDF");
      expect(source.name).toBe("test_document.pdf");
      expect(source.trust_level).toBe("UNTRUSTED");
      expect(source.metadata).toEqual({ pages: 5 });
    });

    it("prevents caller from overriding trust_level (ignores extra trust_level parameter)", () => {
      // Malicious or accidental attempt to supply trust_level: 'TRUSTED' on an untrusted source type
      const maliciousPayload = {
        type: "EMAIL" as const,
        name: "phishing_email.eml",
        trust_level: "TRUSTED", // Attempted override
      };

      const source = registerSource(
        maliciousPayload as unknown as Parameters<typeof registerSource>[0],
      );

      // Verify that trust_level remained UNTRUSTED per PRD Section 18
      expect(source.trust_level).toBe("UNTRUSTED");
      expect(getSourceTrustLevel(source.id)).toBe("UNTRUSTED");
    });
  });

  describe("registerUserSource", () => {
    it("always produces a TRUSTED source representing the user's direct request", () => {
      const userSource = registerUserSource({ promptLength: 42 });

      expect(userSource.id).toMatch(/^src_/);
      expect(userSource.type).toBe("USER");
      expect(userSource.trust_level).toBe("TRUSTED");
      expect(userSource.name).toBe("User Request");
      expect(userSource.metadata).toEqual({ promptLength: 42 });
    });
  });

  describe("getSourceTrustLevel", () => {
    it("returns correct trust level for existing sources", () => {
      const trusted = registerUserSource();
      const untrusted = registerSource({ type: "WEB", name: "https://example.com" });

      expect(getSourceTrustLevel(trusted.id)).toBe("TRUSTED");
      expect(getSourceTrustLevel(untrusted.id)).toBe("UNTRUSTED");
    });

    it("throws SourceNotFoundError for an unknown source id", () => {
      expect(() => getSourceTrustLevel("non_existent_source_123")).toThrow(SourceNotFoundError);
      expect(() => getSourceTrustLevel("non_existent_source_123")).toThrow(
        "Source not found with id: non_existent_source_123",
      );
    });
  });

  describe("linkSourceToRequest and getProvenanceForRequest", () => {
    it("links a source to a tool request and retrieves joined provenance details", () => {
      const source = registerSource({ type: "PDF", name: "specs.pdf" });
      const request = createToolRequest({
        agent_id: "agent_001",
        tool_id: "read_pdf",
        arguments: { fileName: "specs.pdf" },
        tainted: false,
        risk_level: "LOW",
      });

      const link = linkSourceToRequest(request.id, source.id, "TRIGGERED_BY");
      expect(link.id).toMatch(/^prov_/);
      expect(link.request_id).toBe(request.id);
      expect(link.source_id).toBe(source.id);
      expect(link.relationship).toBe("TRIGGERED_BY");

      const provenanceList = getProvenanceForRequest(request.id);
      expect(provenanceList).toHaveLength(1);
      expect(provenanceList[0].relationship).toBe("TRIGGERED_BY");
      expect(provenanceList[0].source.id).toBe(source.id);
      expect(provenanceList[0].source.trust_level).toBe("UNTRUSTED");
    });
  });
});
