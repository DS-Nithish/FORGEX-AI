import { SourceType, TrustLevel } from "../shared/types";

export interface ProvenanceRecord {
  sourceId: string;
  sourceType?: SourceType | string;
  trustLevel: TrustLevel | "TRUSTED" | "UNTRUSTED" | "trusted" | "untrusted" | string;
  content: string;
  sourceName?: string;
}

export interface TaintResult {
  tainted: boolean;
  matchedSources: string[];
  matchedTerms: string[];
}

/**
 * Common stop words to exclude from keyword overlap matching to prevent false positives.
 */
const STOP_WORDS = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "that",
  "with",
  "from",
  "have",
  "here",
  "read",
  "also",
  "some",
  "what",
  "when",
  "where",
  "which",
  "your",
  "their",
  "will",
  "would",
  "could",
  "should",
  "type",
  "data",
  "file",
]);

/**
 * Recursively extracts all primitive/string values from tool call arguments.
 */
function extractArgValues(val: unknown): string[] {
  if (val === null || val === undefined) {
    return [];
  }
  if (typeof val === "string") {
    return [val];
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return [String(val)];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractArgValues);
  }
  if (typeof val === "object") {
    return Object.values(val as Record<string, unknown>).flatMap(extractArgValues);
  }
  return [];
}

/**
 * Extracts candidate tokens and substrings (>= 4 characters) from tool argument values.
 */
function extractCandidateTerms(values: string[]): string[] {
  const candidates = new Set<string>();

  for (const rawVal of values) {
    const trimmed = rawVal.trim();
    if (!trimmed) continue;

    // 1. Whole value as candidate (e.g. "attacker_db", "attacker@example.com")
    if (trimmed.length >= 4 && !STOP_WORDS.has(trimmed.toLowerCase())) {
      candidates.add(trimmed);
    }

    // 2. Individual word tokens within the value
    const tokens = trimmed.split(/[\s,;:!?()[\]{}<>"'`]+/);
    for (const token of tokens) {
      const cleanToken = token.trim();
      if (cleanToken.length >= 4 && !STOP_WORDS.has(cleanToken.toLowerCase())) {
        candidates.add(cleanToken);
      }
    }
  }

  return Array.from(candidates);
}

/**
 * Pure function: Detects whether a tool call's arguments were influenced by untrusted
 * content the agent read during the session.
 *
 * Matching logic:
 * 1. Flatten tool call argument values into candidate terms (length >= 4).
 * 2. Filter session content for records with trustLevel === 'UNTRUSTED'.
 * 3. Check for substring/keyword overlap between candidate terms and untrusted content.
 * 4. Returns { tainted, matchedSources, matchedTerms }.
 *
 * CRITICAL INVARIANT:
 * Only UNTRUSTED sources can cause a request to become tainted. Trusted source matches
 * represent legitimate user/system instructions and never trigger taint.
 */
export function checkTaint(
  toolCallArgs: Record<string, unknown>,
  sessionContent: ProvenanceRecord[],
): TaintResult {
  if (!toolCallArgs || typeof toolCallArgs !== "object") {
    return { tainted: false, matchedSources: [], matchedTerms: [] };
  }
  if (!sessionContent || !Array.isArray(sessionContent) || sessionContent.length === 0) {
    return { tainted: false, matchedSources: [], matchedTerms: [] };
  }

  const argValues = extractArgValues(toolCallArgs);
  const candidates = extractCandidateTerms(argValues);

  if (candidates.length === 0) {
    return { tainted: false, matchedSources: [], matchedTerms: [] };
  }

  const matchedSourcesSet = new Set<string>();
  const matchedTermsSet = new Set<string>();

  for (const record of sessionContent) {
    // Only untrusted sources can taint a request
    const isUntrusted =
      typeof record.trustLevel === "string" &&
      record.trustLevel.trim().toUpperCase() === "UNTRUSTED";

    if (!isUntrusted || !record.content) {
      continue;
    }

    const contentLower = record.content.toLowerCase();

    for (const candidate of candidates) {
      if (contentLower.includes(candidate.toLowerCase())) {
        matchedSourcesSet.add(record.sourceId);
        matchedTermsSet.add(candidate);
      }
    }
  }

  const matchedSources = Array.from(matchedSourcesSet);
  const matchedTerms = Array.from(matchedTermsSet);

  return {
    tainted: matchedSources.length > 0,
    matchedSources,
    matchedTerms,
  };
}
