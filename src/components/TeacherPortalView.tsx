import React, { useState } from 'react';
import { TeacherClassStats, ViewMode } from '../types';
import { 
  GraduationCap, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Send, 
  Download, 
  Search, 
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface TeacherPortalViewProps {
  stats: TeacherClassStats;
  onNavigate: (view: ViewMode) => void;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({ stats, onNavigate }) => {
  const [roster, setRoster] = useState(stats.studentRoster);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMisconception, setSelectedMisconception] = useState(stats.topMisconceptions[0]?.name ?? '');
  const [assignmentSuccessMsg, setAssignmentSuccessMsg] = useState<string | null>(null);

  const filteredRoster = roster.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.primaryTrap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (stats.totalStudents === 0) {
    return <div className="min-h-screen bg-[#f8f9ff] px-4 py-16 sm:px-6"><div className="mx-auto max-w-xl rounded-2xl border border-[#bfc7d2]/40 bg-white p-8 text-center shadow-xs"><GraduationCap className="mx-auto h-9 w-9 text-[#006096]" /><h1 className="mt-4 text-xl font-bold text-[#0b1c30]">Your class workspace is ready</h1><p className="mt-2 text-sm leading-6 text-[#3f4851]">There are no learners or diagnostic results in this workspace yet.</p></div></div>;
  }

  const handleDispatchAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentSuccessMsg(`Targeted remediation quiz for "${selectedMisconception}" dispatched to ${roster.length} students.`);
    setTimeout(() => {
      setIsAssignModalOpen(false);
      setAssignmentSuccessMsg(null);
    }, 2000);
  };

  const handleExportRoster = () => {
    const header = "Student ID,Name,Email,Mastery Score,Status,Primary Flagged Trap\n";
    const rows = filteredRoster.map(s => `"${s.id}","${s.name}","${s.email}",${s.mastery},"${s.status}","${s.primaryTrap}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Class_Cognitive_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#bfc7d2]/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-900">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="font-headline-sm text-xl font-bold text-[#0b1c30]">
              Teacher & Department Analytics Portal
            </h1>
          </div>
          <p className="text-xs text-[#3f4851] mt-1">
            Cohort-level diagnostic telemetry, misconception cluster tracking, and adaptive quiz assignment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportRoster}
            className="px-3.5 py-2 rounded-xl border border-[#bfc7d2]/60 hover:bg-[#eff4ff] text-[#006096] font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] transition-all shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Dispatch Adaptive Quiz</span>
          </button>
        </div>
      </div>

      {/* Cohort Key Metrics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3f4851]">Active Enrolled</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0b1c30]">{stats.totalStudents}</span>
            <span className="text-xs text-[#3f4851]">STEM scholars</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold">100% telemetry synced</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3f4851]">Class Avg Mastery</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#006096]">{stats.avgMastery}%</span>
            <span className="text-xs text-emerald-600 font-semibold">+4.2%</span>
          </div>
          <p className="text-[11px] text-[#3f4851]">P-Score distribution stable</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3f4851]">Active Traps Flagged</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{stats.activeTrapsFlagged}</span>
            <span className="text-xs text-amber-700">under remediation</span>
          </div>
          <p className="text-[11px] text-[#3f4851]">Concentrated in limits & matrices</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#3f4851]">Remediation Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700">{stats.remediationSuccessRate}%</span>
            <span className="text-xs text-emerald-600">verified</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold">Cleared after 2.1 iterations</p>
        </div>
      </div>

      {/* Cohort Misconception Clusters Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-base font-bold text-[#0b1c30]">
              Class-Wide Misconception Clusters
            </h3>
            <p className="text-xs text-[#3f4851]">
              Root-cause mental model failures occurring across multiple students
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#006096] bg-[#eff4ff] px-2.5 py-1 rounded-lg">
            High Severity Clusters
          </span>
        </div>

        <div className="space-y-3.5">
          {stats.topMisconceptions.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-[#bfc7d2]/40 bg-[#f8f9ff] text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className="font-bold text-[#0b1c30] text-sm">{item.name}</span>
                  <span className="text-[11px] font-medium text-[#707882]">({item.topic})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-700">{item.count} students ({item.pctClass}% of class)</span>
                  <button
                    onClick={() => {
                      setSelectedMisconception(item.name);
                      setIsAssignModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#006096] text-white text-[11px] font-bold hover:bg-[#007abc]"
                  >
                    Assign Remediation
                  </button>
                </div>
              </div>
              <div className="w-full bg-[#e5eeff] h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${item.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${item.pctClass}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Roster & Live Status Table */}
      <div className="bg-white rounded-2xl border border-[#bfc7d2]/40 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#bfc7d2]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline-sm text-base font-bold text-[#0b1c30]">
              Student Roster & Diagnostic Telemetry
            </h3>
            <p className="text-xs text-[#3f4851]">Individual performance and current priority cognitive traps</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#707882]" />
            <input
              type="text"
              placeholder="Search by student or trap..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#bfc7d2]/60 focus:outline-none focus:ring-1 focus:ring-[#006096] text-[#0b1c30]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#eff4ff]/60 border-b border-[#bfc7d2]/30 text-[#3f4851] font-semibold">
              <tr>
                <th className="py-3 px-5">Student Name</th>
                <th className="py-3 px-4">Mastery P-Score</th>
                <th className="py-3 px-4">Diagnostic Status</th>
                <th className="py-3 px-4">Primary Cognitive Trap</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfc7d2]/20 text-[#0b1c30]">
              {filteredRoster.map((s) => (
                <tr key={s.id} className="hover:bg-[#f8f9ff]/80 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="font-bold block text-[#0b1c30]">{s.name}</span>
                    <span className="text-[11px] text-[#707882]">{s.email}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#006096]">
                    {s.mastery}%
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'Accelerated' ? 'bg-emerald-100 text-emerald-800' :
                      s.status === 'On Track' ? 'bg-blue-100 text-[#006096]' : 'bg-red-100 text-red-900'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#3f4851]">
                    {s.primaryTrap}
                  </td>
                  <td className="py-3.5 px-4 text-[#707882]">{s.lastActive}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => onNavigate('practice-and-quiz')}
                      className="text-[#006096] hover:underline font-bold text-xs"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#bfc7d2]/40 overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 bg-gradient-to-r from-[#006096] to-[#007abc] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Dispatch Targeted Adaptive Quiz</h3>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-white hover:opacity-80">✕</button>
            </div>

            {assignmentSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-[#0b1c30] text-sm">{assignmentSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handleDispatchAssignment} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#0b1c30] mb-1">Target Misconception Module</label>
                  <select
                    value={selectedMisconception}
                    onChange={(e) => setSelectedMisconception(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#bfc7d2]/70 text-[#0b1c30]"
                  >
                    {stats.topMisconceptions.map((m, i) => (
                      <option key={i} value={m.name}>{m.name} ({m.topic})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0b1c30] mb-1">Target Group</label>
                  <select className="w-full p-2.5 rounded-xl border border-[#bfc7d2]/70 text-[#0b1c30]">
                    <option>All Students in Section (34 students)</option>
                    <option>Only Students with Flagged Trap</option>
                    <option>Students Below 70% Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0b1c30] mb-1">Quiz Length</label>
                  <select className="w-full p-2.5 rounded-xl border border-[#bfc7d2]/70 text-[#0b1c30]">
                    <option>5 Verified Isomorphic Problems (Quick Calibration)</option>
                    <option>10 Verified Isomorphic Problems (Deep Diagnostic)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#bfc7d2]/60 text-[#3f4851] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#006096] text-white font-bold hover:bg-[#007abc]"
                  >
                    Send to Cohort
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
