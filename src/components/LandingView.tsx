import React from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, Layers, Network, ShieldCheck, Sparkles } from 'lucide-react';

interface LandingViewProps {
  onOpenAuth: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onOpenAuth }) => (
  <div className="landing-page overflow-x-hidden bg-[#071a32] text-white">
    <section className="relative isolate min-h-[calc(100vh-4.5rem)] overflow-hidden">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-grid absolute inset-0 opacity-40" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-100 backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-cyan-300" />Evidence-led learning for STEM</div>
          <h1 className="animate-rise animation-delay-100 mt-7 font-display-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">Find the reason behind every wrong answer.</h1>
          <p className="animate-rise animation-delay-200 mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">CogniFix turns practice into clarity. Diagnose misconceptions, build a personal learning path, and reinforce understanding before small gaps become big ones.</p>
          <div className="animate-rise animation-delay-300 mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={onOpenAuth} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-[#06213a] shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300">Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button><a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">How it works</a></div>
          <div className="animate-rise animation-delay-400 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-300"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" />Personal workspace</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" />No preloaded learner data</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" />Start at your pace</span></div>
        </div>
        <div className="animate-float absolute bottom-10 right-6 hidden w-[21rem] rounded-3xl border border-white/15 bg-[#0c2949]/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:block"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300"><BrainCircuit className="h-5 w-5" /></div><div><p className="text-sm font-bold">Your learning space</p><p className="text-xs text-slate-400">Ready when you are</p></div></div><div className="mt-5 space-y-3"><div className="h-2 rounded-full bg-white/10"><div className="h-2 w-2/3 rounded-full bg-cyan-400" /></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 w-1/2 rounded-full bg-indigo-400" /></div><div className="h-2 rounded-full bg-white/10"><div className="h-2 w-3/4 rounded-full bg-violet-400" /></div></div></div>
      </div>
    </section>
    <section id="how-it-works" className="bg-white px-5 py-20 text-[#0b1c30] sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007abc]">A focused learning loop</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">A calmer path from uncertainty to mastery.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[{ icon: BrainCircuit, title: 'Diagnose', text: 'Identify the idea to revisit—not merely the answer that missed.' }, { icon: Network, title: 'Connect', text: 'See concepts in context and understand the next useful step.' }, { icon: Layers, title: 'Retain', text: 'Return to important ideas at the right time with focused practice.' }].map(({ icon: Icon, title, text }, index) => <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><span className="text-xs font-bold text-[#007abc]">0{index + 1}</span><div className="mt-6 grid h-11 w-11 place-items-center rounded-xl bg-[#e5eeff] text-[#006096]"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div><div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#eaf5ff] p-7 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-[#006096]"><ShieldCheck className="h-5 w-5" />Built around your work</div><p className="mt-1 text-sm text-slate-600">Create an account to start with a fresh, private workspace.</p></div><button onClick={onOpenAuth} className="shrink-0 rounded-xl bg-[#006096] px-5 py-3 text-sm font-bold text-white hover:bg-[#007abc]">Create your workspace</button></div></div></section>
  </div>
);
