import React from 'react';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.22-.2-1.75H12v3.45h5.37c-.11.86-.73 2.15-2.1 3.02l-.02.12 3.05 2.36.21.02c1.94-1.79 2.84-4.42 2.84-7.22Z" />
    <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.07-2.38c-.82.57-1.92.97-3.38.97a5.85 5.85 0 0 1-5.52-4.04l-.11.01-3.18 2.45-.04.11A9.75 9.75 0 0 0 12 21.7Z" />
    <path fill="#FBBC05" d="M6.48 13.89A5.93 5.93 0 0 1 6.17 12c0-.66.12-1.3.3-1.89v-.13L3.25 7.5l-.1.05A9.74 9.74 0 0 0 2.3 12c0 1.61.39 3.13.85 4.45l3.33-2.56Z" />
    <path fill="#EA4335" d="M12 6.06c1.84 0 3.08.8 3.79 1.46l2.77-2.7C16.83 3.2 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.85 5.25l3.32 2.57A5.87 5.87 0 0 1 12 6.06Z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentUser, onUpdateUser }) => {
  if (!isOpen) return null;

  const handleGoogleContinue = () => { window.location.assign('/api/auth/google'); };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041426]/60 p-4 backdrop-blur-md">
    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/40 bg-white shadow-2xl shadow-black/30">
      <button onClick={onClose} aria-label="Close sign in" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button>
      <div className="px-7 pb-7 pt-8 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#006096] to-[#00a6c7] text-white shadow-lg shadow-cyan-700/20"><Sparkles className="h-5 w-5" /></div>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-[#0b1c30]">Continue to Cogni<span className="text-[#007abc]">Fix</span></h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">A self-paced learning space for students.</p>
        <button onClick={handleGoogleContinue} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[.99]"><GoogleMark />Continue with Google</button>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Student-only, self-paced access</div>
      </div>
    </div>
  </div>;
};
