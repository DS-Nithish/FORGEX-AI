import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase } from "../db";
import { registerSource, registerUserSource } from "../services";

describe("Provenance API Routes (/api/provenance)", () => {
  beforeEach(async () => {
    await initDatabase(":memory:");
  });

  describe("GET /api/provenance/sources", () => {
    it("returns an empty array when no sources are registered", async () => {
      const res = await request(app).get("/api/provenance/sources");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("returns all registered sources ordered by creation date descending", async () => {
      const s1 = registerUserSource({ step: 1 });
      const s2 = registerSource({ type: "PDF", name: "report.pdf" });

      const res = await request(app).get("/api/provenance/sources");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const ids = res.body.map((s: { id: string }) => s.id);
      expect(ids).toContain(s1.id);
      expect(ids).toContain(s2.id);
    });
  });

  describe("GET /api/provenance/sources/:id", () => {
    it("returns a specific source when given a valid ID", async () => {
      const source = registerSource({
        type: "WEB",
        name: "https://trusted-partner.org/api",
        metadata: { domain: "trusted-partner.org" },
      });

      const res = await request(app).get(`/api/provenance/sources/${source.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(source.id);
      expect(res.body.type).toBe("WEB");
      expect(res.body.trust_level).toBe("UNTRUSTED");
      expect(res.body.name).toBe("https://trusted-partner.org/api");
      expect(res.body.metadata).toEqual({ domain: "trusted-partner.org" });
    });

    it("returns 404 when requested source ID does not exist", async () => {
      const res = await request(app).get("/api/provenance/sources/non_existent_id");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("non_existent_id");
    });
  });
});
