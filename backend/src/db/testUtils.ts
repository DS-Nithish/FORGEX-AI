import { Database as SqlJsDatabase } from "sql.js";
import { initDatabase } from "./init";

/**
 * Initializes a fresh, isolated in-memory SQLite database with schema.sql applied.
 * Safe for parallel or isolated test execution.
 */
export async function createTestDatabase(): Promise<SqlJsDatabase> {
  return await initDatabase(":memory:");
}
