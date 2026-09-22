import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import { Tool, RawToolRow } from "../../shared/types";
import { execute, nowISOString, queryAll, queryOne } from "./helpers";

function mapToolRow(row: RawToolRow): Tool {
  return {
    id: row.id,
    name: row.name,
    risk_level: row.risk_level,
    description: row.description,
    enabled: row.enabled === 1,
    created_at: row.created_at,
  };
}

/**
 * Returns all tools in the registry.
 */
export function getAllTools(db?: SqlJsDatabase): Tool[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawToolRow>(targetDb, "SELECT * FROM tools ORDER BY created_at ASC;");
  return rows.map(mapToolRow);
}

/**
 * Finds a tool by its unique ID.
 */
export function getToolById(id: string, db?: SqlJsDatabase): Tool | null {
  const targetDb = db ?? getDatabase();
  const row = queryOne<RawToolRow>(targetDb, "SELECT * FROM tools WHERE id = ?;", [id]);
  return row ? mapToolRow(row) : null;
}

/**
 * Returns only enabled tools.
 */
export function getEnabledTools(db?: SqlJsDatabase): Tool[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawToolRow>(
    targetDb,
    "SELECT * FROM tools WHERE enabled = 1 ORDER BY created_at ASC;",
  );
  return rows.map(mapToolRow);
}

/**
 * Inserts a tool into the registry.
 * If the tool already exists, returns the existing tool (idempotent).
 */
export function createTool(tool: Omit<Tool, "created_at">, db?: SqlJsDatabase): Tool {
  const targetDb = db ?? getDatabase();

  const existing = getToolById(tool.id, targetDb);
  if (existing) {
    return existing;
  }

  const createdAt = nowISOString();
  const enabledInt = tool.enabled === false || tool.enabled === 0 ? 0 : 1;

  execute(
    targetDb,
    "INSERT INTO tools (id, name, risk_level, description, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?);",
    [tool.id, tool.name, tool.risk_level, tool.description, enabledInt, createdAt],
  );

  saveDatabase();

  return {
    id: tool.id,
    name: tool.name,
    risk_level: tool.risk_level,
    description: tool.description,
    enabled: enabledInt === 1,
    created_at: createdAt,
  };
}
