import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  Shield,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
} from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentTabTitle: string;
  user: {
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
  };
  sheetConnected: boolean;
  spreadsheetTitle?: string;
  onOpenSheetSettings: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
  onToggleMobileSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onQuickNewProduct: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTabTitle,
  user,
  sheetConnected,
  spreadsheetTitle,
  onOpenSheetSettings,
  onRefreshData,
  isRefreshing,
  onLogout,
  onToggleMobileSidebar,
  isDarkMode,
  onToggleDarkMode,
  onQuickNewProduct,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="shrink-0 sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {currentTabTitle}
          </h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            Central Organization Price Database & Management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Google Sheet Sync Indicator */}
        <button
          onClick={onOpenSheetSettings}
          className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="max-w-[140px] truncate">
            {sheetConnected ? (spreadsheetTitle || 'Google Sheets Synced') : 'Spreadsheet Setup'}
          </span>
          <span className={`h-2 w-2 rounded-full ${sheetConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </button>

        {/* Sync/Refresh Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          title="Refresh latest data"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>

        {/* Quick Add Product Button */}
        <button
          onClick={onQuickNewProduct}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Product</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-full border border-slate-200 p-1 text-left transition hover:ring-2 hover:ring-emerald-500/20 dark:border-slate-800 cursor-pointer"
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden text-xs sm:block pr-2">
              <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                {user.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
                <span className="capitalize">{user.role}</span>
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in zoom-in-95 duration-150"
              onClick={() => setShowUserMenu(false)}
            >
              <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                <span className="mt-1.5 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {user.role} Access
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
