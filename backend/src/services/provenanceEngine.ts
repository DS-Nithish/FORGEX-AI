import { Database as SqlJsDatabase } from "sql.js";
import { Source, SourceType, TrustLevel, ProvenanceLink } from "../shared/types";
import { defaultTrustLevelForSourceType } from "../shared/trustLevels";
import { createSource, getSourceById } from "../db/repositories/sourcesRepository";
import {
  linkProvenance,
  getProvenanceForRequest as getRepoProvenanceForRequest,
  ProvenanceWithSource,
} from "../db/repositories/provenanceRepository";
import { logger } from "../shared/logger";

export interface RegisterSourceInput {
  type: SourceType;
  name: string;
  metadata?: Record<string, unknown>;
}

/**
 * Custom error thrown when a requested source ID is not found.
 */
export class SourceNotFoundError extends Error {
  constructor(sourceId: string) {
    super(`Source not found with id: ${sourceId}`);
    this.name = "SourceNotFoundError";
  }
}

/**
 * Registers a new source record in the provenance store.
 *
 * CRITICAL SECURITY INVARIANT (PRD Section 18):
 * Trust level is NEVER accepted from the caller — it is deterministically derived
 * via `defaultTrustLevelForSourceType(input.type)`.
 */
export function registerSource(input: RegisterSourceInput, db?: SqlJsDatabase): Source {
  const trustLevel = defaultTrustLevelForSourceType(input.type);

  logger.info(
    `[PROVENANCE] Registering source '${input.name}' (type: ${input.type}, derived trust: ${trustLevel})`,
  );

  return createSource(
    {
      type: input.type,
      name: input.name,
      trust_level: trustLevel,
      metadata: input.metadata ?? null,
    },
    db,
  );
}

/**
 * Convenience function to register a TRUSTED source representing the user's direct instruction.
 * Used when an agent task has no external documents or files read.
 */
export function registerUserSource(metadata?: Record<string, unknown>, db?: SqlJsDatabase): Source {
  return registerSource(
    {
      type: "USER",
      name: "User Request",
      metadata,
    },
    db,
  );
}

/**
 * Retrieves the trust level of a registered source by its unique ID.
 * Throws SourceNotFoundError if the source does not exist.
 */
export function getSourceTrustLevel(sourceId: string, db?: SqlJsDatabase): TrustLevel {
  const source = getSourceById(sourceId, db);
  if (!source) {
    throw new SourceNotFoundError(sourceId);
  }
  return source.trust_level;
}

/**
 * Links a tool request to an originating source with a specific relationship.
 * Thin wrapper around provenanceRepository.linkProvenance so callers interact
 * exclusively through provenanceEngine.
 */
export function linkSourceToRequest(
  requestId: string,
  sourceId: string,
  relationship: string,
  db?: SqlJsDatabase,
): ProvenanceLink {
  return linkProvenance(requestId, sourceId, relationship, db);
}

/**
 * Retrieves all provenance links and joined source details for a tool request.
 * Thin wrapper around provenanceRepository.getProvenanceForRequest.
 */
export function getProvenanceForRequest(
  requestId: string,
  db?: SqlJsDatabase,
): ProvenanceWithSource[] {
  return getRepoProvenanceForRequest(requestId, db);
}
