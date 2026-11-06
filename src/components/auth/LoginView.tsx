import React, { useState } from 'react';
import { Database, ShieldAlert, Lock, CheckCircle, Sparkles, Building2, Layers } from 'lucide-react';
import { googleSignIn } from '../../lib/firebase';

interface LoginViewProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const authResult = await googleSignIn();
      if (!authResult) {
        throw new Error('Authentication cancelled or could not be verified.');
      }

      onLoginSuccess(authResult.user, authResult.accessToken);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      let message = err.message || 'Failed to authenticate with Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed before finishing authentication.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-4 relative overflow-hidden">
      {/* Background radial highlights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 shadow-xl shadow-emerald-500/20 mb-4 ring-1 ring-white/20">
            <Database className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Price Database System
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enterprise Quotation, Delivery & Central Google Sheets Integration
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Employee & Admin Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate with your organization-approved Google Account to access prices, quotations, and inventory tools.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Sign in with Google Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-700">
                  <div className="h-4 w-4 border-2 border-slate-400 border-t-emerald-600 rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Access Restriction Notice */}
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Restricted Access Notice</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only email addresses registered in the organization’s <strong>User Access</strong> database can log in. Direct spreadsheet editing is disabled for employee accounts for data integrity and security.
              </p>
            </div>

            {/* Modules overview pills */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Integrated Business Modules
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Price Database</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Price History Log</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Quotation Generator</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Challan & Delivery</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>CS Rate Comparison</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>Invoicing & Bills</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Super Admin: <span className="font-mono text-slate-400">nhaque4760@gmail.com</span>
        </div>
      </div>
    </div>
  );
};
