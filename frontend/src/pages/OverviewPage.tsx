import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fetchPendingApprovals,
  fetchSecurityEvents,
  type SecurityEvent,
  type ToolRequest,
} from "../api";

export default function OverviewPage() {
  const [pending, setPending] = useState<ToolRequest[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [pendingData, eventsData] = await Promise.all([
          fetchPendingApprovals().catch(() => []),
          fetchSecurityEvents(100).catch(() => []),
        ]);
        if (mounted) {
          setPending(pendingData);
          setEvents(eventsData);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const blockedCount = events.filter((e) => e.event_type === "BLOCK").length;
  const approvedCount = events.filter((e) => e.event_type === "APPROVED").length;
  const allowedCount = events.filter((e) => e.event_type === "ALLOW").length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Runtime security inspection and policy enforcement for autonomous agents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Firewall Active
            </span>
          </div>
        </div>

        {/* Essential Metrics: 4 Clean Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Blocked */}
          <div className="p-6 rounded-xl border border-white/[0.06] bg-[#111215] space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Blocked Threats
            </span>
            <div className="text-3xl font-mono font-bold text-[#EF4444]">
              {loading ? "—" : blockedCount}
            </div>
            <p className="text-xs text-neutral-500">Indirect injections halted</p>
          </div>

          {/* Card 2: Pending Review */}
          <Link
            to="/approvals"
            className="p-6 rounded-xl border border-white/[0.06] bg-[#111215] hover:border-[#EDEDED] transition-colors block group space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">
                Pending Review
              </span>
              <span className="text-xs text-neutral-500 group-hover:text-white transition-colors">&rarr;</span>
            </div>
            <div className="text-3xl font-mono font-bold text-[#F59E0B]">
              {loading ? "—" : pending.length}
            </div>
            <p className="text-xs text-neutral-500">Awaiting human sign-off</p>
          </Link>

          {/* Card 3: Approved */}
          <div className="p-6 rounded-xl border border-white/[0.06] bg-[#111215] space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Approved Actions
            </span>
            <div className="text-3xl font-mono font-bold text-emerald-400">
              {loading ? "—" : approvedCount}
            </div>
            <p className="text-xs text-neutral-500">Operator confirmed</p>
          </div>

          {/* Card 4: Safe Allowed */}
          <div className="p-6 rounded-xl border border-white/[0.06] bg-[#111215] space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Safe Allowed
            </span>
            <div className="text-3xl font-mono font-bold text-white">
              {loading ? "—" : allowedCount}
            </div>
            <p className="text-xs text-neutral-500">Direct low-risk executions</p>
          </div>
        </div>

        {/* Primary Focus: Recent Security Decisions Audit Ledger */}
        <div className="rounded-xl border border-white/[0.06] bg-[#111215] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Recent Decisions</span>
              <span className="text-xs font-mono text-neutral-500">({events.length})</span>
            </div>
            <Link
              to="/security-events"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              View all events &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-500">
              Loading security ledger...
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-neutral-500">
              No security decisions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {events.slice(0, 8).map((evt) => {
                const isBlock = evt.event_type === "BLOCK";
                const isApproved = evt.event_type === "APPROVED";
                const isConfirm = evt.event_type === "CONFIRM";

                const decisionColor = isBlock
                  ? "text-[#EF4444]"
                  : isApproved
                  ? "text-emerald-400"
                  : isConfirm
                  ? "text-[#F59E0B]"
                  : "text-neutral-400";

                return (
                  <div
                    key={evt.id}
                    className="px-6 py-4 flex items-center justify-between gap-4 text-sm hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Minimal status text without bulky pill box */}
                      <span className={`w-20 font-mono text-xs font-semibold ${decisionColor} shrink-0`}>
                        {evt.event_type}
                      </span>
                      <span className="font-mono text-xs font-medium text-white truncate">
                        {evt.tool_name}
                      </span>
                    </div>

                    <div className="text-neutral-400 text-xs truncate hidden sm:block max-w-md">
                      {evt.matched_rule || evt.reasoning || "Standard policy evaluation"}
                    </div>

                    <div className="text-xs font-mono text-neutral-500 shrink-0">
                      {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
