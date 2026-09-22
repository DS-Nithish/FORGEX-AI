import { useState, useEffect, useCallback } from "react";
import {
  fetchPendingApprovals,
  approveRequest,
  denyRequest,
  type ToolRequest,
} from "../api";

export default function ApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState<{
    id: string;
    type: "approved" | "denied";
    message: string;
  } | null>(null);

  const loadPending = useCallback(async () => {
    try {
      const data = await fetchPendingApprovals();
      setPendingRequests(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
    const interval = setInterval(() => {
      loadPending();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadPending]);

  const handleApprove = async (requestId: string) => {
    try {
      setActionInProgress(requestId);
      await approveRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setLastActionStatus({
        id: requestId,
        type: "approved",
        message: `Request approved and executed via Tool Gateway.`,
      });
      loadPending();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Approval error: ${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      setActionInProgress(requestId);
      await denyRequest(requestId, "Operator rejected tool invocation.");
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setLastActionStatus({
        id: requestId,
        type: "denied",
        message: `Request denied. Execution blocked at Tool Gateway boundary.`,
      });
      loadPending();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Denial error: ${msg}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto space-y-8 bg-[#0A0A0A] text-[#EDEDED]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Human Approval Queue
            </h1>
            {pendingRequests.length > 0 && (
              <span className="text-xs font-mono text-[#F59E0B]">
                ({pendingRequests.length} Pending)
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            Intercepted high-risk tool calls awaiting human authorization before execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPending()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
          >
            <span className={`inline-block ${loading ? "animate-spin" : ""}`}>↻</span>
            Refresh
          </button>
          <span className="text-xs font-mono text-neutral-500">
            Live (3s polling)
          </span>
        </div>
      </div>

      {/* Action Notification Banner */}
      {lastActionStatus && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#121316] flex items-center justify-between text-xs">
          <span className={lastActionStatus.type === "approved" ? "text-emerald-400" : "text-[#EF4444]"}>
            {lastActionStatus.message}
          </span>
          <button
            onClick={() => setLastActionStatus(null)}
            className="text-neutral-500 hover:text-white cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
          <strong>Notice:</strong> {error}. Ensure backend is running.
        </div>
      )}

      {/* Content Area */}
      <div>
        {loading && pendingRequests.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 font-mono text-xs">
            Checking approval queue...
          </div>
        ) : pendingRequests.length === 0 ? (
          /* Clean Minimal Empty State */
          <div className="p-16 text-center rounded-2xl border border-white/[0.06] bg-[#121316] space-y-3">
            <h3 className="text-base font-semibold text-white">No Pending Approvals</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              All intercepted tool calls have been resolved. When an autonomous agent attempts a high-risk operation (e.g. database write, command execution), it will pause and appear here for operator review.
            </p>
          </div>
        ) : (
          /* Pending Requests Cards: Clean & Unnested */
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-white/[0.08] bg-[#121316] p-6 space-y-4 transition-colors hover:border-white/20"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-white">
                      {req.tool_id}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      {req.id}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-medium ${
                      req.risk_level === "CRITICAL" || req.risk_level === "HIGH"
                        ? "text-[#EF4444]"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {req.risk_level} RISK
                  </span>
                </div>

                {/* Firewall Reasoning */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Policy Engine Reasoning
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {req.reason || "Action carries high risk. Requires explicit operator authorization before Gateway release."}
                  </p>
                </div>

                {/* Tool Arguments */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    Proposed Invocation Arguments
                  </div>
                  <pre className="text-xs font-mono bg-black/40 border border-white/[0.06] rounded-lg p-3 text-neutral-200 overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(req.arguments, null, 2)}
                  </pre>
                </div>

                {/* Footer with Timestamp & Clean Action Buttons */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4">
                  <span className="text-xs font-mono text-neutral-500">
                    Requested: {new Date(req.created_at).toLocaleTimeString()}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDeny(req.id)}
                      disabled={actionInProgress === req.id}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 border border-white/[0.1] hover:border-white/30 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionInProgress === req.id}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Approve Execution
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
