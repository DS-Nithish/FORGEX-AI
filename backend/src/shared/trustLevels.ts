import { SourceType, TrustLevel } from "./types";

export const TRUST_LEVELS: readonly TrustLevel[] = ["TRUSTED", "UNTRUSTED"] as const;
export { TrustLevel };

/**
 * Pure deterministic mapping implementing PRD Section 18's Trust Model:
 * - USER      → TRUSTED
 * - SYSTEM    → TRUSTED
 * - EMAIL     → UNTRUSTED
 * - PDF       → UNTRUSTED
 * - WEB       → UNTRUSTED
 * - DATABASE  → UNTRUSTED
 *
 * Throws a clear error for any unrecognized source type rather than silently defaulting.
 */
export function defaultTrustLevelForSourceType(sourceType: SourceType): TrustLevel {
  switch (sourceType) {
    case "USER":
    case "SYSTEM":
      return "TRUSTED";
    case "EMAIL":
    case "PDF":
    case "WEB":
    case "DATABASE":
      return "UNTRUSTED";
    default:
      throw new Error(`Unknown or unsupported source type: ${String(sourceType)}`);
  }
}
