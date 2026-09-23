import React, { useState, useEffect } from 'react';
import { ViewMode, QuizQuestion, QuizOption } from '../types';
import { 
  Sparkles, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Lightbulb, 
  Send, 
  RefreshCw, 
  Pause, 
  Play, 
  Maximize2, 
  Network,
  Cpu,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';

interface PracticeQuizViewProps {
  question: QuizQuestion;
  onNavigate: (view: ViewMode) => void;
  onQuestionCompleted?: (isCorrect: boolean, errorTag?: string) => void;
  onQuestionChanged?: (question: QuizQuestion) => void;
}

export const PracticeQuizView: React.FC<PracticeQuizViewProps> = ({
  question,
  onNavigate,
  onQuestionCompleted,
  onQuestionChanged
}) => {
  const [currentQ, setCurrentQ] = useState<QuizQuestion>(question);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [studentReasoning, setStudentReasoning] = useState('');
  const [confidence, setConfidence] = useState<'High' | 'Med' | 'Low'>('High');
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(252); // 4m 12s
  const [showHint, setShowHint] = useState(false);
  const [flagForEngine, setFlagForEngine] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);

  // Analysis / Diagnosis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any | null>(null);

  // Remediation states
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);
  const [verificationData, setVerificationData] = useState<any | null>(null);

  // Socratic Q&A Drawer
  const [isSocraticOpen, setIsSocraticOpen] = useState(false);
  const [socraticEpiphany, setSocraticEpiphany] = useState<any | null>(null);
  const [isLoadingSocratic, setIsLoadingSocratic] = useState(false);

  useEffect(() => {
    setCurrentQ(question);
    setSelectedOption(null);
    setSubmitted(false);
    setDiagnosisResult(null);
    setVerificationData(null);
    setShowHint(false);
  }, [question]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Submit Answer & Trigger Diagnoser Agent
  const handleSubmitAndAnalyze = async () => {
    if (!selectedOption) return;
    setIsAnalyzing(true);
    setSubmitted(true);

    const chosen = currentQ.options.find(
      (o, idx) => (o.id || ['A', 'B', 'C', 'D'][idx]) === selectedOption
    );
    const isCorrect = chosen?.isCorrect ?? false;

    try {
      const res = await fetch('/api/agents/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionStem: currentQ.stem,
          selectedOptionText: chosen?.text,
          isCorrect,
          studentReasoning,
          topic: currentQ.topic,
          mathNotation: currentQ.mathNotation
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDiagnosisResult(data);
      }
    } catch (err) {
      console.warn('API error, falling back locally:', err);
    } finally {
      setIsAnalyzing(false);
      if (onQuestionCompleted) {
        onQuestionCompleted(isCorrect, chosen?.errorTag);
      }
    }
  };

  // Trigger Generator & Verifier Agent for a new targeted problem
  const handleGenerateRemediation = async (misconceptionName: string) => {
    setIsGeneratingRemediation(true);
    try {
      const res = await fetch('/api/agents/generate-remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          misconception: misconceptionName,
          topic: currentQ.topic,
          difficulty: 'Isomorphic Rigor'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.problem) {
          const optionLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
          const normalizedOptions: QuizOption[] = (
            Array.isArray(data.problem.options) ? data.problem.options : []
          ).map((opt: any, idx: number) => ({
            id: (opt.id && ['A', 'B', 'C', 'D'].includes(opt.id)
              ? opt.id
              : optionLetters[idx] || 'A') as 'A' | 'B' | 'C' | 'D',
            text: String(opt.text || opt.choice || opt.stem || '').trim(),
            isCorrect: Boolean(opt.isCorrect),
            rationale: opt.rationale || '',
            misconceptionTrigger: opt.misconceptionTrigger || undefined,
            errorTag: opt.errorTag || undefined,
          }));

          if (!normalizedOptions.some((o) => o.isCorrect) && normalizedOptions.length > 0) {
            normalizedOptions[0].isCorrect = true;
          }

          const newQ: QuizQuestion = {
            id: 'rem_' + Math.floor(Math.random() * 10000),
            subject: currentQ.subject,
            topic: currentQ.topic,
            code: currentQ.code + '-REM',
            questionNumber: currentQ.questionNumber + 1,
            totalQuestions: currentQ.totalQuestions,
            stem: data.problem.stem,
            mathNotation: data.problem.mathNotation,
            mathObjective: 'Targeted Remediation Problem',
            theoremDomain: data.problem.theoremDomain,
            options: normalizedOptions,
            socraticHint: data.problem.socraticHint || currentQ.socraticHint,
            detectedMisconceptions: [
              {
                name: misconceptionName,
                errorTag: 'Active Probe',
                description: 'Verifying whether candidate has overcome the cognitive bug.',
                historicalFrequency: '72% post-remediation clearance',
                status: 'Verification Probe',
                triggerOption: 'A'
              }
            ],
            knowledgeTree: currentQ.knowledgeTree
          };

          setCurrentQ(newQ);
          onQuestionChanged?.(newQ);
          setSelectedOption(null);
          setStudentReasoning('');
          setSubmitted(false);
          setDiagnosisResult(null);
          setSocraticEpiphany(null);
          setShowHint(false);
          setVerificationData(data.problem.verificationCertificate);
        }
      }
    } catch (e) {
      console.warn('Remediation generation failed:', e);
    } finally {
      setIsGeneratingRemediation(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQ.questionNumber >= currentQ.totalQuestions) {
      onNavigate('dashboard');
      return;
    }
    const focus = currentQ.detectedMisconceptions[0]?.name || `Core skills in ${currentQ.topic}`;
    void handleGenerateRemediation(focus);
  };

  // Trigger Explainer / Socratic Agent
  const handleOpenSocratic = async () => {
    setIsSocraticOpen(true);
    if (!socraticEpiphany) {
      setIsLoadingSocratic(true);
      try {
        const chosen = currentQ.options.find(
          (o, idx) => (o.id || ['A', 'B', 'C', 'D'][idx]) === selectedOption
        );
        const res = await fetch('/api/agents/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            misconception: diagnosisResult?.misconception || 'Geometric Degeneracy Bias',
            questionStem: currentQ.stem,
            studentReasoning: studentReasoning || chosen?.rationale
          })
        });
        if (res.ok) {
          const data = await res.json();
          setSocraticEpiphany(data);
        }
      } catch (e) {
        console.warn('Socratic tutor error:', e);
      } finally {
        setIsLoadingSocratic(false);
      }
    }
  };

  return (
    <div className={`min-h-screen bg-[#f8f9ff] py-6 px-4 sm:px-6 lg:px-8 transition-all ${isZenMode ? 'max-w-4xl mx-auto' : 'max-w-7xl mx-auto'}`}>
      {/* 1. Header Breadcrumbs & Session Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#bfc7d2]/30 text-xs">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#006096] hover:underline cursor-pointer" onClick={() => onNavigate('dashboard')}>
            {currentQ.subject}
          </span>
          <span className="text-[#bfc7d2]">/</span>
          <span className="font-bold text-[#0b1c30]">{currentQ.topic}</span>
          <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#006096] font-mono text-[10px] font-bold">
            {currentQ.code}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Confidence Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-[#bfc7d2]/60 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-[#3f4851]">Confidence:</span>
            {(['High', 'Med', 'Low'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setConfidence(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  confidence === lvl
                    ? 'bg-[#006096] text-white shadow-xs'
                    : 'text-[#3f4851] hover:text-[#0b1c30]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Session Timer */}
          <div className="flex items-center gap-2 bg-white border border-[#bfc7d2]/60 rounded-xl px-3 py-1 font-mono text-xs text-[#0b1c30]">
            <Clock className="w-3.5 h-3.5 text-[#006096]" />
            <span>{formatTime(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-[#707882] hover:text-[#0b1c30]"
              title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>

          {/* Zen Mode Toggle */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-1.5 rounded-xl border transition-colors ${
              isZenMode ? 'bg-[#006096] text-white border-[#006096]' : 'bg-white text-[#3f4851] border-[#bfc7d2]/60 hover:bg-[#eff4ff]'
            }`}
            title="Toggle Zen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verification Certificate Banner if problem was just synthesized */}
      {verificationData && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-3 animate-in fade-in duration-300">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <span>Verifier Agent Formal Verification Certificate: {verificationData.status}</span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                {verificationData.verifiedBy}
              </span>
            </div>
            <p className="mt-0.5 text-emerald-800">{verificationData.symbolicCheck}</p>
            <p className="text-[11px] text-emerald-700 mt-1">{verificationData.distractorIntegrity}</p>
          </div>
        </div>
      )}

      {/* 2. Main Question & Sidebar Workspace */}
      <div className={`mt-6 grid grid-cols-1 ${isZenMode ? '' : 'lg:grid-cols-12'} gap-8`}>
        {/* Left Column: Question Card & Interactive Options (7-8 cols) */}
        <div className={`${isZenMode ? 'w-full' : 'lg:col-span-8'} space-y-6`}>
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-6">
            {/* Question Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#3f4851] mb-2">
                <span className="uppercase tracking-wider text-[#006096]">
                  Question {currentQ.questionNumber.toString().padStart(2, '0')} of {currentQ.totalQuestions.toString().padStart(2, '0')}
                </span>
                <span>{Math.round((currentQ.questionNumber / currentQ.totalQuestions) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#006096] h-full rounded-full transition-all duration-300"
                  style={{ width: `${(currentQ.questionNumber / currentQ.totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Stem */}
            <div className="space-y-3">
              <h2 className="font-headline-sm text-base sm:text-lg text-[#0b1c30] font-semibold leading-relaxed">
                {currentQ.stem}
              </h2>

              {/* Math / LaTeX Box */}
              {currentQ.mathNotation && (
                <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#bfc7d2]/40 font-mono text-sm text-[#006096] flex items-center justify-between overflow-x-auto">
                  <span className="font-semibold">{currentQ.mathNotation}</span>
                  {currentQ.theoremDomain && (
                    <span className="text-[11px] text-[#3f4851] font-sans font-medium px-2 py-0.5 rounded bg-white border border-[#bfc7d2]/30">
                      {currentQ.theoremDomain}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Selectable Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const optId = (opt.id || ['A', 'B', 'C', 'D'][idx] || 'A') as 'A' | 'B' | 'C' | 'D';
                const isSelected = Boolean(selectedOption && selectedOption === optId);
                const isRevealed = submitted;
                const isCorrectOption = opt.isCorrect;
                const isTriggeredTrap = isRevealed && isSelected && !isCorrectOption && opt.misconceptionTrigger;

                let borderStyle = 'border-[#bfc7d2]/50 hover:border-[#006096]/50 bg-white';
                let textStyle = 'text-[#0b1c30]';
                let badgeStyle = 'bg-[#e5eeff] text-[#006096]';

                if (isSelected && !isRevealed) {
                  borderStyle = 'border-2 border-[#006096] bg-[#eff4ff] shadow-sm';
                  badgeStyle = 'bg-[#006096] text-white';
                }

                if (isRevealed) {
                  if (isCorrectOption) {
                    borderStyle = 'border-2 border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                    badgeStyle = 'bg-emerald-600 text-white';
                  } else if (isSelected && !isCorrectOption) {
                    borderStyle = 'border-2 border-red-500 bg-red-50/70 text-red-950';
                    badgeStyle = 'bg-red-600 text-white';
                  } else {
                    borderStyle = 'opacity-60 border-[#bfc7d2]/30 bg-white';
                  }
                }

                return (
                  <div
                    key={optId}
                    id={`opt-${optId}`}
                    onClick={() => {
                      if (!submitted) setSelectedOption(optId);
                    }}
                    className={`p-4 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all flex items-start gap-3.5 ${borderStyle}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${badgeStyle}`}>
                      {optId}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className={textStyle}>{opt.text}</p>
                      {isRevealed && (
                        <p className={`text-[11px] mt-1 ${isCorrectOption ? 'text-emerald-800 font-semibold' : 'text-red-700'}`}>
                          {opt.rationale}
                        </p>
                      )}
                      {isTriggeredTrap && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-900 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>Distractor Trap: {opt.misconceptionTrigger}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Student Reasoning Input (Diagnostic trace enrichment) */}
            {!submitted && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-[#0b1c30] flex items-center justify-between">
                  <span>Explain your reasoning (Feeds the Diagnoser Agent):</span>
                  <span className="text-[11px] text-[#707882] font-normal">Optional</span>
                </label>
                <textarea
                  rows={2}
                  value={studentReasoning}
                  onChange={(e) => setStudentReasoning(e.target.value)}
                  placeholder="I applied the spectral theorem because... / I divided infinity by infinity because..."
                  className="w-full p-3 text-xs rounded-xl border border-[#bfc7d2]/60 focus:outline-none focus:ring-1 focus:ring-[#006096] text-[#0b1c30] placeholder:text-[#707882]"
                />
              </div>
            )}

            {/* Socratic Hint Accordion */}
            <div className="border border-[#bfc7d2]/40 rounded-xl overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="w-full p-3.5 bg-[#eff4ff]/60 hover:bg-[#eff4ff] flex items-center justify-between font-semibold text-[#006096] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Socratic Epiphany Hint</span>
                </span>
                <span className="text-[11px] font-bold text-[#006096]">
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </span>
              </button>

              {showHint && (
                <div className="p-4 bg-white border-t border-[#bfc7d2]/30 space-y-2 text-xs text-[#0b1c30] animate-in fade-in duration-200">
                  <p className="leading-relaxed">{currentQ.socraticHint.question}</p>
                  <p className="font-bold text-[#006096] bg-[#eff4ff] p-2 rounded-lg text-[11px]">
                    Anchor: {currentQ.socraticHint.anchor}
                  </p>
                </div>
              )}
            </div>

            {/* Flag for Engine Checkbox & Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#bfc7d2]/30">
              <label className="flex items-center gap-2 text-xs text-[#3f4851] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flagForEngine}
                  onChange={(e) => setFlagForEngine(e.target.checked)}
                  className="rounded text-[#006096] focus:ring-[#006096]"
                />
                <span>Flag question for automated Misconception Engine trace</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null);
                    setSubmitted(false);
                    setDiagnosisResult(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#bfc7d2]/60 text-xs font-semibold text-[#3f4851] hover:bg-[#eff4ff]"
                >
                  Reset
                </button>

                {!submitted ? (
                  <button
                    type="button"
                    id="practice-submit-btn"
                    disabled={!selectedOption || isAnalyzing}
                    onClick={handleSubmitAndAnalyze}
                    className="px-6 py-2.5 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Diagnosing Thought Trace...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit & Analyze</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenSocratic}
                      className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask Socratic Tutor</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      disabled={isGeneratingRemediation}
                      className="px-5 py-2 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] disabled:opacity-60 transition-all shadow-sm flex items-center gap-2"
                    >
                      {isGeneratingRemediation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>{currentQ.questionNumber >= currentQ.totalQuestions ? 'Finish practice' : 'Next question'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cognitive Diagnostics Rail (4 cols) */}
        {!isZenMode && (
          <div className="lg:col-span-4 space-y-6">
            {/* Live Cognitive Metrics Widget */}
            <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#bfc7d2]/30 pb-3">
                <h3 className="font-headline-sm text-sm font-bold text-[#0b1c30]">
                  Cognitive Diagnostics
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Telemetry Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#bfc7d2]/30">
                  <span className="text-[11px] text-[#3f4851] block">Accuracy</span>
                  <span className="text-xl font-extrabold text-[#006096]">8/10</span>
                </div>
                <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#bfc7d2]/30">
                  <span className="text-[11px] text-[#3f4851] block">Recall Latency</span>
                  <span className="text-xl font-extrabold text-[#0b1c30]">1.4s</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
                <span>Estimated Cognitive Load:</span>
                <span className="font-bold text-amber-900">Moderate High</span>
              </div>
            </div>

            {/* Diagnoser Agent Live Output / Detected Misconceptions */}
            <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#006096]" />
                  <h3 className="font-headline-sm text-sm font-bold text-[#0b1c30]">
                    Misconception Radar
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#006096] bg-[#eff4ff] px-1.5 py-0.5 rounded font-bold">
                  2 Traps Codified
                </span>
              </div>

              {/* Dynamic Live Diagnosis Result if submitted */}
              {diagnosisResult && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#eff4ff] to-[#e5eeff] border border-[#006096]/30 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-[#006096]">
                    <span>Agent Diagnosis</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${diagnosisResult.misconception === 'None' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {diagnosisResult.misconception === 'None' ? 'Correct' : diagnosisResult.errorTag || 'Err: Detected'}
                    </span>
                  </div>
                  <p className="font-bold text-[#0b1c30]">{diagnosisResult.misconception}</p>
                  <p className="text-[11px] text-[#3f4851] leading-relaxed">
                    {diagnosisResult.rootCause || diagnosisResult.analysis}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleGenerateRemediation(diagnosisResult.misconception)}
                    disabled={isGeneratingRemediation}
                    className="w-full mt-2 py-2 rounded-lg bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isGeneratingRemediation ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Solution Proof...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Generate Remediation Problem</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Codified Traps for current question */}
              <div className="space-y-3">
                {currentQ.detectedMisconceptions.map((disc, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#bfc7d2]/40 bg-[#f8f9ff] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0b1c30]">{disc.name}</span>
                      <span className="text-[10px] font-mono text-red-600 bg-red-50 border border-red-200 px-1.5 rounded">
                        {disc.errorTag}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3f4851] leading-relaxed">{disc.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#707882] pt-1">
                      <span>Frequency: {disc.historicalFrequency}</span>
                      <span className="font-semibold text-emerald-700">{disc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Tree Linkage */}
            <div className="bg-white p-5 rounded-2xl border border-[#bfc7d2]/40 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0b1c30]">
                <Network className="w-4 h-4 text-[#006096]" />
                <span>Knowledge Tree Linkage</span>
              </div>
              <div className="p-3 rounded-xl bg-[#eff4ff] text-xs space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#006096]">
                  {currentQ.knowledgeTree.nodeId}
                </span>
                <p className="font-bold text-[#0b1c30]">{currentQ.knowledgeTree.title}</p>
                <p className="text-[11px] text-[#3f4851]">{currentQ.knowledgeTree.relationship}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('mind-map')}
                className="w-full py-1.5 rounded-lg border border-[#bfc7d2]/60 text-xs font-semibold text-[#006096] hover:bg-[#eff4ff] transition-colors flex items-center justify-center gap-1"
              >
                <span>Inspect in Knowledge Graph</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Socratic Tutor Modal / Drawer */}
      {isSocraticOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#bfc7d2]/40 overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-gradient-to-r from-[#006096] to-[#007abc] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Socratic Epiphany Tutor</h3>
              </div>
              <button
                onClick={() => setIsSocraticOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {isLoadingSocratic ? (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#006096]" />
                  <p className="text-[#3f4851] font-medium">Formulating Socratic counter-inquiry...</p>
                </div>
              ) : socraticEpiphany ? (
                <div className="space-y-4 text-[#0b1c30]">
                  {/* Core Epiphany */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                      Core Cognitive Epiphany
                    </span>
                    <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                      {socraticEpiphany.coreEpiphany}
                    </p>
                  </div>

                  {/* Intuitive Analogy */}
                  <div className="space-y-1">
                    <span className="font-bold text-[#006096]">Intuitive Geometric Analogy:</span>
                    <p className="text-[#3f4851] leading-relaxed bg-[#eff4ff] p-3 rounded-xl border border-[#bfc7d2]/30">
                      {socraticEpiphany.intuitiveAnalogy}
                    </p>
                  </div>

                  {/* Socratic Questions */}
                  {socraticEpiphany.socraticQuestions && (
                    <div className="space-y-2">
                      <span className="font-bold text-[#0b1c30]">Contemplate these questions:</span>
                      {socraticEpiphany.socraticQuestions.map((q: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f8f9ff] border border-[#bfc7d2]/30">
                          <span className="w-4 h-4 rounded-full bg-[#006096] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs text-[#0b1c30]">{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Axiomatic Rule */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-mono text-[11px]">
                    <strong>Canonical Law:</strong> {socraticEpiphany.axiomaticRule}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-[#eff4ff]/60 border-t border-[#bfc7d2]/30 flex justify-end">
              <button
                onClick={() => setIsSocraticOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#006096] text-white font-bold text-xs hover:bg-[#007abc]"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
