import React, { useState, useEffect } from 'react';
import { MindMapNode, QuizQuestion, ViewMode } from '../types';
import { 
  Network, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Lightbulb, 
  Code2, 
  Compass, 
  BookOpen,
  Check,
  XCircle,
  HelpCircle,
  ArrowDownRight,
  Target,
  Layers,
  ChevronRight
} from 'lucide-react';

interface MindMapViewProps {
  nodes: MindMapNode[];
  question?: QuizQuestion;
  onNavigate: (view: ViewMode) => void;
  onSelectNodeForPractice?: (node: MindMapNode) => Promise<void> | void;
  onUpdateNodeStatus?: (nodeId: string, status: MindMapNode['status']) => void;
}

export const MindMapView: React.FC<MindMapViewProps> = ({
  nodes,
  question,
  onNavigate,
  onSelectNodeForPractice,
  onUpdateNodeStatus,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);

  // Default to selecting the active trap (the concept the student missed)
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      if (!selectedNodeId || !nodes.find(n => n.id === selectedNodeId)) {
        const trapNode = nodes.find(n => n.status === 'vulnerable');
        setSelectedNodeId(trapNode ? trapNode.id : nodes[0].id);
      }
    }
  }, [nodes, selectedNodeId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  const handlePracticeClick = async (nodeToPractice: MindMapNode) => {
    if (isGeneratingPractice) return;
    setIsGeneratingPractice(true);
    try {
      if (onSelectNodeForPractice) {
        await onSelectNodeForPractice(nodeToPractice);
      } else {
        onNavigate('practice-and-quiz');
      }
    } catch (e) {
      console.error('Practice launch error:', e);
      onNavigate('practice-and-quiz');
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  const primaryMisconception = question?.detectedMisconceptions?.[0];
  const correctOption = question?.options?.find(o => o.isCorrect);
  const trapOption = question?.options?.find(o => !o.isCorrect && (o.misconceptionTrigger || o.rationale));

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#bfc7d2]/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#006096]">
              {question?.subject || selectedNode?.subject || 'STEM'} • Concept Masterclass
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] mt-1">
            Understanding: {question?.topic || selectedNode?.label || 'Your Learning Topic'}
          </h1>
          <p className="text-xs sm:text-sm text-[#3f4851] mt-1.5 max-w-3xl">
            A step-by-step breakdown of the exact concept you missed, why the mistake happens, and the golden rule to solve it correctly every time.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => selectedNode && handlePracticeClick(selectedNode)}
          disabled={isGeneratingPractice}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#006096] hover:bg-[#007abc] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg shrink-0 ${
            isGeneratingPractice ? 'opacity-80 cursor-wait' : ''
          }`}
        >
          {isGeneratingPractice ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
              <span>Generating Targeted Practice with AI...</span>
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              <span>Practice This Concept Now</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 2. Diagnostic Breakdown of The Question You Missed */}
      {question && (
        <div className="rounded-3xl border border-[#bfc7d2]/50 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#bfc7d2]/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0b1c30]">
                Diagnostic Breakdown: The Question You Answered
              </h2>
            </div>
            <span className="text-xs font-medium text-[#707882] bg-[#f8f9ff] px-3 py-1 rounded-full border border-[#bfc7d2]/30">
              {question.code || 'UPLOAD-DIAGNOSTIC'}
            </span>
          </div>

          {/* Question Stem */}
          <div className="p-4 rounded-2xl bg-[#f8f9ff] border border-[#bfc7d2]/30">
            <span className="text-[11px] font-bold text-[#707882] uppercase tracking-wider block mb-1">
              Original Question
            </span>
            <p className="text-sm sm:text-base font-semibold text-[#0b1c30] leading-relaxed">
              {question.sourceQuestion || question.stem}
            </p>
            {question.mathNotation && (
              <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-[#bfc7d2]/30 font-mono text-xs text-[#006096]">
                {question.mathNotation}
              </div>
            )}
          </div>

          {/* Side-by-Side: The Mistake vs The Correct Way */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* The Trap / What was chosen */}
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>The Cognitive Trap / Common Mistake:</span>
              </div>
              <p className="text-xs font-semibold text-red-950">
                {question.uploadedAnswer && question.uploadedAnswer !== 'Not readable'
                  ? `Your uploaded answer: "${question.uploadedAnswer}"`
                  : primaryMisconception?.name || 'Calculation / Procedure Error'}
              </p>
              <p className="text-xs text-red-900/90 leading-relaxed">
                {primaryMisconception?.description || 
                 trapOption?.rationale || 
                 "Students typically trip up here by extending simple scalar intuition into operations with different precedence or domain constraints."}
              </p>
            </div>

            {/* The Correct Answer & Logical Reason */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>The Correct Solution & Method:</span>
              </div>
              <p className="text-xs font-semibold text-emerald-950">
                {correctOption ? `Answer (${correctOption.id}): ${correctOption.text}` : question.mathObjective || 'Proper algebraic rule'}
              </p>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                {correctOption?.rationale || 
                 question.socraticHint?.anchor || 
                 "Follow step-by-step operator precedence to preserve mathematical equivalence."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. The Visual Concept Flowchart (The Mind Map) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2">
              <Network className="w-5 h-5 text-[#006096]" />
              <span>Topic Concept Chain (Click a box to learn that step)</span>
            </h2>
            <p className="text-xs text-[#707882]">
              How the concepts build upon one another: from prerequisites to the trap you missed, to advanced applications.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Basics Mastered
            </span>
            <span className="flex items-center gap-1.5 text-red-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              What You Missed
            </span>
            <span className="flex items-center gap-1.5 text-[#006096] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006096]" />
              Next Step
            </span>
          </div>
        </div>

        {/* Step-by-Step Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {nodes.map((node, index) => {
            const isSelected = selectedNode?.id === node.id;
            const isTrap = node.status === 'vulnerable';
            const isMastered = node.status === 'mastered';

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`group relative p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col justify-between select-none ${
                  isSelected
                    ? 'ring-4 ring-[#006096]/30 shadow-lg scale-102 z-20 ' + 
                      (isTrap ? 'border-red-500 bg-red-50/90' : isMastered ? 'border-emerald-500 bg-emerald-50/70' : 'border-[#006096] bg-blue-50/70')
                    : 'bg-white hover:shadow-md hover:border-[#006096]/60 ' +
                      (isTrap ? 'border-red-300' : isMastered ? 'border-emerald-300' : 'border-[#bfc7d2]/60')
                }`}
              >
                <div>
                  {/* Step & Badge */}
                  <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                    <span className="text-[#707882]">STEP {index + 1}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      isTrap 
                        ? 'bg-red-100 text-red-800 animate-pulse' 
                        : isMastered 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-blue-100 text-[#006096]'
                    }`}>
                      {isTrap ? 'YOU MISSED THIS' : isMastered ? 'FOUNDATION' : 'NEXT STEP'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-[#0b1c30] leading-snug line-clamp-2">
                    {node.label}
                  </h3>

                  {/* 1-Line Preview */}
                  <p className="text-[11px] text-[#707882] mt-2 line-clamp-2 leading-relaxed">
                    {node.keyTakeaway || node.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#bfc7d2]/20 flex items-center justify-between text-[10px] font-semibold text-[#006096]">
                  <span>{isSelected ? 'Currently Viewing' : 'Click to View'}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. The Deep-Dive Lesson: "Master This Concept" */}
      {selectedNode && (
        <div className="rounded-3xl border-2 border-[#006096]/30 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header of the Selected Step */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#bfc7d2]/30 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedNode.status === 'vulnerable'
                    ? 'bg-red-100 text-red-900 border border-red-200'
                    : selectedNode.status === 'mastered'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-blue-100 text-[#006096] border border-blue-200'
                }`}>
                  {selectedNode.status === 'vulnerable' ? '⚠️ The Concept You Missed' : selectedNode.status === 'mastered' ? '✓ Mastered Prerequisite' : '🚀 Next Level Concept'}
                </span>
                <span className="text-xs font-bold text-[#707882]">
                  {selectedNode.subject} • Level {selectedNode.level}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0b1c30] mt-2">
                {selectedNode.label}
              </h2>
            </div>

            {/* Quick status toggle */}
            <div className="flex items-center gap-1.5 bg-[#f8f9ff] p-1.5 rounded-2xl border border-[#bfc7d2]/40 text-xs">
              <span className="text-[11px] font-bold text-[#707882] px-2">Mark:</span>
              <button
                onClick={() => onUpdateNodeStatus && onUpdateNodeStatus(selectedNode.id, 'mastered')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedNode.status === 'mastered'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#3f4851] hover:text-emerald-700'
                }`}
              >
                Mastered
              </button>
              <button
                onClick={() => onUpdateNodeStatus && onUpdateNodeStatus(selectedNode.id, 'vulnerable')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedNode.status === 'vulnerable'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-[#3f4851] hover:text-red-700'
                }`}
              >
                Needs Work
              </button>
            </div>
          </div>

          {/* Core Concept Explanation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#707882]">
              What This Concept Actually Means
            </h3>
            <p className="text-sm sm:text-base text-[#0b1c30] leading-relaxed bg-[#f8f9ff] p-4 rounded-2xl border border-[#bfc7d2]/30">
              {selectedNode.description}
            </p>
          </div>

          {/* Golden Rule / Mental Model */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
              <span>The Golden Rule to Remember:</span>
            </div>
            <p className="text-sm font-semibold text-amber-950 leading-relaxed pl-7">
              {selectedNode.keyTakeaway || "Always verify expressions step-by-step from first principles rather than applying mechanical shortcuts."}
            </p>
          </div>

          {/* Worked Example / Code / Math Formula Block */}
          {selectedNode.exampleOrFormula && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0b1c30]">
                <Code2 className="w-4 h-4 text-[#006096]" />
                <span>How to Solve It Correctly (Example / Code / Formula):</span>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                {selectedNode.exampleOrFormula}
              </pre>
            </div>
          )}

          {/* The Cognitive Trap Warning (if vulnerable or has common mistake) */}
          {(selectedNode.status === 'vulnerable' || selectedNode.misconceptionRisk || selectedNode.commonMistake) && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-950 text-sm">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <span>Why Students Get Confused (The Cognitive Trap):</span>
              </div>
              <p className="text-xs sm:text-sm text-red-900 leading-relaxed pl-7">
                {selectedNode.misconceptionRisk || selectedNode.commonMistake || "Students frequently mistake the syntax or assume simple rules apply without checking boundary conditions."}
              </p>
            </div>
          )}

          {/* Why This Matters / Real World Link */}
          {selectedNode.whyItMatters && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-purple-900 text-xs">
                <Compass className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Where This Concept Leads (Why You Need It):</span>
              </div>
              <p className="text-xs text-purple-950 leading-relaxed pl-6">
                {selectedNode.whyItMatters}
              </p>
            </div>
          )}

          {/* Action Button: Test My Understanding */}
          <div className="pt-4 border-t border-[#bfc7d2]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-[#707882]">
              Ready to test if you've mastered this concept?
            </span>
            <button
              onClick={() => selectedNode && handlePracticeClick(selectedNode)}
              disabled={isGeneratingPractice}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#006096] hover:bg-[#007abc] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg ${
                isGeneratingPractice ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {isGeneratingPractice ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>Generating Targeted Practice with AI Agents...</span>
                </>
              ) : (
                <>
                  <span>I Understand It Now — Test Me On This Concept</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
