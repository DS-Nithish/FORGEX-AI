import { Database as SqlJsDatabase } from "sql.js";
import { initDatabase, saveDatabase } from "./init";
import { registerTool, listAllTools } from "../services/toolRegistry";
import { logger } from "../shared";
import { RiskLevel } from "../shared/types";

export interface MvpToolDefinition {
  id: string;
  name: string;
  risk_level: RiskLevel;
  description: string;
}

export const MVP_TOOLS: MvpToolDefinition[] = [
  {
    id: "search_web",
    name: "Search Web",
    risk_level: "LOW",
    description: "Search the web for external information",
  },
  {
    id: "read_email",
    name: "Read Email",
    risk_level: "LOW",
    description: "Read incoming and existing email messages",
  },
  {
    id: "read_pdf",
    name: "Read PDF",
    risk_level: "LOW",
    description: "Extract text and contents from PDF documents",
  },
  {
    id: "query_database",
    name: "Query Database",
    risk_level: "MEDIUM",
    description: "Execute read-only queries against the database",
  },
  {
    id: "create_database",
    name: "Create Database",
    risk_level: "HIGH",
    description: "Create new database schemas or tables",
  },
  {
    id: "send_email",
    name: "Send Email",
    risk_level: "HIGH",
    description: "Compose and send email messages to recipients",
  },
  {
    id: "write_database",
    name: "Write Database",
    risk_level: "HIGH",
    description: "Insert, update, or modify database records",
  },
  {
    id: "delete_database",
    name: "Delete Database",
    risk_level: "CRITICAL",
    description: "Drop or delete databases and tables",
  },
  {
    id: "delete_file",
    name: "Delete File",
    risk_level: "CRITICAL",
    description: "Permanently delete files from the local filesystem",
  },
  {
    id: "execute_command",
    name: "Execute Command",
    risk_level: "CRITICAL",
    description: "Execute arbitrary shell or system commands",
  },
];

/**
 * Seeds the 10 MVP tools into the tools table using the toolRegistry service.
 * Idempotent: registerTool / createTool checks existence before inserting.
 */
export async function seedTools(
  targetDb?: SqlJsDatabase,
): Promise<{ seeded: number; total: number }> {
  let db = targetDb;
  let isCustomDb = true;

  if (!db) {
    db = await initDatabase();
    isCustomDb = false;
  }

  const beforeTools = listAllTools(db);
  const countBefore = beforeTools.length;

  for (const tool of MVP_TOOLS) {
    registerTool(
      {
        id: tool.id,
        name: tool.name,
        risk_level: tool.risk_level,
        description: tool.description,
        enabled: true,
      },
      db,
    );
  }

  const afterTools = listAllTools(db);
  const countAfter = afterTools.length;
  const seededCount = countAfter - countBefore;

  if (!isCustomDb) {
    saveDatabase();
  }

  logger.info(
    `Seeding complete: ${seededCount} new tools added, ${countAfter} total tools in registry.`,
  );
  return { seeded: seededCount, total: countAfter };
}

// Allow direct execution via CLI (e.g. npm run db:seed)
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedTools()
    .then(({ seeded, total }) => {
      logger.info(`Done: ${seeded} newly seeded, ${total} tools active in database.`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Seed script failed:", err);
      process.exit(1);
    });
}
