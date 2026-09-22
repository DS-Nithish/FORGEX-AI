import { v4 as uuidv4 } from "uuid";
import { Database as SqlJsDatabase } from "sql.js";

/**
 * Returns current timestamp in UTC ISO format.
 */
export function nowISOString(): string {
  return new Date().toISOString();
}

/**
 * Generates a UUID v4, optionally prefixed (e.g. `generateId('req')` → `req_<uuid>`).
 */
export function generateId(prefix?: string): string {
  const id = uuidv4();
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Safely parses a JSON string into an object, returning a fallback if parsing fails or input is null/empty.
 */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Executes a SELECT query expecting 0 or 1 row using a prepared statement.
 */
export function queryOne<T>(
  db: SqlJsDatabase,
  sql: string,
  params: (string | number | null | undefined)[] = [],
): T | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params.map((p) => (p === undefined ? null : p)));
    if (stmt.step()) {
      return stmt.getAsObject() as unknown as T;
    }
    return null;
  } finally {
    stmt.free();
  }
}

/**
 * Executes a SELECT query returning all matching rows using a prepared statement.
 */
export function queryAll<T>(
  db: SqlJsDatabase,
  sql: string,
  params: (string | number | null | undefined)[] = [],
): T[] {
  const stmt = db.prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(params.map((p) => (p === undefined ? null : p)));
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

/**
 * Executes an INSERT, UPDATE, or DELETE query using a prepared statement.
 */
export function execute(
  db: SqlJsDatabase,
  sql: string,
  params: (string | number | null | undefined)[] = [],
): void {
  const stmt = db.prepare(sql);
  try {
    stmt.run(params.map((p) => (p === undefined ? null : p)));
  } finally {
    stmt.free();
  }
}
