import React, { useState, useEffect } from 'react';
import { FlashcardItem, ViewMode } from '../types';
import { 
  Layers, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  BookOpen
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: FlashcardItem[];
  onNavigate: (view: ViewMode) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ flashcards, onNavigate }) => {
  const [cards, setCards] = useState<FlashcardItem[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string>('All');

  // Sync internal cards state when parent passes new/updated flashcards (e.g. from AI generation)
  useEffect(() => {
    if (flashcards.length > 0) {
      setCards(flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [flashcards]);

  const subjects = ['All', 'Calculus', 'Linear Algebra', 'Physics'];

  const filteredCards = activeSubject === 'All' 
    ? cards 
    : cards.filter(c => c.subject.toLowerCase().includes(activeSubject.toLowerCase()));

  const activeCard = filteredCards[currentIndex] || cards[0];

  if (!activeCard) {
    return <div className="min-h-screen bg-[#f8f9ff] px-4 py-16 sm:px-6"><div className="mx-auto max-w-xl rounded-2xl border border-[#bfc7d2]/40 bg-white p-8 text-center shadow-xs"><Layers className="mx-auto h-9 w-9 text-[#006096]" /><h1 className="mt-4 text-xl font-bold text-[#0b1c30]">Your flashcard space is ready</h1><p className="mt-2 text-sm leading-6 text-[#3f4851]">Complete practice to build a personal review deck.</p><button onClick={() => onNavigate('practice-and-quiz')} className="mt-6 rounded-xl bg-[#006096] px-5 py-3 text-xs font-bold text-white">Start practice</button></div></div>;
  }

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const markStatus = (status: 'known' | 'learning') => {
    if (!activeCard) return;
    setCards(prev => prev.map(c => c.id === activeCard.id ? { 
      ...c, 
      status, 
      decayLevel: status === 'known' ? 'Optimal' : 'Critical',
      nextReview: status === 'known' ? '6d' : '12h'
    } : c));
    handleNext();
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#bfc7d2]/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="font-headline-sm text-xl font-bold text-[#0b1c30]">
              Spaced Retention Studio
            </h1>
          </div>
          <p className="text-xs text-[#3f4851] mt-1">
            Strengthening STEM mental models at calculated memory decay intervals
          </p>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white border border-[#bfc7d2]/50 p-1 rounded-xl text-xs font-semibold">
          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => {
                setActiveSubject(sub);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeSubject === sub 
                  ? 'bg-[#006096] text-white shadow-xs' 
                  : 'text-[#3f4851] hover:text-[#0b1c30]'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Main Flashcard Arena */}
      {activeCard ? (
        <div className="space-y-6">
          {/* Card Meta Indicator */}
          <div className="flex items-center justify-between text-xs text-[#3f4851]">
            <span className="font-semibold text-[#006096]">
              Card {currentIndex + 1} of {filteredCards.length} • {activeCard.topic}
            </span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeCard.decayLevel === 'Critical' ? 'bg-red-100 text-red-900' :
                activeCard.decayLevel === 'Stable' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {activeCard.decayLevel} Recall Decay
              </span>
              <span className="text-[11px] font-mono">Next: {activeCard.nextReview}</span>
            </div>
          </div>

          {/* Interactive Flip Card Container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[340px] bg-white rounded-3xl border-2 border-[#006096]/20 shadow-md p-8 sm:p-10 cursor-pointer hover:border-[#006096]/40 transition-all flex flex-col justify-between relative group select-none"
          >
            {/* Flip hint chip */}
            <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-semibold text-[#006096] bg-[#eff4ff] px-2.5 py-1 rounded-full group-hover:bg-[#e5eeff]">
              <RotateCw className="w-3 h-3" />
              <span>{isFlipped ? 'Click to show question' : 'Click to flip for proof'}</span>
            </div>

            {/* Front vs Back Content */}
            {!isFlipped ? (
              <div className="space-y-6 my-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-[#006096] bg-[#eff4ff] px-2.5 py-1 rounded-md">
                  Cognitive Probe
                </span>
                <h2 className="font-headline-sm text-xl sm:text-2xl text-[#0b1c30] font-bold leading-relaxed">
                  {activeCard.frontQuestion}
                </h2>
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-red-900">Cognitive Trap Warning:</strong>
                    <span>{activeCard.trapWarning}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 my-auto animate-in fade-in duration-200">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                  Axiomatic Intuition & Proof
                </span>
                <p className="text-xs sm:text-sm text-[#0b1c30] leading-relaxed">
                  {activeCard.backIntuition}
                </p>
                <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#bfc7d2]/40 font-mono text-xs text-[#006096]">
                  <strong className="font-sans block text-[11px] uppercase tracking-wide text-[#3f4851] mb-1">
                    Formal Proof / Mathematical Law:
                  </strong>
                  {activeCard.mathematicalProof}
                </div>
              </div>
            )}

            {/* Bottom prompt */}
            <div className="text-center text-[11px] text-[#707882] border-t border-[#bfc7d2]/20 pt-4 mt-4">
              Tap anywhere to flip card
            </div>
          </div>

          {/* Action Ratings & Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl border border-[#bfc7d2]/60 hover:bg-[#eff4ff] text-[#3f4851]"
                title="Previous card"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl border border-[#bfc7d2]/60 hover:bg-[#eff4ff] text-[#3f4851]"
                title="Next card"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rating buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => markStatus('learning')}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Needs Re-Queue (12h)</span>
              </button>
              <button
                onClick={() => markStatus('known')}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#006096] hover:bg-[#007abc] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Mastered (6d Half-Life)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#bfc7d2]/40 p-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="font-headline-sm text-lg font-bold text-[#0b1c30]">All Due Flashcards Reviewed!</h3>
          <p className="text-xs text-[#3f4851]">You have reinforced all pending STEM cognitive anchors for today.</p>
          <button
            onClick={() => onNavigate('practice-and-quiz')}
            className="px-5 py-2.5 rounded-xl bg-[#006096] text-white text-xs font-bold"
          >
            Return to Diagnostic Sandbox
          </button>
        </div>
      )}
    </div>
  );
};
