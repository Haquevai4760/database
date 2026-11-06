import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Wrench,
} from 'lucide-react';
import { SheetConfigStatus } from '../../types';
import { api } from '../../lib/api';

interface SpreadsheetSettingsModalProps {
  status: SheetConfigStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const SpreadsheetSettingsModal: React.FC<SpreadsheetSettingsModalProps> = ({
  status,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [spreadsheetInput, setSpreadsheetInput] = useState(status?.spreadsheetId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetInput.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await api.configureSpreadsheet(spreadsheetInput.trim());
      setMessage({
        type: 'success',
        text: `Successfully connected to "${res.spreadsheetTitle}"! Verified sheets: ${res.sheetsFound.length}`,
      });
      onRefresh();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to connect to Google Spreadsheet.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = async () => {
    const confirmCreate = window.confirm(
      'Create a brand new Google Spreadsheet with all 9 sheets initialized in your Google Drive?'
    );
    if (!confirmCreate) return;

    setIsCreatingNew(true);
    setMessage(null);

    try {
      const res = await api.createNewSpreadsheet('Price Database Management System Central Database');
      setSpreadsheetInput(res.spreadsheetId);
      setMessage({
        type: 'success',
        text: `New spreadsheet created! ID: ${res.spreadsheetId}`,
      });
      onRefresh();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Failed to create new spreadsheet: ${err.message}`,
      });
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleInitializeMissing = async () => {
    setIsInitializing(true);
    setMessage(null);

    try {
      const res = await api.initializeMissingSheets();
      setMessage({
        type: 'success',
        text: res.message || 'Sheets initialized successfully.',
      });
      onRefresh();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Initialization failed: ${err.message}`,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const ALL_REQUIRED_SHEETS = [
    'User Access',
    'Price Database',
    'Price History',
    'Quotation',
    'CS Rate',
    'Delivery',
    'Chalan',
    'Bill',
    'Activity Log',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Central Google Spreadsheet Connection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure server-side Google Sheets API integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status banner */}
        <div className="my-5 rounded-xl border p-4 text-xs">
          {status?.connected ? (
            <div className="flex items-start gap-3 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Spreadsheet Connected & Synced</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Connected to: <strong>{status.spreadsheetTitle || 'Central Spreadsheet'}</strong>
                </p>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ID: {status.spreadsheetId}
                </p>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${status.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Resilient Local Cache Active</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {status?.message || 'Connect an existing Google Spreadsheet or create a new one below to sync live.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message notification */}
        {message && (
          <div
            className={`mb-5 p-3.5 rounded-xl text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form: Connect Existing Spreadsheet */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Google Spreadsheet ID or URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={spreadsheetInput}
                onChange={(e) => setSpreadsheetInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={isSaving || !spreadsheetInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect & Verify'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Paste either the full URL or the ID from your browser address bar.
            </p>
          </div>
        </form>

        {/* Or: 1-Click Create New Spreadsheet */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Don't have a configured spreadsheet yet?
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Create a brand new central spreadsheet in your Google Drive with all 9 sheets and exact column headers pre-built.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={isCreatingNew}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer transition disabled:opacity-50"
          >
            {isCreatingNew ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlusCircle className="h-3.5 w-3.5" />
            )}
            <span>Create 9-Sheet Database</span>
          </button>
        </div>

        {/* Required 9 Sheets Status List */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Required Sheet Schema (9 Sheets)
            </h4>
            {status?.missingSheets && status.missingSheets.length > 0 && status.connected && (
              <button
                type="button"
                onClick={handleInitializeMissing}
                disabled={isInitializing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
              >
                {isInitializing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                <span>Auto-Initialize Missing ({status.missingSheets.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_REQUIRED_SHEETS.map((sheet) => {
              const isFound = status?.sheetsFound?.includes(sheet);
              return (
                <div
                  key={sheet}
                  className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                    isFound
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400'
                  }`}
                >
                  <span className="font-medium truncate">{sheet}</span>
                  {isFound ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Missing</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Security guarantee note */}
        <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Security Architecture:</strong> Spreadsheet credentials and write tokens remain strictly server-side. Employees access product information through the web app only and never receive direct spreadsheet link access.
          </p>
        </div>
      </div>
    </div>
  );
};
