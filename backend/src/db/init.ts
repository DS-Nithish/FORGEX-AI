import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";
import { config, logger } from "../shared";

let db: SqlJsDatabase;
let dbPath: string;

/**
 * Find the schema.sql file across common development and production paths.
 */
function findSchemaPath(): string {
  const candidates = [
    path.resolve(__dirname, "schema.sql"),
    path.resolve(__dirname, "./schema.sql"),
    path.resolve(process.cwd(), "src/db/schema.sql"),
    path.resolve(process.cwd(), "backend/src/db/schema.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`schema.sql not found in candidate paths: ${candidates.join(", ")}`);
}

/**
 * Initialize the SQLite database connection via sql.js (pure WASM).
 * Creates the .db file if it doesn't exist, runs schema.sql, and persists to disk.
 *
 * @param customPath Optional custom database file path or ':memory:' for testing.
 */
export async function initDatabase(customPath?: string): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  if (customPath) {
    dbPath = customPath;
  } else {
    dbPath = path.resolve(process.cwd(), config.DATABASE_URL);
  }

  if (dbPath !== ":memory:" && fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Read and execute schema.sql to ensure all tables exist
  const schemaPath = findSchemaPath();
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);

  // Safe migration for existing DB files without status column
  try {
    db.exec("ALTER TABLE tool_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';");
  } catch {
    // Column already exists or table was freshly created with status column
  }

  // Safe migration for existing DB files without new security_events columns
  const newEventColumns = [
    "tool_name TEXT NOT NULL DEFAULT ''",
    "args TEXT NOT NULL DEFAULT '{}'",
    "provenance TEXT NOT NULL DEFAULT '[]'",
    "taint TEXT NOT NULL DEFAULT '{}'",
    "risk TEXT NOT NULL DEFAULT '{}'",
    "matched_rule TEXT NOT NULL DEFAULT ''",
    "reasoning TEXT NOT NULL DEFAULT ''",
    "user_authorized INTEGER NOT NULL DEFAULT 0",
    "timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
  ];
  for (const col of newEventColumns) {
    try {
      db.exec(`ALTER TABLE security_events ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON;");

  // Persist if using a file
  if (dbPath !== ":memory:") {
    saveDatabase();
  }

  logger.info(`Database schema initialized (${dbPath})`);
  return db;
}

/**
 * Persist the in-memory database to disk.
 * Call this after any write operations.
 */
export function saveDatabase(): void {
  if (!db) {
    throw new Error("Database not initialised — call initDatabase() first");
  }
  if (dbPath === ":memory:") {
    return;
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Return the active database instance.
 * Throws if called before initDatabase().
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error("Database not initialised — call initDatabase() first");
  }
  return db;
}
