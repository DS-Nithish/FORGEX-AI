import { useState, useEffect, useCallback } from "react";
import {
  fetchSecurityEvents,
  fetchEventExplanation,
  type SecurityEvent,
  type DecisionExplanation,
} from "../api";

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  // Selected row for full explanation modal/accordion
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, DecisionExplanation>>({});
  const [loadingExplain, setLoadingExplain] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchSecurityEvents(50);
      setEvents(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const handleToggleRow = async (requestId: string) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
      return;
    }

    setExpandedRequestId(requestId);

    // If explanation not already fetched for this requestId, fetch it
    if (!explanations[requestId]) {
      try {
        setLoadingExplain(requestId);
        const explanation = await fetchEventExplanation(requestId);
        setExplanations((prev) => ({ ...prev, [requestId]: explanation }));
      } catch (err) {
        console.error("Failed to fetch explanation:", err);
      } finally {
        setLoadingExplain(null);
      }
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "BLOCK":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "CONFIRM":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "ALLOW":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "APPROVED":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "DENIED":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case "CRITICAL":
        return "text-rose-400 bg-rose-950/40 border-rose-500/20";
      case "HIGH":
        return "text-orange-400 bg-orange-950/40 border-orange-500/20";
      case "MEDIUM":
        return "text-amber-400 bg-amber-950/40 border-amber-500/20";
      case "LOW":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/20";
      default:
        return "text-slate-400 bg-slate-900 border-slate-700";
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    return e.event_type === filterType;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Security Audit Events
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15">
              {events.length} Events Logged
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Immutable, tamper-evident audit trail of all firewall decisions and operator approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadEvents()}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/80" />
            Live polling (3s)
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["ALL", "BLOCK", "CONFIRM", "ALLOW", "APPROVED", "DENIED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filterType === f
                ? "bg-white/15 text-white border-white/30"
                : "bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            {f} {f !== "ALL" && `(${events.filter((e) => e.event_type === f).length})`}
          </button>
        ))}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300 text-sm">
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Table Container */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {loading && events.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading security events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-slate-500"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No security events found</p>
            <p className="mt-1 text-xs text-slate-600">
              {filterType === "ALL"
                ? "Threat detections and firewall evaluations will appear here."
                : `No events matching filter '${filterType}'.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-semibold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Decision</th>
                  <th className="px-4 py-3.5">Tool Invoked</th>
                  <th className="px-4 py-3.5">Risk Level</th>
                  <th className="px-4 py-3.5">Summary / Matched Policy</th>
                  <th className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredEvents.map((evt) => {
                  const isExpanded = expandedRequestId === evt.request_id;
                  const explanation = explanations[evt.request_id];
                  const isLoadingExplain = loadingExplain === evt.request_id;

                  return (
                    <tr
                      key={evt.id}
                      className="group transition-colors hover:bg-white/[0.03]"
                    >
                      <td colSpan={6} className="p-0">
                        {/* Main Row */}
                        <div
                          onClick={() => handleToggleRow(evt.request_id)}
                          className="flex items-center cursor-pointer px-4 py-3.5 hover:bg-white/[0.02]"
                        >
                          <div className="w-[180px] text-xs font-mono text-slate-400 shrink-0">
                            {new Date(evt.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}{" "}
                            <span className="text-[10px] text-slate-600 block">
                              {new Date(evt.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="w-[120px] shrink-0">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getDecisionBadge(
                                evt.event_type,
                              )}`}
                            >
                              {evt.event_type}
                            </span>
                          </div>

                          <div className="w-[180px] shrink-0">
                            <span className="font-mono text-xs font-semibold text-white bg-black/40 px-2 py-1 rounded border border-white/10">
                              {evt.tool_name}
                            </span>
                          </div>

                          <div className="w-[110px] shrink-0">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getRiskBadge(
                                evt.risk_level,
                              )}`}
                            >
                              {evt.risk_level || "UNKNOWN"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-[200px] text-xs text-slate-300 truncate pr-4">
                            {evt.reasoning || evt.matched_rule}
                          </div>

                          <div className="w-[90px] text-right shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleRow(evt.request_id);
                              }}
                              className="text-xs text-[var(--color-shield-400)] hover:underline font-medium inline-flex items-center gap-1"
                            >
                              {isExpanded ? "Collapse" : "Explain"}
                              <svg
                                className={`w-3 h-3 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expandable Explanation Panel (Phase 18 explainDecision) */}
                        {isExpanded && (
                          <div className="bg-black/50 border-t border-b border-white/10 p-5 pl-8 text-xs space-y-4 animate-in fade-in duration-200">
                            {isLoadingExplain ? (
                              <div className="py-6 text-center text-slate-500">
                                <div className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                                Generating forensic explainability breakdown...
                              </div>
                            ) : explanation ? (
                              <div className="space-y-4">
                                {/* Verdict banner */}
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                                      SUMMARY EXPLANATION
                                    </span>
                                    <p className="text-sm font-semibold text-white mt-0.5">
                                      {explanation.summary}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Request ID: {explanation.requestId}
                                    </span>
                                    <span className="text-xs text-amber-400 font-mono font-medium">
                                      {explanation.verdict.matchedRule}
                                    </span>
                                  </div>
                                </div>

                                {/* Three-Pillar Evidence Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Pillar 1: Provenance */}
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                                      <span>🔍</span> PROVENANCE ENGINE
                                    </span>
                                    <p className="text-slate-300">
                                      Total Sources: <strong>{explanation.provenanceEvidence.sourceCount}</strong>
                                    </p>
                                    {explanation.provenanceEvidence.untrustedSources.length > 0 && (
                                      <div className="text-rose-400 text-[11px]">
                                        Untrusted: {explanation.provenanceEvidence.untrustedSources.join(", ")}
                                      </div>
                                    )}
                                    {explanation.provenanceEvidence.trustedSources.length > 0 && (
                                      <div className="text-emerald-400 text-[11px]">
                                        Trusted: {explanation.provenanceEvidence.trustedSources.join(", ")}
                                      </div>
                                    )}
                                  </div>

                                  {/* Pillar 2: Taint Engine */}
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                                      <span>⚠️</span> TAINT ENGINE
                                    </span>
                                    <p className="text-slate-300">
                                      Tainted:{" "}
                                      <span
                                        className={
                                          explanation.taintEvidence.tainted
                                            ? "text-rose-400 font-bold"
                                            : "text-emerald-400 font-semibold"
                                        }
                                      >
                                        {explanation.taintEvidence.tainted ? "YES" : "NO"}
                                      </span>
                                    </p>
                                    {explanation.taintEvidence.matchedTerms.length > 0 && (
                                      <div className="text-rose-300 text-[11px]">
                                        Matched Terms:{" "}
                                        <span className="font-mono">
                                          {explanation.taintEvidence.matchedTerms.join(", ")}
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-slate-400 text-[11px]">
                                      {explanation.taintEvidence.explanation}
                                    </p>
                                  </div>

                                  {/* Pillar 3: Risk Engine */}
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                                      <span>🛡️</span> RISK ENGINE
                                    </span>
                                    <p className="text-slate-300">
                                      Tool: <strong>{explanation.riskEvidence.toolName}</strong>
                                    </p>
                                    <p className="text-slate-300">
                                      Risk Level:{" "}
                                      <span className="font-bold text-white">
                                        {explanation.riskEvidence.riskLevel}
                                      </span>
                                    </p>
                                    <p className="text-slate-400 text-[11px]">
                                      Recognized Tool:{" "}
                                      {explanation.riskEvidence.isKnownTool ? "Yes" : "No (Fail-Closed Default)"}
                                    </p>
                                  </div>
                                </div>

                                {/* Raw Arguments Collapsible */}
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                                    Tool Call Arguments
                                  </span>
                                  <pre className="font-mono text-[11px] bg-black/70 p-2.5 rounded-lg border border-white/5 text-slate-300 overflow-x-auto">
                                    {JSON.stringify(evt.arguments, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-white">
                                  {evt.reasoning}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Matched Policy Rule: {evt.matched_rule}
                                </p>
                                <pre className="font-mono text-[11px] bg-black/70 p-2.5 rounded-lg border border-white/5 text-slate-300 overflow-x-auto">
                                  {JSON.stringify(evt.arguments, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
