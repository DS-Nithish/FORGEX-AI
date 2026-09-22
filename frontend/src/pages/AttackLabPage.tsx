import { useState } from "react";
import { runAttackLab, type CombinedReport } from "../api";

export default function AttackLabPage() {
  const [report, setReport] = useState<CombinedReport | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunSuite = async () => {
    try {
      setRunning(true);
      setError(null);
      const data = await runAttackLab();
      setReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Attack Lab & Verification Suite
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Automated benchmark evaluating direct prompt injection, indirect staged attacks, and legitimate operations.
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={running}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-[var(--color-shield-600)] hover:bg-[var(--color-shield-500)] active:bg-[var(--color-shield-700)] text-white shadow-lg shadow-shield-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running Benchmark...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Security Suite Live
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300 text-sm">
          <strong>Execution Notice:</strong> {error}. Ensure backend is running.
        </div>
      )}

      {/* Metric Cards if report exists */}
      {report && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <span className="text-xs text-slate-400">Total Scenarios</span>
            <p className="text-2xl font-bold text-white mt-1">{report.totalScenarios}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-xs text-emerald-400">Passed Assertions</span>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{report.passedCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <span className="text-xs text-slate-400">False Positives</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{report.falsePositiveCount} (0 target)</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <span className="text-xs text-slate-400">False Negatives</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{report.falseNegativeCount} (0 target)</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="mt-8">
        {!report && !running ? (
          <div className="p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Attack Lab Standby</h3>
            <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
              Click &quot;Run Security Suite Live&quot; to execute all 12 attack detection and legitimate operation scenarios through the live AgentShield firewall pipeline.
            </p>
          </div>
        ) : report ? (
          <div className="space-y-8">
            {/* Attack Scenarios Table */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span>🛡️</span> Attack & Prompt Injection Scenarios
              </h2>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[0.03] uppercase text-slate-400 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Scenario</th>
                      <th className="px-4 py-3">Technique</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">Actual</th>
                      <th className="px-4 py-3">Tainted</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {report.attackReport.results.map((r) => (
                      <tr key={r.scenarioId} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-white">{r.scenarioName}</td>
                        <td className="px-4 py-3 text-slate-400">{r.technique}</td>
                        <td className="px-4 py-3 font-mono font-bold text-rose-400">{r.expectedOutcome}</td>
                        <td className="px-4 py-3 font-mono font-bold text-rose-300">{r.actualOutcome}</td>
                        <td className="px-4 py-3 font-mono">{r.actualTaint ? "YES" : "NO"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {r.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legitimate Scenarios Table */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span>✅</span> Legitimate & Sensitive-Authorized Scenarios (False-Positive Control)
              </h2>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[0.03] uppercase text-slate-400 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Scenario</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Expected</th>
                      <th className="px-4 py-3">Actual</th>
                      <th className="px-4 py-3">Tainted</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {report.legitimateReport.results.map((r) => (
                      <tr key={r.scenarioId} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-white">{r.scenarioName}</td>
                        <td className="px-4 py-3 text-slate-400">{r.technique}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">{r.expectedOutcome}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-300">{r.actualOutcome}</td>
                        <td className="px-4 py-3 font-mono">{r.actualTaint ? "YES" : "NO"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {r.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
