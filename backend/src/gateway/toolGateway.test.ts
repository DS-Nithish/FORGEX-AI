import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";
import { createTestDatabase } from "../db/testUtils";
import { seedTools } from "../db/seed";
import { registerTool } from "../services/toolRegistry";
import {
  executeTool,
  disableFirewallEnforcement,
  enableFirewallEnforcement,
} from "./toolGateway";
import { ToolNotFoundError, ToolDisabledError } from "../shared/errors";

describe("Tool Gateway", () => {
  let db: SqlJsDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
    await seedTools(db);
    disableFirewallEnforcement();
  });

  afterEach(() => {
    enableFirewallEnforcement();
  });

  describe("executeTool() with 10 MVP tools", () => {
    it("executes search_web successfully", async () => {
      const res = await executeTool("search_web", { query: "cybersecurity" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { query: string }).query).toBe("cybersecurity");
      expect((res.output as { results: unknown[] }).results).toHaveLength(1);
    });

    it("executes read_email successfully", async () => {
      const res = await executeTool("read_email", { emailId: "email_99" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { id: string }).id).toBe("email_99");
      expect((res.output as { from: string }).from).toBeDefined();
    });

    it("executes read_pdf successfully", async () => {
      const res = await executeTool("read_pdf", { fileName: "report.pdf" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { fileName: string }).fileName).toBe("report.pdf");
      expect((res.output as { text: string }).text).toContain("report.pdf");
    });

    it("executes query_database successfully", async () => {
      const res = await executeTool("query_database", { query: "SELECT * FROM users" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { rowCount: number }).rowCount).toBe(2);
    });

    it("executes create_database successfully", async () => {
      const res = await executeTool(
        "create_database",
        { name: "test_db", privileges: "READ_WRITE" },
        db,
      );
      expect(res.success).toBe(true);
      expect((res.output as { created: boolean }).created).toBe(true);
      expect((res.output as { name: string }).name).toBe("test_db");
    });

    it("executes send_email successfully", async () => {
      const res = await executeTool(
        "send_email",
        { to: "ceo@corp.com", subject: "Urgent update", body: "Server online" },
        db,
      );
      expect(res.success).toBe(true);
      expect((res.output as { sent: boolean }).sent).toBe(true);
      expect((res.output as { to: string }).to).toBe("ceo@corp.com");
    });

    it("executes write_database successfully", async () => {
      const res = await executeTool(
        "write_database",
        { table: "accounts", data: { id: "a1", balance: 500 } },
        db,
      );
      expect(res.success).toBe(true);
      expect((res.output as { written: boolean }).written).toBe(true);
      expect((res.output as { table: string }).table).toBe("accounts");
    });

    it("executes delete_database successfully", async () => {
      const res = await executeTool("delete_database", { name: "staging_db" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { deleted: boolean }).deleted).toBe(true);
      expect((res.output as { name: string }).name).toBe("staging_db");
    });

    it("executes delete_file successfully", async () => {
      const res = await executeTool("delete_file", { path: "/tmp/scratch.txt" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { deleted: boolean }).deleted).toBe(true);
      expect((res.output as { path: string }).path).toBe("/tmp/scratch.txt");
    });

    it("executes execute_command successfully", async () => {
      const res = await executeTool("execute_command", { command: "uptime" }, db);
      expect(res.success).toBe(true);
      expect((res.output as { executed: boolean }).executed).toBe(true);
      expect((res.output as { command: string }).command).toBe("uptime");
    });
  });

  describe("Error handling & security gating", () => {
    it("throws ToolNotFoundError for an unknown tool id", async () => {
      await expect(executeTool("non_existent_tool", { arg: 1 }, db)).rejects.toThrow(
        ToolNotFoundError,
      );
    });

    it("throws ToolDisabledError when attempting to execute a disabled tool", async () => {
      registerTool(
        {
          id: "disabled_tool",
          name: "Disabled Tool",
          risk_level: "LOW",
          description: "A disabled tool",
          enabled: false,
        },
        db,
      );

      await expect(executeTool("disabled_tool", {}, db)).rejects.toThrow(ToolDisabledError);
    });

    it("returns { success: false, output: { error } } if implementation throws (e.g. missing args)", async () => {
      // search_web requires a non-empty string query
      const res = await executeTool("search_web", {}, db);
      expect(res.success).toBe(false);
      expect(res.output).toHaveProperty("error");
      expect((res.output as { error: string }).error).toContain(
        "Missing required string argument: 'query'",
      );
    });

    it("logs simulated execution attempt to the console", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      await executeTool("create_database", { name: "customer_db" }, db);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[GATEWAY EXECUTED] create_database(name="customer_db")'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Structural Enforcement: No Direct Tool Execution Bypass", () => {
    function getAllTsFiles(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(getAllTsFiles(fullPath));
        } else if (file.endsWith(".ts")) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it("ensures no files outside backend/src/gateway import toolImplementations directly", () => {
      const srcDir = path.resolve(__dirname, "..");
      const allTsFiles = getAllTsFiles(srcDir);

      const nonGatewayFiles = allTsFiles.filter(
        (file) => !file.includes("/gateway/") && !file.includes("\\gateway\\"),
      );

      for (const file of nonGatewayFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const importsToolImplementations =
          content.includes("from ") && content.includes("toolImplementations");
        expect(
          importsToolImplementations,
          `Direct bypass detected! File ${file} imports toolImplementations directly instead of using toolGateway.executeTool.`,
        ).toBe(false);
      }
    });
  });
});
