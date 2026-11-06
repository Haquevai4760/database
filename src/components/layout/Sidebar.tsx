import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  PlusSquare,
  History,
  FileSpreadsheet,
  GitCompare,
  Truck,
  FileCheck2,
  Receipt,
  Users,
  Activity,
  Settings,
  Database,
  ExternalLink,
  ChevronRight,
  Shield,
  UserCheck,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole: UserRole;
  sheetConnected: boolean;
  onOpenSheetSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  sheetConnected,
  onOpenSheetSettings,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isAdmin = userRole === 'Admin';

  const navItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'input-form', label: 'Input Form (Entry)', icon: PlusSquare, badge: 'New' },
    { id: 'products', label: 'Price Database', icon: Boxes },
    { id: 'price-history', label: 'Price History', icon: History },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'cs-rate', label: 'CS Rate Comparison', icon: GitCompare },
    { id: 'delivery', label: 'Delivery Records', icon: Truck },
    { id: 'chalan', label: 'Challans', icon: FileCheck2 },
    { id: 'bill', label: 'Invoices & Bills', icon: Receipt },
    { id: 'activity-log', label: 'Activity Logs', icon: Activity },
    ...(isAdmin
      ? [
          { id: 'users', label: 'User Management', icon: Users, badge: 'Admin' },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 lg:static lg:h-screen lg:translate-x-0 select-none overflow-hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              Price Database
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Enterprise Central ERP
            </span>
          </div>
        </div>

        {/* Navigation list - Independent Scroll Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-1">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Central Google Sheet Connection Card */}
        <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-slate-900/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${sheetConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {sheetConnected ? 'Google Sheet Synced' : 'Local Cache Active'}
              </span>
              {isAdmin && (
                <button
                  onClick={onOpenSheetSettings}
                  title="Configure Central Google Spreadsheet"
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {sheetConnected
                ? 'Read/write permissions secured via server OAuth.'
                : 'Connect your private Google Spreadsheet to sync 9 sheets.'}
            </p>
            {isAdmin && !sheetConnected && (
              <button
                onClick={onOpenSheetSettings}
                className="mt-2.5 w-full text-center text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Connect Spreadsheet</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* User Role Footer */}
        <div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isAdmin ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {isAdmin ? <Shield className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white capitalize">
                {userRole} Account
              </div>
              <div className="text-[10px] text-slate-400">
                {isAdmin ? 'Full admin rights' : 'Authorized employee'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
