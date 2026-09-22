import { describe, it, expect, beforeEach } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import { ZodError } from "zod";
import { createTestDatabase } from "../db/testUtils";
import { seedTools, MVP_TOOLS } from "../db/seed";
import {
  getTool,
  isToolEnabled,
  getToolRiskLevel,
  listAllTools,
  listEnabledTools,
  registerTool,
} from "./toolRegistry";
import { ToolNotFoundError } from "../shared/errors";
import { riskLevelRank } from "../shared/riskLevels";

describe("toolRegistry (Risk Engine)", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  describe("getTool()", () => {
    it("returns the correct tool for a valid id", async () => {
      await seedTools(db);
      const tool = getTool("search_web", db);

      expect(tool).toBeDefined();
      expect(tool.id).toBe("search_web");
      expect(tool.name).toBe("Search Web");
      expect(tool.risk_level).toBe("LOW");
      expect(tool.enabled).toBe(true);
    });

    it("throws ToolNotFoundError for an unknown id", () => {
      expect(() => getTool("unknown_tool", db)).toThrow(ToolNotFoundError);

      try {
        getTool("unknown_tool", db);
      } catch (err) {
        expect(err).toBeInstanceOf(ToolNotFoundError);
        const notFound = err as ToolNotFoundError;
        expect(notFound.toolId).toBe("unknown_tool");
        expect(notFound.message).toContain("unknown_tool");
      }
    });
  });

  describe("isToolEnabled()", () => {
    it("returns true for an enabled tool", () => {
      registerTool(
        {
          id: "active_tool",
          name: "Active Tool",
          risk_level: "LOW",
          enabled: true,
        },
        db,
      );

      expect(isToolEnabled("active_tool", db)).toBe(true);
    });

    it("returns false for a disabled tool", () => {
      registerTool(
        {
          id: "inactive_tool",
          name: "Inactive Tool",
          risk_level: "HIGH",
          enabled: false,
        },
        db,
      );

      expect(isToolEnabled("inactive_tool", db)).toBe(false);
    });

    it("returns false (without throwing) for an unknown tool", () => {
      expect(isToolEnabled("nonexistent_tool", db)).toBe(false);
    });
  });

  describe("getToolRiskLevel()", () => {
    it("returns the correct risk level for all 10 seeded tools", async () => {
      await seedTools(db);

      for (const expected of MVP_TOOLS) {
        const riskLevel = getToolRiskLevel(expected.id, db);
        expect(riskLevel).toBe(expected.risk_level);
      }
    });

    it("throws ToolNotFoundError when assessing risk of an unknown tool", () => {
      expect(() => getToolRiskLevel("unregistered_tool", db)).toThrow(ToolNotFoundError);
    });
  });

  describe("riskLevelRank()", () => {
    it("correctly orders LOW < MEDIUM < HIGH < CRITICAL", () => {
      expect(riskLevelRank("LOW")).toBe(0);
      expect(riskLevelRank("MEDIUM")).toBe(1);
      expect(riskLevelRank("HIGH")).toBe(2);
      expect(riskLevelRank("CRITICAL")).toBe(3);

      expect(riskLevelRank("LOW")).toBeLessThan(riskLevelRank("MEDIUM"));
      expect(riskLevelRank("MEDIUM")).toBeLessThan(riskLevelRank("HIGH"));
      expect(riskLevelRank("HIGH")).toBeLessThan(riskLevelRank("CRITICAL"));

      // Comparisons commonly used in Policy Engine
      expect(riskLevelRank("HIGH") >= riskLevelRank("HIGH")).toBe(true);
      expect(riskLevelRank("CRITICAL") >= riskLevelRank("HIGH")).toBe(true);
      expect(riskLevelRank("LOW") >= riskLevelRank("HIGH")).toBe(false);
    });
  });

  describe("registerTool()", () => {
    it("successfully adds a new tool that is immediately retrievable via getTool()", () => {
      const tool = registerTool(
        {
          id: "custom_analyzer",
          name: "Custom Code Analyzer",
          risk_level: "MEDIUM",
          description: "Analyzes AST of target code",
          enabled: true,
        },
        db,
      );

      expect(tool.id).toBe("custom_analyzer");
      expect(tool.name).toBe("Custom Code Analyzer");
      expect(tool.risk_level).toBe("MEDIUM");

      const fetched = getTool("custom_analyzer", db);
      expect(fetched).toEqual(tool);
    });

    it("rejects an invalid risk_level via Zod validation", () => {
      expect(() =>
        registerTool(
          {
            id: "bad_tool",
            name: "Bad Tool",
            // @ts-expect-error testing invalid runtime value
            risk_level: "SUPER_HIGH",
            description: "Invalid risk level",
          },
          db,
        ),
      ).toThrow(ZodError);
    });

    it("rejects missing required fields via Zod validation", () => {
      expect(() =>
        registerTool(
          {
            id: "",
            name: "Empty ID Tool",
            risk_level: "LOW",
          },
          db,
        ),
      ).toThrow(ZodError);
    });
  });

  describe("listAllTools() and listEnabledTools()", () => {
    it("lists all tools and filters enabled tools", () => {
      registerTool({ id: "t1", name: "T1", risk_level: "LOW", enabled: true }, db);
      registerTool({ id: "t2", name: "T2", risk_level: "HIGH", enabled: false }, db);

      const all = listAllTools(db);
      expect(all).toHaveLength(2);

      const enabled = listEnabledTools(db);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe("t1");
    });
  });
});
