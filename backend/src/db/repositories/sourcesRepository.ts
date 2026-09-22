import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import { Source, RawSourceRow } from "../../shared/types";
import { execute, generateId, nowISOString, queryAll, queryOne, safeParseJson } from "./helpers";

function mapSourceRow(row: RawSourceRow): Source {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    trust_level: row.trust_level,
    metadata: safeParseJson<Record<string, unknown> | null>(row.metadata, null),
    created_at: row.created_at,
  };
}

/**
 * Creates a source origin with provenance metadata.
 * Generates an ID via UUID if none is provided.
 */
export function createSource(
  source: Omit<Source, "created_at" | "id"> & { id?: string },
  db?: SqlJsDatabase,
): Source {
  const targetDb = db ?? getDatabase();
  const id = source.id || generateId("src");
  const createdAt = nowISOString();
  const metadataStr = source.metadata ? JSON.stringify(source.metadata) : null;

  execute(
    targetDb,
    "INSERT INTO sources (id, type, name, trust_level, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?);",
    [id, source.type, source.name, source.trust_level, metadataStr, createdAt],
  );

  saveDatabase();

  return {
    id,
    type: source.type,
    name: source.name,
    trust_level: source.trust_level,
    metadata: source.metadata ?? null,
    created_at: createdAt,
  };
}

/**
 * Fetches a source by its unique ID.
 */
export function getSourceById(id: string, db?: SqlJsDatabase): Source | null {
  const targetDb = db ?? getDatabase();
  const row = queryOne<RawSourceRow>(targetDb, "SELECT * FROM sources WHERE id = ?;", [id]);
  return row ? mapSourceRow(row) : null;
}

/**
 * Returns all recorded sources ordered by creation date descending.
 */
export function getAllSources(db?: SqlJsDatabase): Source[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<RawSourceRow>(targetDb, "SELECT * FROM sources ORDER BY created_at DESC;");
  return rows.map(mapSourceRow);
}
