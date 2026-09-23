import React from 'react';
import { ViewMode } from '../types';
import { Sparkles, ShieldCheck, Cpu, BookOpen, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-[#bfc7d2]/30 bg-[#eff4ff]/60 py-10 px-4 sm:px-6 lg:px-8 text-xs text-[#3f4851]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & info */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#006096] flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-[#0b1c30]">CogniFix</span>
          </div>
          <span className="hidden sm:inline text-[#bfc7d2]">•</span>
          <p className="text-[11px] text-[#3f4851]">
            Multi-Agent Cognitive Remediation Engine for STEM Concepts & Rigorous Proofs.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium">
          <button 
            onClick={() => onNavigate('landing')} 
            className="hover:text-[#006096] transition-colors"
          >
            System Architecture
          </button>
          <button 
            onClick={() => onNavigate('practice-and-quiz')} 
            className="hover:text-[#006096] transition-colors"
          >
            Diagnostic Sandbox
          </button>
          <button 
            onClick={() => onNavigate('roadmap')} 
            className="hover:text-[#006096] transition-colors"
          >
            Adaptive Roadmap
          </button>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-300/60 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Formal Verification Solver Active</span>
        </div>
      </div>
    </footer>
  );
};
