import React, { useState, useEffect } from 'react';
import { RoadmapStep, RoadmapResource, SavedRoadmap, ViewMode } from '../types';
import { 
  Map, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Search, 
  Sparkles, 
  Video, 
  FileText, 
  RefreshCw, 
  ArrowRight,
  Plus,
  History,
  Trash2,
  Code2,
  CheckSquare,
  Square,
  BookOpen,
  ChevronRight,
  Layers,
  Sparkle,
  Compass,
  Check
} from 'lucide-react';

interface RoadmapViewProps {
  steps?: RoadmapStep[];
  onNavigate: (view: ViewMode) => void;
  userId?: string;
  accessToken?: string | null;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ 
  steps: initialSteps = [], 
  onNavigate,
  userId = 'default_user',
  accessToken = null
}) => {
  const storageKey = `cognifix_roadmaps_${userId}`;

  // State: List of all saved roadmaps
  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved roadmaps:', e);
    }
    return [];
  });

  // State: Active roadmap ID
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return null;
  });

  // User input states
  const [skillInput, setSkillInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isNewRoadmapModalOpen, setIsNewRoadmapModalOpen] = useState(false);

  // Ad-hoc DuckDuckGo live search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Persist roadmaps to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(roadmaps));
    } catch (e) {
      console.warn('Failed to persist roadmaps to localStorage:', e);
    }
  }, [roadmaps, storageKey]);

  // Sync with Supabase on mount if authenticated
  useEffect(() => {
    if (!accessToken) return;
    const fetchSupabaseRoadmaps = async () => {
      try {
        const res = await fetch('/api/roadmaps', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roadmaps) && data.roadmaps.length > 0) {
            setRoadmaps(prev => {
              const existingIds = new Set(prev.map(r => r.id));
              const newItems = data.roadmaps.filter((r: SavedRoadmap) => !existingIds.has(r.id));
              const merged = [...prev, ...newItems];
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync with Supabase roadmaps:', err);
      }
    };
    fetchSupabaseRoadmaps();
  }, [accessToken]);

  const activeRoadmap = roadmaps.find(r => r.id === activeRoadmapId) || roadmaps[0] || null;

  // Toggle individual resource completion
  const toggleResource = (stepId: string, resourceId: string) => {
    if (!activeRoadmap) return;

    setRoadmaps(prev => prev.map(rm => {
      if (rm.id !== activeRoadmap.id) return rm;

      const updatedSteps = rm.steps.map(step => {
        if (step.id !== stepId) return step;

        const updatedResources = step.resources.map(res => {
          if (res.id === resourceId) {
            return { ...res, completed: !res.completed };
          }
          return res;
        });

        // If all resources are completed, auto-mark the step as completed
        const allCompleted = updatedResources.length > 0 && updatedResources.every(r => r.completed);

        return {
          ...step,
          resources: updatedResources,
          completed: allCompleted
        };
      });

      return {
        ...rm,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  // Toggle whole step completion
  const toggleStep = (stepId: string) => {
    if (!activeRoadmap) return;

    setRoadmaps(prev => prev.map(rm => {
      if (rm.id !== activeRoadmap.id) return rm;

      const updatedSteps = rm.steps.map(step => {
        if (step.id !== stepId) return step;
        const newStatus = !step.completed;
        return {
          ...step,
          completed: newStatus,
          // Mark all resources in this step matching the new status
          resources: step.resources.map(r => ({ ...r, completed: newStatus }))
        };
      });

      return {
        ...rm,
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  // Delete a roadmap from history
  const handleDeleteRoadmap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this roadmap from history?')) return;

    setRoadmaps(prev => {
      const remaining = prev.filter(r => r.id !== id);
      if (activeRoadmapId === id) {
        setActiveRoadmapId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    if (accessToken) {
      try {
        await fetch(`/api/roadmaps/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (err) {
        console.warn('Error deleting from Supabase:', err);
      }
    }
  };

  // Generate a new roadmap for a requested skill
  const handleGenerateRoadmap = async (targetSkill?: string) => {
    const skill = (targetSkill || skillInput).trim();
    if (!skill) return;

    setIsGenerating(true);
    setGenerationStage('Decomposing skill into structured milestones...');

    try {
      setTimeout(() => {
        setGenerationStage('Searching DuckDuckGo for live videos & documentation...');
      }, 900);

      setTimeout(() => {
        setGenerationStage('Retrieving practice problems & LeetCode/HackerRank sites...');
      }, 1800);

      const res = await fetch('/api/agents/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill })
      });

      if (!res.ok) throw new Error('Roadmap generation failed');

      const data = await res.json();
      const newRoadmap: SavedRoadmap = {
        id: data.id || `rm_${Date.now()}`,
        topic: skill,
        roadmapTitle: data.roadmapTitle || `${skill} Mastery Path`,
        estimatedTotalHours: data.estimatedTotalHours || '30-40 hours',
        steps: (data.steps || []).map((st: any, i: number) => ({
          id: st.id || `step_${i + 1}`,
          stepNumber: st.stepNumber || i + 1,
          title: st.title || `Module ${i + 1}`,
          topic: st.topic || 'Core Module',
          description: st.description || '',
          completed: st.completed || false,
          timeEstimate: st.timeEstimate || '4-6 hours',
          resources: (st.resources || []).map((r: any, rIdx: number) => ({
            id: r.id || `res_${i}_${rIdx}`,
            title: r.title || 'Learning Resource',
            type: r.type || 'docs',
            url: r.url || '#',
            source: r.source || 'Web Resource',
            completed: r.completed || false
          }))
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setRoadmaps(prev => [newRoadmap, ...prev]);
      setActiveRoadmapId(newRoadmap.id);
      setSkillInput('');
      setIsNewRoadmapModalOpen(false);

      // Save to Supabase if authenticated
      if (accessToken) {
        try {
          await fetch('/api/roadmaps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(newRoadmap)
          });
        } catch (err) {
          console.warn('Could not sync newly generated roadmap to Supabase:', err);
        }
      }
    } catch (err) {
      console.error('Error generating roadmap:', err);
      alert('Could not generate roadmap. Please check your internet connection and try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  };

  // Live ad-hoc DuckDuckGo search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/agents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.warn('Search agent error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Sample prompt suggestions
  const suggestions = [
    'Python upto DSA',
    'Fullstack React & Node.js',
    'Data Structures & Algorithms in Java',
    'Machine Learning with PyTorch',
    'SQL & Database Design'
  ];

  // Helper stats for active roadmap
  const totalSteps = activeRoadmap?.steps.length || 0;
  const completedSteps = activeRoadmap?.steps.filter(s => s.completed).length || 0;
  const allResources = activeRoadmap?.steps.flatMap(s => s.resources) || [];
  const completedResources = allResources.filter(r => r.completed).length;
  const progressPercent = allResources.length > 0 
    ? Math.round((completedResources / allResources.length) * 100) 
    : (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0);

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#bfc7d2]/30 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-[#eff4ff] text-[#006096] border border-[#006096]/20">
              <Compass className="w-5 h-5 text-[#006096]" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#0b1c30]">
                AI Skill Roadmap & Learning Paths
              </h1>
              <p className="text-xs text-[#3f4851] mt-0.5">
                Decompose any skill into chunked milestones with live DuckDuckGo videos, official docs, and practice sites
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {roadmaps.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showHistory 
                  ? 'bg-[#006096] text-white border-[#006096]' 
                  : 'bg-white text-[#0b1c30] border-[#bfc7d2]/50 hover:bg-[#f1f5f9]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Roadmap History ({roadmaps.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsNewRoadmapModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Roadmap</span>
          </button>
        </div>
      </div>

      {/* History Drawer / Panel */}
      {showHistory && roadmaps.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-[#006096]/30 p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[#bfc7d2]/30 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#006096]" />
              <h2 className="text-sm font-bold text-[#0b1c30]">Your Saved Roadmaps History</h2>
            </div>
            <span className="text-xs text-[#707882]">{roadmaps.length} saved path{roadmaps.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {roadmaps.map(rm => {
              const isActive = rm.id === activeRoadmapId;
              const resTotal = rm.steps.flatMap(s => s.resources).length;
              const resDone = rm.steps.flatMap(s => s.resources).filter(r => r.completed).length;
              const pct = resTotal > 0 ? Math.round((resDone / resTotal) * 100) : 0;

              return (
                <div
                  key={rm.id}
                  onClick={() => {
                    setActiveRoadmapId(rm.id);
                    setShowHistory(false);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                    isActive
                      ? 'bg-[#eff4ff] border-[#006096] shadow-xs'
                      : 'bg-[#fcfdfe] border-[#bfc7d2]/40 hover:border-[#006096]/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0b1c30] line-clamp-1">{rm.roadmapTitle}</span>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold bg-[#006096] text-white px-2 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#707882] mt-0.5 block">
                        Skill: <span className="text-[#006096] font-semibold">{rm.topic}</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteRoadmap(rm.id, e)}
                      title="Delete roadmap"
                      className="p-1 rounded text-[#707882] hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#3f4851]">
                      <span>{rm.steps.length} milestones • {resDone}/{resTotal} resources</span>
                      <span className="font-bold text-[#006096]">{pct}% done</span>
                    </div>
                    <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#006096] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Input Hero (Visible when no active roadmap OR when "New Roadmap" modal/state is open) */}
      {(!activeRoadmap || isNewRoadmapModalOpen) && (
        <div className="bg-white rounded-3xl border border-[#bfc7d2]/50 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Live Internet Powered Learning Architect</span>
            </div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">
              What skill do you want to learn?
            </h2>
            <p className="text-xs text-[#3f4851] mt-1.5 leading-relaxed">
              Type any skill, e.g. <span className="font-bold text-[#006096]">"Python upto DSA"</span>. Our engine decomposes it into progressive small chunks (Basic Programming, OOP, DSA) and queries DuckDuckGo for authentic YouTube videos, official docs, and practice platforms.
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerateRoadmap();
            }} 
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#707882] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Enter skill to learn (e.g. 'Python upto DSA', 'React & TypeScript', 'Machine Learning')..."
                disabled={isGenerating}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-[#bfc7d2]/70 focus:outline-none focus:ring-2 focus:ring-[#006096] text-[#0b1c30] placeholder:text-[#707882] bg-[#f8f9ff]/50 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating || !skillInput.trim()}
              className="px-6 py-3 rounded-xl bg-[#006096] hover:bg-[#007abc] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Building Roadmap...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Roadmap</span>
                </>
              )}
            </button>
          </form>

          {/* Loading status ticker */}
          {isGenerating && (
            <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#006096]/20 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-4 h-4 text-[#006096] animate-spin shrink-0" />
              <div className="text-xs text-[#006096] font-semibold">
                {generationStage || 'Synthesizing customized learning path...'}
              </div>
            </div>
          )}

          {/* Quick Suggestions Chips */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-[#707882] uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setSkillInput(sug);
                    handleGenerateRoadmap(sug);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] hover:bg-[#eff4ff] hover:text-[#006096] text-xs font-medium text-[#3f4851] border border-[#bfc7d2]/30 transition-all flex items-center gap-1.5"
                >
                  <Sparkle className="w-3 h-3 text-[#006096]" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>

          {isNewRoadmapModalOpen && activeRoadmap && (
            <div className="pt-2 border-t border-[#bfc7d2]/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsNewRoadmapModalOpen(false)}
                className="text-xs text-[#707882] hover:text-[#0b1c30] font-semibold"
              >
                Cancel & return to active roadmap
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Roadmap View */}
      {activeRoadmap && !isNewRoadmapModalOpen && (
        <div className="space-y-6">
          {/* Active Roadmap Title & Progress Header */}
          <div className="bg-white p-6 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#eff4ff] text-[#006096]">
                    Active Roadmap
                  </span>
                  <span className="text-xs text-[#707882] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Total Est: {activeRoadmap.estimatedTotalHours}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#0b1c30] mt-1.5">
                  {activeRoadmap.roadmapTitle}
                </h2>
                <p className="text-xs text-[#707882]">
                  Target skill: <span className="font-semibold text-[#006096]">{activeRoadmap.topic}</span>
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-[#006096]">
                  {progressPercent}%
                </div>
                <div className="text-[11px] text-[#707882]">
                  {completedResources} of {allResources.length} resources finished
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#3f4851]">
                <span className="font-semibold">Curriculum Progression</span>
                <span>{completedSteps} of {totalSteps} Milestones Completed</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#006096] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Chunked Milestone Timeline Cards */}
          <div className="space-y-4">
            {activeRoadmap.steps.map((step, idx) => {
              const stepResources = step.resources || [];
              const stepCompletedCount = stepResources.filter(r => r.completed).length;

              return (
                <div
                  key={step.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    step.completed
                      ? 'bg-white/90 border-emerald-300/80 shadow-xs'
                      : 'bg-white border-2 border-[#006096]/20 shadow-sm'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleStep(step.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 mt-0.5 ${
                          step.completed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'border-2 border-[#006096] text-[#006096] hover:bg-[#eff4ff]'
                        }`}
                        title={step.completed ? 'Mark milestone incomplete' : 'Mark milestone completed'}
                      >
                        {step.completed ? <Check className="w-4 h-4 stroke-[3]" /> : step.stepNumber}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006096] bg-[#eff4ff] px-2 py-0.5 rounded">
                            {step.topic}
                          </span>
                          <span className="text-[11px] text-[#707882] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {step.timeEstimate}
                          </span>
                          <span className="text-[11px] text-[#707882]">
                            • {stepCompletedCount}/{stepResources.length} resources finished
                          </span>
                        </div>
                        <h3 className={`text-base font-bold ${
                          step.completed ? 'text-emerald-950 font-bold' : 'text-[#0b1c30]'
                        }`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-[#3f4851] leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleStep(step.id)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto ${
                        step.completed
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#006096]'
                      }`}
                    >
                      {step.completed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Milestone Completed</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-[#006096]" />
                          <span>Mark Milestone Done</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Grounded DuckDuckGo Resources for this milestone */}
                  {stepResources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-[#bfc7d2]/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#006096]" />
                          <span className="text-xs font-bold text-[#0b1c30]">
                            Verified Internet Resources (DuckDuckGo Live Grounding)
                          </span>
                        </div>
                        <span className="text-[11px] text-[#707882]">
                          Click checkbox to mark resource as finished
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {stepResources.map((res, rIdx) => {
                          const resId = res.id || `res_${step.id}_${rIdx}`;
                          const isDone = !!res.completed;

                          return (
                            <div
                              key={resId}
                              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                                isDone
                                  ? 'bg-emerald-50/60 border-emerald-300/80 shadow-xs'
                                  : 'bg-[#fcfdfe] border-[#bfc7d2]/40 hover:border-[#006096]/50 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Clickable Checkbox to mark resource finished */}
                                <button
                                  type="button"
                                  onClick={() => toggleResource(step.id, resId)}
                                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-[#707882] hover:border-[#006096] bg-white'
                                  }`}
                                  title={isDone ? 'Mark incomplete' : 'Mark resource finished'}
                                >
                                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {res.type === 'video' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                        <Video className="w-2.5 h-2.5" /> Video
                                      </span>
                                    ) : res.type === 'practice' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                        <Code2 className="w-2.5 h-2.5" /> Practice
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                        <FileText className="w-2.5 h-2.5" /> Docs
                                      </span>
                                    )}

                                    <span className="text-[10px] text-[#707882] truncate">
                                      {res.source}
                                    </span>
                                  </div>

                                  <h4 className={`text-xs font-semibold leading-snug line-clamp-2 ${
                                    isDone ? 'line-through text-[#707882]' : 'text-[#0b1c30]'
                                  }`}>
                                    {res.title}
                                  </h4>
                                </div>
                              </div>

                              {/* Open link action */}
                              <div className="flex items-center justify-between pt-1 border-t border-[#bfc7d2]/20 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => toggleResource(step.id, resId)}
                                  className={`font-semibold transition-colors ${
                                    isDone ? 'text-emerald-700' : 'text-[#707882] hover:text-[#0b1c30]'
                                  }`}
                                >
                                  {isDone ? '✓ Finished' : 'Mark Finished'}
                                </button>

                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-bold text-[#006096] hover:underline"
                                >
                                  <span>Open</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live DuckDuckGo Search Grounding Box */}
      <div className="bg-white p-6 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-[#006096]" />
          <div>
            <h3 className="text-sm font-bold text-[#0b1c30]">
              Instant Resource Grounding (DuckDuckGo Live Search)
            </h3>
            <p className="text-[11px] text-[#3f4851]">
              Need extra tutorials, interactive visualizers, or official documentation on any specific concept?
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any topic, e.g. 'Python list comprehensions tutorial' or 'Binary Search Tree visualizer'"
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#bfc7d2]/70 focus:outline-none focus:ring-1 focus:ring-[#006096] text-[#0b1c30]"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search Live Web</span>
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-[#006096]">Retrieved Web Results:</span>
            {searchResults.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#eff4ff] border border-[#bfc7d2]/40 text-xs flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-[#0b1c30]">{r.title}</h4>
                  <p className="text-[11px] text-[#3f4851] mt-0.5">{r.snippet}</p>
                  <span className="text-[10px] text-[#006096] font-semibold mt-1 inline-block">{r.source}</span>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-white border border-[#bfc7d2]/50 hover:bg-[#dce9ff] text-[11px] font-bold text-[#006096] shrink-0 flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
