import React from 'react';
import {
  Boxes,
  FileSpreadsheet,
  Truck,
  FileCheck2,
  Receipt,
  TrendingUp,
  Activity,
  Plus,
  ArrowRight,
  Clock,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardMetrics, UserRole } from '../../types';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  userRole: UserRole;
  onNavigateTab: (tab: string) => void;
  onQuickAddProduct: () => void;
  onQuickNewQuotation: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  userRole,
  onNavigateTab,
  onQuickAddProduct,
  onQuickNewQuotation,
}) => {
  const cards = [
    {
      title: 'Total Products',
      value: metrics?.totalProducts ?? 0,
      icon: Boxes,
      color: 'from-blue-600 to-indigo-600',
      tab: 'products',
      subtext: 'Catalog items in Price Database',
    },
    {
      title: 'Total Quotations',
      value: metrics?.totalQuotations ?? 0,
      icon: FileSpreadsheet,
      color: 'from-emerald-600 to-teal-600',
      tab: 'quotations',
      subtext: 'Commercial proposals issued',
    },
    {
      title: 'Total Deliveries',
      value: metrics?.totalDeliveries ?? 0,
      icon: Truck,
      color: 'from-amber-600 to-orange-600',
      tab: 'delivery',
      subtext: 'Active & completed dispatches',
    },
    {
      title: 'Delivery Challans',
      value: metrics?.totalChallans ?? 0,
      icon: FileCheck2,
      color: 'from-purple-600 to-indigo-600',
      tab: 'chalan',
      subtext: 'Official gate pass challans',
    },
    {
      title: 'Total Invoices & Bills',
      value: metrics?.totalBills ?? 0,
      icon: Receipt,
      color: 'from-rose-600 to-pink-600',
      tab: 'bill',
      subtext: 'Customer billing records',
    },
    {
      title: 'Pending Receivables',
      value: `BDT ${(metrics?.totalReceivables ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'from-cyan-600 to-blue-700',
      tab: 'bill',
      subtext: 'Uncollected customer balance',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Action Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Central Google Sheets ERP Online</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Organization Operations Dashboard</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Live management of enterprise product pricing, customer quotation sheets, delivery challans, and price change audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onQuickAddProduct}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
          <button
            onClick={onQuickNewQuotation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition backdrop-blur cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              onClick={() => onNavigateTab(c.tab)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.title}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {c.value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${c.color} text-white shadow-md group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{c.subtext}</span>
                <span className="flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  View <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section: Recently Updated Products & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Updated Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recently Updated Products
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              Browse All
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {metrics?.recentProducts && metrics.recentProducts.length > 0 ? (
              metrics.recentProducts.map((p) => (
                <div key={p.codeNo} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {p.itemName}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {p.codeNo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Brand: {p.brandName || 'N/A'} • Size: {p.size || 'N/A'} • Updated: {p.updatedDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      BDT {p.unitPrice.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">per {p.unit}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No products found.</p>
            )}
          </div>
        </div>

        {/* Live Activity Log feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Audit & Activity Log
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('activity-log')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              Full Log
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {metrics?.recentActivities && metrics.recentActivities.length > 0 ? (
              metrics.recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {act.action}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono">
                        {act.module}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {act.details}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      By: <span className="text-slate-600 dark:text-slate-300">{act.userEmail}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {act.timestamp.split(' ')[1] || act.timestamp}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No activity logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
