import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../index";
import { initDatabase } from "../db";
import { seedTools } from "../db/seed";

describe("Gateway & Content API Routes", () => {
  beforeEach(async () => {
    await initDatabase(":memory:");
    await seedTools();
  });

  describe("POST /api/tool/execute", () => {
    it("returns 200 and success: true for a valid tool and arguments", async () => {
      const res = await request(app)
        .post("/api/tool/execute")
        .send({
          toolId: "search_web",
          arguments: { query: "cybersecurity best practices" },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.output).toHaveProperty("results");
    });

    it("returns 404 for an unknown toolId", async () => {
      const res = await request(app).post("/api/tool/execute").send({
        toolId: "unknown_hack_tool",
        arguments: {},
      });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("unknown_hack_tool");
      expect(res.body.toolId).toBe("unknown_hack_tool");
    });

    it("returns 400 for a malformed request body failing zod validation", async () => {
      // Missing toolId
      const res1 = await request(app)
        .post("/api/tool/execute")
        .send({ arguments: { query: "test" } });

      expect(res1.status).toBe(400);
      expect(res1.body).toHaveProperty("error", "Validation error");

      // Empty toolId
      const res2 = await request(app).post("/api/tool/execute").send({ toolId: "", arguments: {} });

      expect(res2.status).toBe(400);
      expect(res2.body).toHaveProperty("error", "Validation error");
    });
  });

  describe("GET /api/content/documents", () => {
    it("returns all documents and strictly excludes isMalicious from response", async () => {
      const res = await request(app).get("/api/content/documents");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);

      for (const doc of res.body) {
        expect(doc).toHaveProperty("id");
        expect(doc).toHaveProperty("type");
        expect(doc).toHaveProperty("name");
        expect(doc).toHaveProperty("content");
        // Ground truth flag MUST NOT be leaked
        expect(doc).not.toHaveProperty("isMalicious");
      }
    });
  });

  describe("GET /api/content/documents/:id", () => {
    it("returns the correct document and excludes isMalicious", async () => {
      const res = await request(app).get("/api/content/documents/doc_pdf_clean_001");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("doc_pdf_clean_001");
      expect(res.body.type).toBe("PDF");
      expect(res.body.content).toBeDefined();
      expect(res.body).not.toHaveProperty("isMalicious");
    });

    it("returns 404 for an unknown document ID", async () => {
      const res = await request(app).get("/api/content/documents/doc_nonexistent_999");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("doc_nonexistent_999");
    });
  });
});
