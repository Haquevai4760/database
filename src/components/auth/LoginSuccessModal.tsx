import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

interface LoginSuccessModalProps {
  userName: string;
  userEmail: string;
  role: string;
  onFinish: () => void;
}

export const LoginSuccessModal: React.FC<LoginSuccessModalProps> = ({
  userName,
  userEmail,
  role,
  onFinish,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 400);
          return 100;
        }
        return prev + 18;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 text-center shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Animated Green Checkmark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-500/30 animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-12 w-12 stroke-[2.5]" />
        </div>

        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Login Successful
        </h3>

        {/* Bengali success message as explicitly required */}
        <p className="mt-2 text-base font-medium text-emerald-600 dark:text-emerald-400">
          লগইন সফল হয়েছে। ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...
        </p>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Connecting to organization secure workspace as{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{userEmail}</span>
        </p>

        {/* Role badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Role: {role}</span>
        </div>

        {/* Loading progress bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
              Initializing permissions & sheets
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
