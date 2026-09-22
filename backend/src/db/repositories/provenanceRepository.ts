import { Database as SqlJsDatabase } from "sql.js";
import { getDatabase, saveDatabase } from "../init";
import { ProvenanceLink, Source, SourceType, TrustLevel } from "../../shared/types";
import { execute, generateId, nowISOString, queryAll, safeParseJson } from "./helpers";

export interface ProvenanceWithSource extends ProvenanceLink {
  source: Source;
}

interface JoinedProvenanceRow {
  link_id: string;
  request_id: string;
  source_id: string;
  relationship: string;
  link_created_at: string;
  source_table_id: string;
  source_type: SourceType;
  source_name: string;
  source_trust_level: TrustLevel;
  source_metadata: string | null;
  source_created_at: string;
}

/**
 * Creates a provenance link connecting a tool request to an originating source.
 */
export function linkProvenance(
  requestId: string,
  sourceId: string,
  relationship: string,
  db?: SqlJsDatabase,
): ProvenanceLink {
  const targetDb = db ?? getDatabase();
  const id = generateId("prov");
  const createdAt = nowISOString();

  execute(
    targetDb,
    "INSERT INTO provenance_links (id, request_id, source_id, relationship, created_at) VALUES (?, ?, ?, ?, ?);",
    [id, requestId, sourceId, relationship, createdAt],
  );

  saveDatabase();

  return {
    id,
    request_id: requestId,
    source_id: sourceId,
    relationship,
    created_at: createdAt,
  };
}

/**
 * Retrieves all provenance links for a request joined with full source details.
 */
export function getProvenanceForRequest(
  requestId: string,
  db?: SqlJsDatabase,
): ProvenanceWithSource[] {
  const targetDb = db ?? getDatabase();
  const rows = queryAll<JoinedProvenanceRow>(
    targetDb,
    `SELECT
      p.id AS link_id,
      p.request_id,
      p.source_id,
      p.relationship,
      p.created_at AS link_created_at,
      s.id AS source_table_id,
      s.type AS source_type,
      s.name AS source_name,
      s.trust_level AS source_trust_level,
      s.metadata AS source_metadata,
      s.created_at AS source_created_at
    FROM provenance_links p
    JOIN sources s ON p.source_id = s.id
    WHERE p.request_id = ?
    ORDER BY p.created_at ASC;`,
    [requestId],
  );

  return rows.map((r) => ({
    id: r.link_id,
    request_id: r.request_id,
    source_id: r.source_id,
    relationship: r.relationship,
    created_at: r.link_created_at,
    source: {
      id: r.source_table_id,
      type: r.source_type,
      name: r.source_name,
      trust_level: r.source_trust_level,
      metadata: safeParseJson<Record<string, unknown> | null>(r.source_metadata, null),
      created_at: r.source_created_at,
    },
  }));
}
